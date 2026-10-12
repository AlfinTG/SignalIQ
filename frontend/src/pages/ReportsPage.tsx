import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FilterBar } from "../components/FilterBar";
import { useDashboardStats, useWorkspace } from "../context/WorkspaceContext";
import { feedbackToCsv } from "../lib/csv";
import { downloadText, reportFromRecords } from "../lib/export";

export function ReportsPage() {
  const { workspace, filtered, filters, setFilters } = useWorkspace();
  const { metrics, groups } = useDashboardStats();
  const dateCoverage = useMemo(() => {
    const dates = filtered.flatMap((record) => (record.date ? [record.date.slice(0, 10)] : []));
    return dates.length ? `${dates.sort()[0]} to ${dates.sort().at(-1)}` : "No dated feedback in scope";
  }, [filtered]);

  function downloadReport() {
    downloadText("signaliq-report.html", reportFromRecords(filtered, filters, workspace.issues), "text/html;charset=utf-8");
  }

  return (
    <div className="app-page">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="page-kicker">Stakeholder brief</p><h1 className="page-title">Reports</h1><p className="page-copy">Create a scoped, evidence-aware report from the feedback currently in view.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => downloadText("signaliq-feedback.csv", feedbackToCsv(filtered), "text/csv;charset=utf-8")} className="secondary-button">Download CSV</button><button type="button" onClick={downloadReport} className="primary-button">Download HTML report</button>
        </div>
      </header>

      <FilterBar records={workspace.feedback} filters={filters} onChange={setFilters} />

      <section className="grid gap-4 md:grid-cols-3">
        <ReportStat label="Feedback in scope" value={String(metrics.total)} note={`${metrics.analyzed} analyzed · ${metrics.unclassified} pending`} />
        <ReportStat label="Date coverage" value={dateCoverage} note="Based only on records with valid dates" />
        <ReportStat label="Evidence-backed issues" value={String(groups.length)} note="Grouped from the selected records" />
      </section>

      <section className="border-y border-line py-6">
        <div className="grid gap-7 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="text-lg font-semibold text-ink">Included findings</h2>
            <ol className="mt-4 space-y-3">
              {groups.slice(0, 5).map((group) => <li key={group.issueKey} className="border-l-2 border-brand-600 pl-4"><p className="font-medium text-ink">{group.title} <span className="text-sm font-normal text-ink-muted">· {group.count} comments</span></p><p className="mt-1 text-sm text-ink-muted">{group.evidenceNote}</p></li>)}
              {!groups.length ? <li className="text-sm text-ink-muted">No grouped findings are available for this scope. Import or analyze feedback first.</li> : null}
            </ol>
          </div>
          <aside className="panel-muted p-5">
            <h2 className="font-semibold text-ink">Scope and limitations</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-muted">
              <li>Priority is a transparent 40/30/20/10 heuristic, not a business-impact prediction.</li>
              <li>{workspace.isSampleWorkspace ? "This report includes synthetic demonstration data." : "This report uses the current browser/project dataset."}</li>
              <li>Records marked Demo analysis are deterministic rules, not Gemini output.</li>
            </ul>
            <Link to="/insights" className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:text-brand-600">Inspect supporting evidence →</Link>
          </aside>
        </div>
      </section>
    </div>
  );
}

function ReportStat({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="border-b border-line pb-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}</p><p className="mt-2 break-words text-xl font-semibold text-ink">{value}</p><p className="mt-1 text-xs leading-5 text-ink-muted">{note}</p></article>;
}
