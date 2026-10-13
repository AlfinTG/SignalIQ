import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Sparkles } from "lucide-react";
import { ModeBadge, SentimentBadge } from "../components/Badges";
import { FilterBar } from "../components/FilterBar";
import { Modal } from "../components/Modal";
import { useDashboardStats, useWorkspace } from "../context/WorkspaceContext";
import { feedbackToCsv } from "../lib/csv";
import { downloadText, reportFromRecords } from "../lib/export";
import { issueFrequency, sentimentTrend } from "../lib/metrics";
import type { IssueGroup } from "../types";

export function InsightsPage() {
  const { workspace, filtered, filters, setFilters } = useWorkspace();
  const { groups, metrics } = useDashboardStats();
  const [selected, setSelected] = useState<IssueGroup | null>(null);
  const topics = useMemo(
    () =>
      issueFrequency(filtered)
        .slice(0, 6)
        .map((row) => ({ ...row, label: row.issueKey.replaceAll("-", " ") })),
    [filtered],
  );
  const trend = useMemo(() => sentimentTrend(filtered), [filtered]);

  return (
    <div className="app-page">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-citrus px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-700">
            <Sparkles className="h-3.5 w-3.5" />
            Pattern discovery
          </span>
          <h1 className="page-title">Insights</h1>
          <p className="page-copy">
            Understand recurring feedback patterns through their evidence,
            sentiment, frequency, and observed trend direction.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              downloadText(
                "signaliq-feedback.csv",
                feedbackToCsv(filtered),
                "text/csv;charset=utf-8",
              )
            }
            className="secondary-button px-3 py-2 text-xs"
          >
            Export filtered CSV
          </button>
          <button
            type="button"
            onClick={() =>
              downloadText(
                "signaliq-insight-report.html",
                reportFromRecords(filtered, filters, workspace.issues),
                "text/html;charset=utf-8",
              )
            }
            className="primary-button px-3 py-2 text-xs"
          >
            Download insight report
          </button>
        </div>
      </header>

      <FilterBar
        records={workspace.feedback}
        filters={filters}
        onChange={setFilters}
      />
      <section className="grid gap-4 md:grid-cols-3">
        <InsightStat
          label="Patterns discovered"
          value={String(groups.length)}
          note="Grouped from the current feedback scope"
        />
        <InsightStat
          label="Analyzed feedback"
          value={String(metrics.analyzed)}
          note={`${metrics.unclassified} awaiting analysis`}
        />
        <InsightStat
          label="Negative feedback"
          value={String(metrics.negative)}
          note={
            metrics.negativeShare === null
              ? "No analyzed feedback yet"
              : `${metrics.negativeShare.toFixed(1)}% of analyzed feedback`
          }
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <article className="panel p-5 xl:col-span-7">
          <h2 className="text-base font-semibold text-ink">
            Feedback pattern over time
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Only dated feedback in the current scope is shown.
          </p>
          {trend.length < 2 ? (
            <p className="grid h-56 place-items-center text-sm text-ink-muted">
              Add dated feedback to reveal a trend.
            </p>
          ) : (
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend}>
                  <CartesianGrid vertical={false} stroke="#ECE8DE" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#70756D" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "#70756D" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="total"
                    fill="#174C38"
                    name="Feedback"
                    radius={[5, 5, 0, 0]}
                  />
                  <Bar
                    dataKey="negative"
                    fill="#E8795B"
                    name="Negative"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
        <article className="panel p-5 xl:col-span-5">
          <h2 className="text-base font-semibold text-ink">
            Most discussed topics
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Frequency from grouped feedback labels.
          </p>
          {topics.length ? (
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topics} layout="vertical" margin={{ left: 4 }}>
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={115}
                    tick={{ fontSize: 10, fill: "#70756D" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#B98528" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="grid h-56 place-items-center text-sm text-ink-muted">
              No grouped topics in this scope.
            </p>
          )}
        </article>
      </section>

      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Evidence-backed patterns
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Inspect the customer comments behind each observed pattern.
            </p>
          </div>
          <span className="text-xs text-ink-muted">
            {groups.length} pattern{groups.length === 1 ? "" : "s"}
          </span>
        </div>
        <ul className="mt-4 space-y-3">
          {groups.map((group) => (
            <li key={group.issueKey} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-ink">
                      {group.title}
                    </h3>
                    <span className="rounded-full bg-stone px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                      {group.category}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-ink-muted">
                    {group.evidenceNote}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(group)}
                  className="secondary-button shrink-0 px-3 py-2 text-xs"
                >
                  View evidence
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-3 text-xs text-ink-muted">
                <span>
                  <strong className="text-ink">{group.count}</strong> comments
                </span>
                <span>
                  <strong className="text-[#B94D35]">
                    {group.negativeCount}
                  </strong>{" "}
                  negative
                </span>
                <span>
                  Trend:{" "}
                  <strong className="text-ink">{group.trendDirection}</strong>
                </span>
              </div>
            </li>
          ))}
          {!groups.length ? (
            <li className="panel p-10 text-center text-sm text-ink-muted">
              No patterns are available for this scope. Analyze feedback or
              broaden the filters.
            </li>
          ) : null}
        </ul>
      </section>
      {selected ? (
        <EvidenceModal group={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

export function EvidenceModal({
  group,
  onClose,
}: {
  group: IssueGroup;
  onClose: () => void;
}) {
  return (
    <Modal title={`Evidence: ${group.title}`} onClose={onClose}>
      <div className="space-y-4 text-xs">
        <div className="rounded-xl bg-stone p-3 text-ink-muted">
          <p>
            <strong className="text-ink">Category:</strong> {group.category} ·{" "}
            <strong className="text-ink">Supporting comments:</strong>{" "}
            {group.count} ({group.negativeCount} negative)
          </p>
          <p className="mt-1">
            Trend: {group.trendDirection}. {group.trendNote}
          </p>
        </div>
        <ul className="max-h-96 space-y-2.5 overflow-y-auto">
          {group.records.map((record) => (
            <li key={record.id} className="rounded-xl border border-line p-3">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <SentimentBadge value={record.sentiment} />
                <ModeBadge value={record.analysisMode} />
                <span className="text-[11px] text-ink-muted">
                  {record.date?.slice(0, 10) ?? "Undated"}
                </span>
                <span className="rounded bg-stone px-1 text-[10px] font-bold uppercase text-ink-muted">
                  {record.source}
                </span>
              </div>
              <p className="leading-relaxed text-ink">“{record.text}”</p>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
function InsightStat({
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
