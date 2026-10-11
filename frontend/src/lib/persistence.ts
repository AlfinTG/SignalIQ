import { createSampleFeedback } from "./sampleData";
import type { FeedbackRecord, IssueState, Workspace } from "../types";

export const STORAGE_KEY = "signaliq.workspace.v1";

const SENTIMENTS = new Set(["positive", "neutral", "negative", "unclassified"]);
const SEVERITIES = new Set(["low", "medium", "high", "unknown"]);
const MODES = new Set(["live-ai", "demo-rules", "unclassified"]);
const STATUSES = new Set(["Open", "In progress", "Resolved"]);

export function emptyWorkspace(): Workspace {
  return {
    version: 1,
    feedback: createSampleFeedback(),
    issues: {},
    isSampleWorkspace: true,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseFeedback(value: unknown): FeedbackRecord | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.text !== "string") return null;
  const sentiment = SENTIMENTS.has(String(value.sentiment)) ? (value.sentiment as FeedbackRecord["sentiment"]) : "unclassified";
  const severity = SEVERITIES.has(String(value.severity)) ? (value.severity as FeedbackRecord["severity"]) : "unknown";
  const analysisMode = MODES.has(String(value.analysisMode)) ? (value.analysisMode as FeedbackRecord["analysisMode"]) : "unclassified";
  return {
    id: value.id,
    text: value.text,
    source: typeof value.source === "string" ? value.source : "imported",
    date: typeof value.date === "string" || value.date === null ? (value.date as string | null) : null,
    rating: typeof value.rating === "number" ? value.rating : null,
    sentiment,
    category: typeof value.category === "string" ? value.category : "Uncategorized",
    issueKey: typeof value.issueKey === "string" ? value.issueKey : "unclassified",
    severity,
    confidence: typeof value.confidence === "number" ? value.confidence : null,
    analysisReason: typeof value.analysisReason === "string" ? value.analysisReason : "",
    suggestedAction: typeof value.suggestedAction === "string" ? value.suggestedAction : null,
    analysisMode,
    analyzedAt: typeof value.analyzedAt === "string" || value.analyzedAt === null ? (value.analyzedAt as string | null) : null,
    isSample: Boolean(value.isSample),
  };
}

export function parseWorkspace(raw: string | null): { workspace: Workspace; recovered: boolean } {
  if (!raw) {
    return { workspace: emptyWorkspace(), recovered: false };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.feedback)) {
      return { workspace: emptyWorkspace(), recovered: true };
    }
    const feedback = parsed.feedback.map(parseFeedback).filter((row): row is FeedbackRecord => row !== null);
    const issues: Record<string, IssueState> = {};
    if (isRecord(parsed.issues)) {
      for (const [key, value] of Object.entries(parsed.issues)) {
        if (!isRecord(value)) continue;
        if (!STATUSES.has(String(value.status))) continue;
        issues[key] = {
          issueKey: key,
          status: value.status as IssueState["status"],
          saved: Boolean(value.saved),
          updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
        };
      }
    }
    return {
      workspace: {
        version: 1,
        feedback,
        issues,
        isSampleWorkspace: parsed.isSampleWorkspace === true && feedback.length > 0 && feedback.every((row) => row.isSample),
      },
      recovered: false,
    };
  } catch {
    return { workspace: emptyWorkspace(), recovered: true };
  }
}

export function loadWorkspace(): { workspace: Workspace; recovered: boolean; storageError: string | null } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return { ...parseWorkspace(raw), storageError: null };
  } catch {
    return { workspace: emptyWorkspace(), recovered: true, storageError: "Browser storage is unavailable. Changes will not persist after refresh." };
  }
}

export function saveWorkspace(workspace: Workspace): string | null {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    return null;
  } catch {
    return "Could not save to browser storage. The workspace may be full or blocked.";
  }
}
