import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FilterBar } from "../components/FilterBar";
import { EmptyState } from "../components/EmptyState";
import { KpiCard } from "../components/KpiCard";
import { PriorityBadge } from "../components/Badges";
import { useDashboardStats, useWorkspace } from "../context/WorkspaceContext";
import { issueFrequency, sentimentTrend } from "../lib/metrics";
import { SAMPLE_NOTICE } from "../lib/sampleData";
import { Link } from "react-router-dom";

export function DashboardPage() {
  const { workspace, filtered, filters, setFilters, loadSample, startEmpty } = useWorkspace();
  const { metrics, groups, highPriority } = useDashboardStats();
  const trend = sentimentTrend(filtered);
  const freq = issueFrequency(filtered).slice(0, 6).map((row) => ({
    ...row,
    label: row.issueKey.replaceAll("-", " "),
  }));

  if (workspace.feedback.length === 0) {
    return (
      <EmptyState
        title="No feedback in this workspace"
        body="Load the synthetic shopping-business sample, or import comments from Feedback Explorer."
        action={
          <button type="button" onClick={loadSample} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">
            Load sample data
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-muted">
            What is happening, why it matters, and which issues to fix next. Numbers come from the current filters.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={loadSample} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
            Reload sample
          </button>
          <button type="button" onClick={startEmpty} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
            Clear workspace
          </button>
        </div>
      </div>
      {workspace.isSampleWorkspace ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{SAMPLE_NOTICE}</p>
      ) : null}

      <FilterBar records={workspace.feedback} filters={filters} onChange={setFilters} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Total feedback" value={String(metrics.total)} hint={`${metrics.analyzed} analyzed`} />
        <KpiCard
          label="Sentiment mix"
          value={`${metrics.positive} / ${metrics.neutral} / ${metrics.negative}`}
          hint="Positive / Neutral / Negative"
        />
        <KpiCard
          label="Negative share"
          value={metrics.negativeShare === null ? "n/a" : `${metrics.negativeShare.toFixed(1)}%`}
          hint={metrics.unclassified ? `${metrics.unclassified} still unclassified` : "Of analyzed comments"}
        />
        <KpiCard label="Distinct issues" value={String(metrics.distinctIssues)} />
        <KpiCard label="High-priority issues" value={String(highPriority)} hint="Needs 3+ supporting comments" />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-xl border border-line bg-white p-4 shadow-card xl:col-span-2">
          <h2 className="text-sm font-semibold text-ink">Volume and sentiment over time</h2>
          <p className="mb-3 text-xs text-ink-muted">Undated comments are omitted from this chart.</p>
          {trend.length < 2 ? (
            <p className="py-10 text-center text-sm text-ink-muted">Not enough dated comments to draw a trend.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <CartesianGrid stroke="#EEF2F6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="total" stroke="#2F6FED" fill="#EFF5FF" name="Total" />
                  <Area type="monotone" dataKey="negative" stroke="#C54848" fill="#FDECEC" name="Negative" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
        <article className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="text-sm font-semibold text-ink">Most reported issues</h2>
          <p className="mb-3 text-xs text-ink-muted">Counts from grouped issue keys in the current view.</p>
          {freq.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-muted">Analyze comments to group issues.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={freq} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid stroke="#EEF2F6" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2F6FED" name="Comments" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </section>

      <article className="rounded-xl border border-line bg-white p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Issues requiring attention</h2>
          <Link to="/insights" className="text-sm font-medium text-brand-700">
            Open Insights
          </Link>
        </div>
        <ul className="divide-y divide-line">
          {groups.slice(0, 6).map((group) => (
            <li key={group.issueKey} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-ink">{group.title}</p>
                <p className="text-sm text-ink-muted">
                  {group.category} · {group.count} comments · {group.negativeCount} negative
                </p>
              </div>
              <div className="flex items-center gap-2">
                <PriorityBadge value={group.priorityLabel} />
                <span className="text-sm tabular-nums text-ink-muted">{group.priorityScore.toFixed(0)}</span>
              </div>
            </li>
          ))}
        </ul>
      </article>

      <p className="text-xs text-ink-muted">
        Priority = 0.40×frequency + 0.30×negative rate + 0.20×trend + 0.10×severity (0–100). Weights are a design choice.
        Trend is omitted and remaining weights are redistributed when dated history is thin.
      </p>
    </div>
  );
}
