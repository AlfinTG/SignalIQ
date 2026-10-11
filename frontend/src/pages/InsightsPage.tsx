import { useMemo, useState } from "react";
import { ModeBadge, PriorityBadge, SentimentBadge, StatusBadge } from "../components/Badges";
import { FilterBar } from "../components/FilterBar";
import { Modal } from "../components/Modal";
import { useDashboardStats, useWorkspace } from "../context/WorkspaceContext";
import { feedbackToCsv } from "../lib/csv";
import { downloadText, issuesToCsv, reportFromRecords } from "../lib/export";
import type { IssueGroup, IssueStatus } from "../types";

export function InsightsPage() {
  const { workspace, filtered, filters, setFilters, saveIssue, setIssueStatus } = useWorkspace();
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
    downloadText("signaliq-insight-report.html", reportFromRecords(filtered, filters, workspace.issues), "text/html;charset=utf-8");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Insights & Actions</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-muted">
            Recurring problems ranked with a documented formula. Facts (counts, rates, dates) are calculated in code.
            Suggested actions may come from live AI or demo rules and are labelled on supporting comments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportFeedback} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
            Export filtered CSV
          </button>
          <button type="button" onClick={exportIssues} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
            Export issues CSV
          </button>
          <button type="button" onClick={exportReport} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white">
            Download HTML report
          </button>
        </div>
      </div>

      <FilterBar records={workspace.feedback} filters={filters} onChange={setFilters} />

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          className={`rounded-lg px-3 py-1 ${statusFilter === "all" ? "bg-navy-950 text-white" : "border border-line bg-white"}`}
          onClick={() => setStatusFilter("all")}
        >
          All issues
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1 ${statusFilter === "saved" ? "bg-navy-950 text-white" : "border border-line bg-white"}`}
          onClick={() => setStatusFilter("saved")}
        >
          Saved in this browser
        </button>
      </div>

      <ul className="space-y-3">
        {visible.map((group) => {
          const state = workspace.issues[group.issueKey];
          return (
            <li key={group.issueKey} className="rounded-xl border border-line bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-ink">{group.title}</h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    {group.category} · {group.count} comments · {group.negativeCount} negative ({group.negativeRate.toFixed(0)}%)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge value={group.priorityLabel} />
                  <StatusBadge value={state?.status ?? "Open"} />
                  <span className="text-sm tabular-nums text-ink-muted">Score {group.priorityScore.toFixed(1)}</span>
                </div>
              </div>
              <p className="mt-3 text-sm">{group.recommendation}</p>
              <p className="mt-1 text-sm text-ink-muted">{group.evidenceNote}</p>
              <p className="mt-2 text-sm">
                <span className="font-medium">Next action: </span>
                {group.suggestedAction}
              </p>
              <p className="mt-2 text-xs text-ink-muted">
                Inputs: frequency {group.frequencyScore.toFixed(0)}, negative {group.negativeScore.toFixed(0)}, trend{" "}
                {group.trendScore === null ? "unavailable" : `${group.trendDirection} ${group.trendScore.toFixed(0)}`},
                severity {group.severityScore.toFixed(0)}. {group.trendNote}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="rounded-lg border border-line px-3 py-1.5 text-sm" onClick={() => setSelected(group)}>
                  View evidence
                </button>
                <button type="button" className="rounded-lg border border-line px-3 py-1.5 text-sm" onClick={() => saveIssue(group.issueKey)}>
                  {state?.saved ? "Saved" : "Save for follow-up"}
                </button>
                {(["Open", "In progress", "Resolved"] as IssueStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    className="rounded-lg border border-line px-3 py-1.5 text-sm"
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
      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-ink-muted">
          No grouped issues in this view. Analyze comments first, or load the sample dataset.
        </p>
      ) : null}

      {selected ? (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <div className="space-y-3 text-sm">
            <p>
              {selected.count} supporting comments. Status {workspace.issues[selected.issueKey]?.status ?? "Open"}. Saved status lives
              in this browser only.
            </p>
            <ul className="space-y-3">
              {selected.records.slice(0, 12).map((record) => (
                <li key={record.id} className="rounded-lg border border-line p-3">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <SentimentBadge value={record.sentiment} />
                    <ModeBadge value={record.analysisMode} />
                    <span className="text-xs text-ink-muted">{record.date?.slice(0, 10) ?? "undated"}</span>
                  </div>
                  <p>{record.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
