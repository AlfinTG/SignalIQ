import { useMemo, useState } from "react";
import { ModeBadge, PriorityBadge, SentimentBadge, StatusBadge } from "../components/Badges";
import { FilterBar } from "../components/FilterBar";
import { Modal } from "../components/Modal";
import { useDashboardStats, useWorkspace } from "../context/WorkspaceContext";
import { feedbackToCsv } from "../lib/csv";
import { downloadText, issuesToCsv, reportFromRecords } from "../lib/export";
import type { IssueGroup, IssueStatus } from "../types";
import { ClipboardList, Plus, Sparkles } from "lucide-react";

export function InsightsPage() {
  const { workspace, filtered, filters, setFilters, saveIssue, setIssueStatus, addAction, actions } =
    useWorkspace();
  const { groups } = useDashboardStats();
  const [selected, setSelected] = useState<IssueGroup | null>(null);
  const [actionTargetGroup, setActionTargetGroup] = useState<IssueGroup | null>(null);
  const [actionTitle, setActionTitle] = useState("");
  const [actionFix, setActionFix] = useState("");
  const [actionAssignee, setActionAssignee] = useState("");
  const [actionDueDate, setActionDueDate] = useState("");
  const [actionNotes, setActionNotes] = useState("");
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

  function openActionModal(group: IssueGroup) {
    setActionTargetGroup(group);
    setActionTitle(`Fix: ${group.title}`);
    setActionFix(group.suggestedAction || "");
    setActionAssignee("");
    setActionDueDate("");
    setActionNotes(`Identified from ${group.count} customer comments (${group.negativeCount} negative).`);
  }

  async function handleSaveAction() {
    if (!actionTargetGroup || !actionTitle.trim()) return;
    await addAction({
      issue_key: actionTargetGroup.issueKey,
      title: actionTitle.trim(),
      proposed_fix: actionFix.trim(),
      assignee: actionAssignee.trim() || undefined,
      due_date: actionDueDate.trim() || undefined,
      notes: actionNotes.trim() || undefined,
    });
    setActionTargetGroup(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
              <Sparkles className="h-3.5 w-3.5" />
              Prioritized Intelligence
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Insights & Action Management</h1>
          <p className="mt-1 max-w-3xl text-xs text-ink-muted">
            Recurring problems ranked with a documented 40/30/20/10 priority formula. Turn high-impact findings into trackable engineering action items.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportFeedback}
            className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-medium text-ink shadow-sm hover:bg-slate-50"
          >
            Export Filtered CSV
          </button>
          <button
            type="button"
            onClick={exportIssues}
            className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-medium text-ink shadow-sm hover:bg-slate-50"
          >
            Export Issues CSV
          </button>
          <button
            type="button"
            onClick={exportReport}
            className="rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
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
            statusFilter === "all" ? "bg-slate-900 text-white" : "border border-line bg-white text-ink hover:bg-slate-50"
          }`}
          onClick={() => setStatusFilter("all")}
        >
          All issues ({groups.length})
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 font-medium transition ${
            statusFilter === "saved" ? "bg-slate-900 text-white" : "border border-line bg-white text-ink hover:bg-slate-50"
          }`}
          onClick={() => setStatusFilter("saved")}
        >
          Saved for follow-up ({groups.filter((g) => workspace.issues[g.issueKey]?.saved).length})
        </button>
      </div>

      <ul className="space-y-4">
        {visible.map((group) => {
          const state = workspace.issues[group.issueKey];
          const linkedActions = actions.filter((a) => a.issue_key === group.issueKey);

          return (
            <li key={group.issueKey} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
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

              {/* Linked Action items badges */}
              {linkedActions.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2 text-xs">
                  <ClipboardList className="h-3.5 w-3.5 text-brand-600" />
                  <span className="font-semibold text-slate-700">Actions ({linkedActions.length}):</span>
                  {linkedActions.map((act) => (
                    <span
                      key={act.id}
                      className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[11px] font-medium border border-slate-200"
                    >
                      {act.title}
                      <span className="text-[10px] text-slate-400">({act.status})</span>
                    </span>
                  ))}
                </div>
              ) : null}

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
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                  onClick={() => openActionModal(group)}
                >
                  <Plus className="h-3 w-3" />
                  Create Action Item
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

      {/* Action Item Creation Modal */}
      {actionTargetGroup ? (
        <Modal title={`Create Action: ${actionTargetGroup.title}`} onClose={() => setActionTargetGroup(null)}>
          <div className="space-y-4 text-xs font-sans">
            <div>
              <label className="block font-semibold text-slate-700">Action Title</label>
              <input
                type="text"
                value={actionTitle}
                onChange={(e) => setActionTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-xs text-ink"
                placeholder="e.g., Fix gateway retry duplicate charge"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700">Proposed Engineering Fix</label>
              <textarea
                rows={3}
                value={actionFix}
                onChange={(e) => setActionFix(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-xs text-ink"
                placeholder="Describe the solution or PR details..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700">Assignee</label>
                <input
                  type="text"
                  value={actionAssignee}
                  onChange={(e) => setActionAssignee(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-xs text-ink"
                  placeholder="e.g. Alex (Backend Lead)"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Due Date</label>
                <input
                  type="date"
                  value={actionDueDate}
                  onChange={(e) => setActionDueDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-xs text-ink"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700">Internal Notes</label>
              <input
                type="text"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-xs text-ink"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionTargetGroup(null)}
                className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAction}
                className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
              >
                Save Action Item
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

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
