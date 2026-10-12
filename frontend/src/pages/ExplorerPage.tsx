import { useMemo, useState, type FormEvent } from "react";
import { ModeBadge, SentimentBadge, SeverityBadge } from "../components/Badges";
import { FilterBar } from "../components/FilterBar";
import { Modal } from "../components/Modal";
import { useWorkspace } from "../context/WorkspaceContext";
import { recordsFromCsv } from "../lib/csv";
import type { FeedbackRecord } from "../types";

const PAGE_SIZE = 12;

export function ExplorerPage() {
  const { workspace, filtered, filters, setFilters, addFeedback, importRecords, analyzeRecords, analyzeProgress } =
    useWorkspace();
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<"date" | "sentiment" | "category">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<FeedbackRecord | null>(null);
  const [csvMessage, setCsvMessage] = useState<string | null>(null);
  const [mappingHeaders, setMappingHeaders] = useState<string[] | null>(null);
  const [pendingCsv, setPendingCsv] = useState<string | null>(null);
  const [form, setForm] = useState({ text: "", source: "manual", date: "", rating: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "date") return dir * (a.date ?? "").localeCompare(b.date ?? "");
      if (sortKey === "sentiment") return dir * a.sentiment.localeCompare(b.sentiment);
      return dir * a.category.localeCompare(b.category);
    });
    return copy;
  }, [filtered, sortDir, sortKey]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const rows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir((value) => (value === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function submitManual(event: FormEvent) {
    event.preventDefault();
    if (form.text.trim().length < 8) {
      setFormError("Enter at least 8 characters of feedback.");
      return;
    }
    const rating = form.rating === "" ? null : Number(form.rating);
    if (form.rating !== "" && (!Number.isFinite(rating) || (rating ?? 0) < 0 || (rating ?? 0) > 5)) {
      setFormError("Rating must be a number from 0 to 5.");
      return;
    }
    const created = addFeedback({ text: form.text, source: form.source, date: form.date, rating });
    setForm({ text: "", source: "manual", date: "", rating: "" });
    setFormError(null);
    setSelected(created);
  }

  async function onFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsvMessage("Only .csv files are supported.");
      return;
    }
    if (file.size > 1_500_000) {
      setCsvMessage("File is too large (limit about 1.5MB).");
      return;
    }
    const text = await file.text();
    const parsed = recordsFromCsv(text);
    if (parsed.needsMapping) {
      setPendingCsv(text);
      setMappingHeaders(parsed.headers);
      setCsvMessage("Select which column contains the feedback text.");
      return;
    }
    finishImport(parsed);
  }

  function finishImport(parsed: ReturnType<typeof recordsFromCsv>) {
    if (parsed.accepted) {
      importRecords(parsed.records, true);
    }
    const rejected = parsed.rejected
      .slice(0, 8)
      .map((row) => `Row ${row.row}: ${row.reason}`)
      .join(" ");
    setCsvMessage(
      `Accepted ${parsed.accepted}. Rejected ${parsed.rejected.length}. Empty rows skipped: ${parsed.skippedEmpty}.${rejected ? ` ${rejected}` : ""}`,
    );
    setMappingHeaders(null);
    setPendingCsv(null);
  }

  const unclassified = workspace.feedback.filter((record) => record.analysisMode === "unclassified").length;

  return (
    <div className="app-page">
      <div>
        <p className="page-kicker">Feedback library</p><h1 className="page-title">Feedback Explorer</h1>
        <p className="page-copy">
          Search, filter, inspect, and analyze comments. Supported CSV columns: text/feedback/comment/review/message/content/description,
          plus optional date, source, and rating.
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={submitManual} className="panel space-y-3 p-5">
          <h2 className="text-sm font-semibold">Add a comment</h2>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-muted">Feedback text</span>
            <textarea
              value={form.text}
              onChange={(event) => setForm({ ...form, text: event.target.value })}
              rows={4}
              className="field"
              required
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="block text-sm">
              <span className="mb-1 block text-ink-muted">Source</span>
              <select
                value={form.source}
                onChange={(event) => setForm({ ...form, source: event.target.value })}
                className="field"
              >
                <option value="manual">manual</option>
                <option value="review">review</option>
                <option value="survey">survey</option>
                <option value="support">support</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-ink-muted">Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
                className="field"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-ink-muted">Rating 0–5</span>
              <input
                value={form.rating}
                onChange={(event) => setForm({ ...form, rating: event.target.value })}
                className="field"
                inputMode="decimal"
              />
            </label>
          </div>
          {formError ? <p className="text-sm text-rose-700">{formError}</p> : null}
          <button type="submit" className="primary-button">
            Save comment
          </button>
        </form>

        <div className="panel space-y-3 p-5">
          <h2 className="text-sm font-semibold">Import CSV</h2>
          <p className="text-sm text-ink-muted">Maximum 2,000 rows. Malformed rows are rejected with reasons; the app will not crash.</p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
          {mappingHeaders && pendingCsv ? (
            <label className="block text-sm">
              <span className="mb-1 block text-ink-muted">Text column</span>
              <select
                className="w-full rounded-lg border border-line px-3 py-2"
                defaultValue=""
                onChange={(event) => {
                  if (!event.target.value) return;
                  finishImport(recordsFromCsv(pendingCsv, { textColumn: event.target.value }));
                }}
              >
                <option value="" disabled>
                  Choose a column
                </option>
                {mappingHeaders.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {csvMessage ? <p className="text-sm text-ink">{csvMessage}</p> : null}
          <a className="inline-block text-sm text-brand-700" href="/sample-feedback.csv" download>
            Download a sample CSV template
          </a>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={analyzeProgress.active}
          onClick={() => void analyzeRecords(undefined, true)}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Analyze unclassified with live AI ({unclassified})
        </button>
        <button
          type="button"
          disabled={analyzeProgress.active}
          onClick={() => void analyzeRecords(undefined, false)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          Run labelled demo analysis
        </button>
      </div>

      <FilterBar
        records={workspace.feedback}
        filters={filters}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
      />

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-ink-muted">
            <tr>
              <th className="px-3 py-2">
                <button type="button" onClick={() => toggleSort("date")}>
                  Date
                </button>
              </th>
              <th className="px-3 py-2">Feedback</th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => toggleSort("sentiment")}>
                  Sentiment
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => toggleSort("category")}>
                  Category
                </button>
              </th>
              <th className="px-3 py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((record) => (
              <tr key={record.id} className="border-t border-line">
                <td className="whitespace-nowrap px-3 py-2 text-ink-muted">{record.date?.slice(0, 10) ?? "—"}</td>
                <td className="max-w-xl px-3 py-2">
                  <button type="button" className="text-left hover:text-brand-700" onClick={() => setSelected(record)}>
                    {record.text.length > 160 ? `${record.text.slice(0, 160)}…` : record.text}
                  </button>
                  {record.isSample ? <span className="ml-2 text-xs text-amber-800">sample</span> : null}
                </td>
                <td className="px-3 py-2">
                  <SentimentBadge value={record.sentiment} />
                </td>
                <td className="px-3 py-2">{record.category}</td>
                <td className="px-3 py-2">{record.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-3 py-8 text-center text-sm text-ink-muted">No comments match the current filters.</p> : null}
      </div>
      <div className="flex items-center justify-between text-sm">
        <p className="text-ink-muted">
          {filtered.length} matching · page {page} of {pages}
        </p>
        <div className="flex gap-2">
          <button type="button" className="rounded border border-line px-2 py-1" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            Previous
          </button>
          <button type="button" className="rounded border border-line px-2 py-1" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>
            Next
          </button>
        </div>
      </div>

      {selected ? (
        <Modal title="Feedback detail" onClose={() => setSelected(null)}>
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <SentimentBadge value={selected.sentiment} />
              <SeverityBadge value={selected.severity} />
              <ModeBadge value={selected.analysisMode} />
            </div>
            <p className="whitespace-pre-wrap text-ink">{selected.text}</p>
            <dl className="grid grid-cols-2 gap-2 text-ink-muted">
              <div>
                <dt>Date</dt>
                <dd>{selected.date ?? "—"}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{selected.source}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{selected.category}</dd>
              </div>
              <div>
                <dt>Issue</dt>
                <dd>{selected.issueKey}</dd>
              </div>
              <div>
                <dt>Confidence</dt>
                <dd>{selected.confidence === null ? "—" : selected.confidence.toFixed(2)}</dd>
              </div>
              <div>
                <dt>Rating</dt>
                <dd>{selected.rating ?? "—"}</dd>
              </div>
            </dl>
            {selected.analysisReason ? <p>{selected.analysisReason}</p> : null}
            {selected.suggestedAction ? <p>Suggested action: {selected.suggestedAction}</p> : null}
            <button
              type="button"
              className="rounded-lg bg-brand-600 px-3 py-2 text-white"
              onClick={() => void analyzeRecords([selected.id], true)}
            >
              Analyze this comment with live AI
            </button>
            <button
              type="button"
              className="ml-2 rounded-lg border border-line px-3 py-2"
              onClick={() => void analyzeRecords([selected.id], false)}
            >
              Demo analysis
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
