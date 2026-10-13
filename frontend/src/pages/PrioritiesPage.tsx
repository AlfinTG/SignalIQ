import { useMemo, useState } from "react";
import { ListChecks } from "lucide-react";
import { PriorityBadge, StatusBadge } from "../components/Badges";
import { FilterBar } from "../components/FilterBar";
import { EvidenceModal } from "./InsightsPage";
import { useDashboardStats, useWorkspace } from "../context/WorkspaceContext";
import { downloadText, issuesToCsv, reportFromRecords } from "../lib/export";
import type { IssueGroup, IssueStatus } from "../types";

export function PrioritiesPage() {
  const {
    workspace,
    filtered,
    filters,
    setFilters,
    saveIssue,
    setIssueStatus,
  } = useWorkspace();
  const { groups, highPriority, savedCount } = useDashboardStats();
  const [selected, setSelected] = useState<IssueGroup | null>(null);
  const [scope, setScope] = useState<"all" | "saved">("all");
  const visible = useMemo(
    () =>
      scope === "saved"
        ? groups.filter((group) => workspace.issues[group.issueKey]?.saved)
        : groups,
    [groups, scope, workspace.issues],
  );

  return (
    <div className="app-page">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-citrus px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-700">
            <ListChecks className="h-3.5 w-3.5" />
            Decision queue
          </span>
          <h1 className="page-title">Priorities & Actions</h1>
          <p className="page-copy">
            Rank evidence-backed issues, save follow-ups, and update the current
            issue status.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              downloadText(
                "signaliq-issues.csv",
                issuesToCsv(groups, workspace.issues),
                "text/csv;charset=utf-8",
              )
            }
            className="secondary-button px-3 py-2 text-xs"
          >
            Export priorities CSV
          </button>
          <button
            type="button"
            onClick={() =>
              downloadText(
                "signaliq-priority-report.html",
                reportFromRecords(filtered, filters, workspace.issues),
                "text/html;charset=utf-8",
              )
            }
            className="primary-button px-3 py-2 text-xs"
          >
            Download priority report
          </button>
        </div>
      </header>
      <FilterBar
        records={workspace.feedback}
        filters={filters}
        onChange={setFilters}
      />
      <section className="grid gap-4 md:grid-cols-3">
        <QueueStat
          label="Priority issues"
          value={String(highPriority)}
          note="High score with sufficient evidence"
        />
        <QueueStat
          label="Saved follow-ups"
          value={String(savedCount)}
          note="Persisted for this workspace"
        />
        <QueueStat
          label="Issues in scope"
          value={String(groups.length)}
          note="Calculated from current filters"
        />
      </section>
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setScope("all")}
          className={`rounded-xl px-3 py-2 font-semibold ${scope === "all" ? "bg-brand-600 text-white" : "border border-line bg-surface text-ink"}`}
        >
          All priorities ({groups.length})
        </button>
        <button
          type="button"
          onClick={() => setScope("saved")}
          className={`rounded-xl px-3 py-2 font-semibold ${scope === "saved" ? "bg-brand-600 text-white" : "border border-line bg-surface text-ink"}`}
        >
          Saved follow-ups ({savedCount})
        </button>
      </div>
      <ul className="space-y-4">
        {visible.map((group) => {
          const state = workspace.issues[group.issueKey];
          return (
            <li key={group.issueKey} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-ink">
                      {group.title}
                    </h2>
                    <span className="rounded-full bg-stone px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                      {group.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {group.count} comments · {group.negativeCount} negative ·
                    Trend: {group.trendDirection}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge value={group.priorityLabel} />
                  <StatusBadge value={state?.status ?? "Open"} />
                  <span className="rounded-lg bg-stone px-2 py-1 font-mono text-xs font-bold text-ink">
                    Score {group.priorityScore.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                <p className="font-semibold text-ink">{group.recommendation}</p>
                <p className="text-ink-muted">
                  <strong className="text-brand-700">
                    Recommended action:
                  </strong>{" "}
                  {group.suggestedAction}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  className="secondary-button px-3 py-2 text-xs"
                  onClick={() => setSelected(group)}
                >
                  View evidence
                </button>
                <button
                  type="button"
                  className="secondary-button px-3 py-2 text-xs"
                  onClick={() => saveIssue(group.issueKey)}
                >
                  {state?.saved ? "Saved for follow-up" : "Save for follow-up"}
                </button>
                {(["Open", "In progress", "Resolved"] as IssueStatus[]).map(
                  (status) => (
                    <button
                      key={status}
                      type="button"
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold ${state?.status === status ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-surface text-ink"}`}
                      onClick={() => setIssueStatus(group.issueKey, status)}
                    >
                      Mark {status}
                    </button>
                  ),
                )}
              </div>
            </li>
          );
        })}
        {!visible.length ? (
          <li className="panel p-10 text-center text-sm text-ink-muted">
            No priorities match this view. Save an issue for follow-up or adjust
            the feedback filters.
          </li>
        ) : null}
      </ul>
      {selected ? (
        <EvidenceModal group={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}
function QueueStat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="panel p-4">
      <p className="metric-label">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-ink">
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-muted">{note}</p>
    </article>
  );
}
