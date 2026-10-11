import { createId } from "./ids";
import type { CsvParseResult, FeedbackRecord } from "../types";

const TEXT_ALIASES = ["text", "feedback", "comment", "review", "message", "content", "description"];
const DATE_ALIASES = ["date", "created_at", "createdat", "timestamp", "submitted_at"];
const SOURCE_ALIASES = ["source", "channel", "platform"];
const RATING_ALIASES = ["rating", "stars", "score"];

const MAX_FILE_CHARS = 1_500_000;
const MAX_ROWS = 2000;
const MAX_TEXT = 4000;

export function parseCsvText(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((candidate) => candidate.some((value) => value.trim() !== ""));
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function findAlias(headers: string[], aliases: string[]): string | null {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const index = normalized.indexOf(alias);
    if (index >= 0) {
      return headers[index] ?? null;
    }
  }
  return null;
}

function parseDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function parseRating(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  if (!Number.isFinite(number) || number < 0 || number > 5) return null;
  return number;
}

export function detectTextColumns(headers: string[]): { chosen: string | null; ambiguous: string[] } {
  const matches = headers.filter((header) => TEXT_ALIASES.includes(normalizeHeader(header)));
  if (matches.length === 1) {
    return { chosen: matches[0] ?? null, ambiguous: [] };
  }
  if (matches.length > 1) {
    return { chosen: null, ambiguous: matches };
  }
  return { chosen: null, ambiguous: headers };
}

export function recordsFromCsv(
  raw: string,
  options?: { textColumn?: string },
): CsvParseResult {
  if (raw.length > MAX_FILE_CHARS) {
    return {
      records: [],
      accepted: 0,
      rejected: [{ row: 0, reason: "File is too large. Limit is about 1.5MB of text." }],
      skippedEmpty: 0,
      textColumn: "",
      ambiguousTextColumns: [],
      needsMapping: false,
      headers: [],
    };
  }

  const rows = parseCsvText(raw);
  if (rows.length < 2) {
    return {
      records: [],
      accepted: 0,
      rejected: [{ row: 0, reason: "CSV needs a header row and at least one data row." }],
      skippedEmpty: 0,
      textColumn: "",
      ambiguousTextColumns: [],
      needsMapping: false,
      headers: rows[0] ?? [],
    };
  }

  const headers = (rows[0] ?? []).map((header) => header.trim());
  if (headers.some((header) => header === "") || new Set(headers.map(normalizeHeader)).size !== headers.length) {
    return {
      records: [],
      accepted: 0,
      rejected: [{ row: 1, reason: "Header row has blank or duplicate column names." }],
      skippedEmpty: 0,
      textColumn: "",
      ambiguousTextColumns: [],
      needsMapping: false,
      headers,
    };
  }

  const detected = detectTextColumns(headers);
  const textColumn = options?.textColumn ?? detected.chosen;
  if (!textColumn) {
    return {
      records: [],
      accepted: 0,
      rejected: [],
      skippedEmpty: 0,
      textColumn: "",
      ambiguousTextColumns: detected.ambiguous,
      needsMapping: true,
      headers,
    };
  }

  const dateColumn = findAlias(headers, DATE_ALIASES);
  const sourceColumn = findAlias(headers, SOURCE_ALIASES);
  const ratingColumn = findAlias(headers, RATING_ALIASES);
  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  const textIndex = headerIndex.get(textColumn) ?? -1;

  const records: FeedbackRecord[] = [];
  const rejected: Array<{ row: number; reason: string }> = [];
  let skippedEmpty = 0;
  const dataRows = rows.slice(1, MAX_ROWS + 1);
  const overflow = rows.length - 1 - dataRows.length;

  dataRows.forEach((row, offset) => {
    const line = offset + 2;
    const text = (row[textIndex] ?? "").trim();
    if (!text) {
      skippedEmpty += 1;
      return;
    }
    if (text.length > MAX_TEXT) {
      rejected.push({ row: line, reason: `Feedback text exceeds ${MAX_TEXT} characters.` });
      return;
    }
    const dateRaw = dateColumn ? (row[headerIndex.get(dateColumn) ?? -1] ?? "").trim() : "";
    const date = dateRaw ? parseDate(dateRaw) : null;
    if (dateRaw && !date) {
      rejected.push({ row: line, reason: `Invalid date "${dateRaw}".` });
      return;
    }
    const ratingRaw = ratingColumn ? (row[headerIndex.get(ratingColumn) ?? -1] ?? "").trim() : "";
    const rating = ratingRaw ? parseRating(ratingRaw) : null;
    if (ratingRaw && rating === null) {
      rejected.push({ row: line, reason: `Invalid rating "${ratingRaw}". Use a number from 0 to 5.` });
      return;
    }
    const source = sourceColumn ? (row[headerIndex.get(sourceColumn) ?? -1] ?? "").trim() : "imported";
    records.push({
      id: createId("imp"),
      text,
      source: source || "imported",
      date,
      rating,
      sentiment: "unclassified",
      category: "Uncategorized",
      issueKey: "unclassified",
      severity: "unknown",
      confidence: null,
      analysisReason: "",
      suggestedAction: null,
      analysisMode: "unclassified",
      analyzedAt: null,
      isSample: false,
    });
  });

  if (overflow > 0) {
    rejected.push({ row: MAX_ROWS + 2, reason: `Only the first ${MAX_ROWS} data rows were read. ${overflow} extra row(s) skipped.` });
  }

  return {
    records,
    accepted: records.length,
    rejected,
    skippedEmpty,
    textColumn,
    ambiguousTextColumns: [],
    needsMapping: false,
    headers,
  };
}

export function csvEscape(value: string): string {
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\n]/.test(guarded)) {
    return `"${guarded.replaceAll('"', '""')}"`;
  }
  return guarded;
}

export function feedbackToCsv(records: FeedbackRecord[]): string {
  const headers = [
    "id",
    "date",
    "source",
    "rating",
    "sentiment",
    "category",
    "issueKey",
    "severity",
    "analysisMode",
    "text",
    "analysisReason",
  ];
  const lines = [headers.join(",")];
  for (const record of records) {
    lines.push(
      [
        csvEscape(record.id),
        csvEscape(record.date ?? ""),
        csvEscape(record.source),
        csvEscape(record.rating === null ? "" : String(record.rating)),
        csvEscape(record.sentiment),
        csvEscape(record.category),
        csvEscape(record.issueKey),
        csvEscape(record.severity),
        csvEscape(record.analysisMode),
        csvEscape(record.text),
        csvEscape(record.analysisReason),
      ].join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}
