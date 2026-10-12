import { useMemo, useState } from "react";
import { ModeBadge, PriorityBadge, SentimentBadge, StatusBadge } from "../components/Badges";
import { FilterBar } from "../components/FilterBar";
import { Modal } from "../components/Modal";
import { useDashboardStats, useWorkspace } from "../context/WorkspaceContext";
import { feedbackToCsv } from "../lib/csv";
import { downloadText, issuesToCsv, reportFromRecords } from "../lib/export";
import type { IssueGroup, IssueStatus } from "../types";
import { Sparkles } from "lucide-react";

export function InsightsPage() {
  const { workspace, filtered, filters, setFilters, saveIssue, setIssueStatus } =
    useWorkspace();
  const { groups } = useDashboardStats();
  const [selected, setSelected] = useState<IssueGroup | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "saved">("all");

  const visible = useMemo(() => {
    if (statusFilter !== "saved") return groups;
    return groups.filter((group) => workspace.issues[group.issueKey]?.saved);
  }, [groups, statusFilter, workspace.issues]);

  function exportFeedback() {
    downloadText("signaliq-feedback.csv", feedbackToCsv(filtered), "text/csv;charset=utf-8");
  }

  function exportIssues() {
    downloadText("signaliq-issues.csv", issuesToCsv(groups, workspace.issues), "text/csv;charset=utf-8");
  }

  function exportReport() {
    downloadText(
      "signaliq-insight-report.html",
      reportFromRecords(filtered, filters, workspace.issues),
      "text/html;charset=utf-8",
    );
  }

  return (
    <div className="app-page">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-citrus px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-700">
              <Sparkles className="h-3.5 w-3.5" />
              Prioritized Intelligence
            </span>
          </div>
          <h1 className="page-title">Insights & Action Management</h1>
          <p className="page-copy">
            Recurring problems ranked with a documented 40/30/20/10 priority formula. Turn high-impact findings into trackable engineering action items.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportFeedback}
            className="secondary-button px-3 py-2 text-xs"
          >
            Export Filtered CSV
          </button>
          <button
            type="button"
            onClick={exportIssues}
            className="secondary-button px-3 py-2 text-xs"
          >
            Export Issues CSV
          </button>
          <button
            type="button"
            onClick={exportReport}
            className="primary-button px-3.5 py-2 text-xs"
          >
            Download HTML Report
          </button>
        </div>
      </div>

      <FilterBar records={workspace.feedback} filters={filters} onChange={setFilters} />

      <div className="flex gap-2 text-xs">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 font-medium transition ${
            statusFilter === "all" ? "bg-brand-600 text-white" : "border border-line bg-surface text-ink hover:bg-[#ECE8DE]"
          }`}
          onClick={() => setStatusFilter("all")}
        >
          All issues ({groups.length})
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 font-medium transition ${
            statusFilter === "saved" ? "bg-brand-600 text-white" : "border border-line bg-surface text-ink hover:bg-[#ECE8DE]"
          }`}
          onClick={() => setStatusFilter("saved")}
        >
          Saved for follow-up ({groups.filter((g) => workspace.issues[g.issueKey]?.saved).length})
        </button>
      </div>

      <ul className="space-y-4">
        {visible.map((group) => {
          const state = workspace.issues[group.issueKey];
          return (
            <li key={group.issueKey} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/60 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-ink">{group.title}</h2>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {group.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {group.count} comments · {group.negativeCount} negative ({group.negativeRate.toFixed(0)}%)
                    {group.trendScore !== null ? ` · Trend: ${group.trendDirection}` : " · Trend: insufficient"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge value={group.priorityLabel} />
                  <StatusBadge value={state?.status ?? "Open"} />
                  <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-ink">
                    Score {group.priorityScore.toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-xs">
                <p className="font-semibold text-slate-800">{group.recommendation}</p>
                <p className="text-slate-500">{group.evidenceNote}</p>
                <p className="text-brand-700 font-medium">
                  <strong>Recommended Next Action:</strong> {group.suggestedAction}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
                <button
                  type="button"
                  className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setSelected(group)}
                >
                  View Supporting Evidence
                </button>

                <button
                  type="button"
                  className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => saveIssue(group.issueKey)}
                >
                  {state?.saved ? "Saved ★" : "Save for Follow-up"}
                </button>

                {(["Open", "In progress", "Resolved"] as IssueStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    onClick={() => setIssueStatus(group.issueKey, status)}
                  >
                    Mark {status}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>


      {/* Evidence Inspection Modal */}
      {selected ? (
        <Modal title={`Evidence: ${selected.title}`} onClose={() => setSelected(null)}>
          <div className="space-y-4 text-xs font-sans">
            <div className="rounded-lg bg-slate-50 p-3 text-slate-600">
              <p>
                <strong>Category:</strong> {selected.category} · <strong>Supporting Comments:</strong> {selected.count} (
                {selected.negativeCount} negative)
              </p>
              <p className="mt-1 font-mono text-[11px] text-slate-500">
                Formula inputs: Frequency score {selected.frequencyScore.toFixed(0)}, Negative score{" "}
                {selected.negativeScore.toFixed(0)}, Trend score {selected.trendScore?.toFixed(0) ?? "n/a"}, Severity{" "}
                {selected.severityScore.toFixed(0)}.
              </p>
            </div>

            <ul className="max-h-96 space-y-2.5 overflow-y-auto">
              {selected.records.map((record) => (
                <li key={record.id} className="rounded-xl border border-line p-3 text-xs">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <SentimentBadge value={record.sentiment} />
                    <ModeBadge value={record.analysisMode} />
                    <span className="text-[11px] text-ink-muted">{record.date?.slice(0, 10) ?? "undated"}</span>
                    <span className="rounded bg-slate-100 px-1 text-[10px] uppercase font-bold text-slate-600">
                      {record.source}
                    </span>
                  </div>
                  <p className="text-slate-800 leading-relaxed">“{record.text}”</p>
                </li>
              ))}
            </ul>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
