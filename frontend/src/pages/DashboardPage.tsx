import { useState } from "react";
import type { ActionItem } from "../types";
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
import { PriorityBadge, SentimentBadge } from "../components/Badges";
import { useDashboardStats, useWorkspace } from "../context/WorkspaceContext";
import { issueFrequency, sentimentTrend } from "../lib/metrics";
import { SAMPLE_NOTICE } from "../lib/sampleData";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Code2,
  Layers,
  Radio,
  Sparkles,
} from "lucide-react";

export function DashboardPage() {
  const {
    workspace,
    filtered,
    filters,
    setFilters,
    loadSample,
    startEmpty,
    currentProject,
    forms,
    actions,
    updateAction,
  } = useWorkspace();
  const { metrics, groups, highPriority } = useDashboardStats();
  const trend = sentimentTrend(filtered);
  const freq = issueFrequency(filtered)
    .slice(0, 6)
    .map((row) => ({
      ...row,
      label: row.issueKey.replaceAll("-", " "),
    }));

  const [activeTab, setActiveTab] = useState<"all" | "open">("open");

  if (workspace.feedback.length === 0) {
    return (
      <EmptyState
        title="No feedback collected yet"
        body="Get started by embedding the feedback widget on your website, or explore synthetic demonstration data."
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={loadSample}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              Load sample dataset
            </button>
            <Link
              to="/installation"
              className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-slate-50"
            >
              Install Widget on Website
            </Link>
          </div>
        }
      />
    );
  }

  const latestFeedback = [...filtered]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 5);

  const displayedActions = actions.filter((a) => (activeTab === "open" ? a.status !== "completed" : true));

  return (
    <div className="space-y-6">
      {/* Top Header with Context & Project Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
              <Sparkles className="h-3.5 w-3.5" />
              Intelligence Dashboard
            </span>
            <span className="text-xs text-ink-muted">· {currentProject?.name}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Customer Intelligence Overview</h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            Live recurring issues, sentiment metrics, and evidence-backed recommendations derived from customer feedback.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/builder"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-medium text-ink shadow-sm hover:bg-slate-50"
          >
            <Layers className="h-3.5 w-3.5 text-brand-600" />
            Form Builder
          </Link>
          <Link
            to="/installation"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-medium text-ink shadow-sm hover:bg-slate-50"
          >
            <Code2 className="h-3.5 w-3.5 text-slate-600" />
            Install Widget
          </Link>
          <button
            type="button"
            onClick={loadSample}
            className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-medium text-ink hover:bg-slate-50"
          >
            Reload Sample
          </button>
          <button
            type="button"
            onClick={startEmpty}
            className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-medium text-ink-muted hover:text-ink"
          >
            Clear
          </button>
        </div>
      </div>

      {workspace.isSampleWorkspace ? (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
          <span>{SAMPLE_NOTICE}</span>
          <Link to="/installation" className="font-semibold underline hover:text-amber-950">
            Install widget to collect real data →
          </Link>
        </div>
      ) : null}

      {/* Global Filter Bar */}
      <FilterBar records={workspace.feedback} filters={filters} onChange={setFilters} />

      {/* Bento Grid Row 1: Key Performance Metrics */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Total feedback"
          value={String(metrics.total)}
          hint={`${metrics.analyzed} analyzed · ${metrics.unclassified} pending`}
        />
        <KpiCard
          label="Sentiment mix"
          value={`${metrics.positive} / ${metrics.neutral} / ${metrics.negative}`}
          hint="Positive / Neutral / Negative"
        />
        <KpiCard
          label="Negative share"
          value={metrics.negativeShare === null ? "n/a" : `${metrics.negativeShare.toFixed(1)}%`}
          hint={metrics.negativeShare && metrics.negativeShare > 40 ? "Attention required" : "Of analyzed comments"}
        />
        <KpiCard label="Distinct recurring issues" value={String(metrics.distinctIssues)} hint="Clustered by AI" />
        <KpiCard
          label="High-priority issues"
          value={String(highPriority)}
          hint="Priority score ≥ 70 with 3+ records"
        />
      </section>

      {/* Bento Grid Row 2: Bento Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Card 1: Top Recurring Issues (Large, 8 cols) */}
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm lg:col-span-8">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-sm font-bold text-ink">Leading Recurring Issues & Evidence</h2>
              <p className="text-xs text-ink-muted">Issues ranked by calculated priority score and negative volume</p>
            </div>
            <Link to="/insights" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
              View All Insights <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-4 divide-y divide-line">
            {groups.slice(0, 5).map((group, idx) => (
              <div key={group.issueKey} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-ink">{group.title}</h3>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        {group.category}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-1">{group.evidenceNote}</p>
                    <p className="mt-0.5 text-xs text-brand-700 font-medium">Recommended: {group.suggestedAction}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <div className="flex items-center gap-1.5">
                    <PriorityBadge value={group.priorityLabel} />
                    <span className="font-mono text-xs font-bold text-ink">{group.priorityScore.toFixed(0)}</span>
                  </div>
                  <span className="text-[11px] text-ink-muted">
                    {group.count} comments ({group.negativeCount} neg)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Sentiment Breakdown & Health (4 cols) */}
        <div className="flex flex-col justify-between rounded-2xl border border-line bg-white p-6 shadow-sm lg:col-span-4">
          <div>
            <h2 className="text-sm font-bold text-ink">Sentiment Distribution</h2>
            <p className="text-xs text-ink-muted">Ratio across {metrics.analyzed} analyzed submissions</p>

            <div className="mt-6 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-emerald-700">Positive Feedback</span>
                  <span className="font-bold text-slate-800">
                    {metrics.analyzed ? ((metrics.positive / metrics.analyzed) * 100).toFixed(0) : 0}% ({metrics.positive})
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${metrics.analyzed ? (metrics.positive / metrics.analyzed) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-600">Neutral Feedback</span>
                  <span className="font-bold text-slate-800">
                    {metrics.analyzed ? ((metrics.neutral / metrics.analyzed) * 100).toFixed(0) : 0}% ({metrics.neutral})
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-slate-400 rounded-full"
                    style={{ width: `${metrics.analyzed ? (metrics.neutral / metrics.analyzed) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-rose-700">Negative Feedback</span>
                  <span className="font-bold text-slate-800">
                    {metrics.analyzed ? ((metrics.negative / metrics.analyzed) * 100).toFixed(0) : 0}% ({metrics.negative})
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${metrics.analyzed ? (metrics.negative / metrics.analyzed) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form & Widget Status Box */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                <span>Collection Status</span>
              </span>
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                {forms.some((f) => f.status === "published") ? "Live" : "Draft"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {forms.length} form(s) configured for {currentProject?.name}.
            </p>
            <Link
              to="/installation"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Get website embed code →
            </Link>
          </div>
        </div>
      </div>

      {/* Bento Grid Row 3: Charts & Trends */}
      <section className="grid gap-6 xl:grid-cols-12">
        {/* Volume & Sentiment Over Time (8 cols) */}
        <article className="rounded-2xl border border-line bg-white p-6 shadow-sm xl:col-span-8">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-sm font-bold text-ink">Feedback Volume & Negative Sentiment Over Time</h2>
              <p className="text-xs text-ink-muted">Historical volume trends plotted from dated customer feedback</p>
            </div>
          </div>
          <div className="mt-4">
            {trend.length < 2 ? (
              <p className="py-12 text-center text-xs text-ink-muted">Not enough dated comments to draw a historical trend.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend}>
                    <CartesianGrid stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="total" stroke="#2563EB" fill="#EFF6FF" name="Total Submissions" />
                    <Area type="monotone" dataKey="negative" stroke="#DC2626" fill="#FEF2F2" name="Negative" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </article>

        {/* Most Reported Issues (4 cols) */}
        <article className="rounded-2xl border border-line bg-white p-6 shadow-sm xl:col-span-4">
          <div className="border-b border-line pb-3">
            <h2 className="text-sm font-bold text-ink">Most Reported Topics</h2>
            <p className="text-xs text-ink-muted">Volume counts by grouped issue key</p>
          </div>
          <div className="mt-4">
            {freq.length === 0 ? (
              <p className="py-12 text-center text-xs text-ink-muted">No grouped issues yet.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={freq} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid stroke="#F1F5F9" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563EB" name="Count" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </article>
      </section>

      {/* Bento Grid Row 4: Action Items & Live Feed */}
      <section className="grid gap-6 lg:grid-cols-12">
        {/* Action Items Tracker (7 cols) */}
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-sm font-bold text-ink">Engineering Action Tracker</h2>
              <p className="text-xs text-ink-muted">Planned improvements and fixes linked directly to issue evidence</p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-line bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab("open")}
                className={`rounded px-2 py-0.5 text-xs font-semibold transition ${
                  activeTab === "open" ? "bg-white text-ink shadow-sm" : "text-ink-muted"
                }`}
              >
                Incomplete ({actions.filter((a) => a.status !== "completed").length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`rounded px-2 py-0.5 text-xs font-semibold transition ${
                  activeTab === "all" ? "bg-white text-ink shadow-sm" : "text-ink-muted"
                }`}
              >
                All ({actions.length})
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {displayedActions.length === 0 ? (
              <p className="py-8 text-center text-xs text-ink-muted">
                No action items in this view. Create actions directly from the Insights page.
              </p>
            ) : (
              displayedActions.map((act) => (
                <div key={act.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-ink">{act.title}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          act.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : act.status === "in_progress"
                            ? "bg-brand-100 text-brand-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {act.status.replace("_", " ")}
                      </span>
                    </div>
                    {act.proposed_fix ? <p className="text-xs text-slate-600">{act.proposed_fix}</p> : null}
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      {act.assignee ? <span>Assignee: {act.assignee}</span> : null}
                      {act.due_date ? <span>Due: {act.due_date}</span> : null}
                    </div>
                  </div>

                  <select
                    value={act.status}
                    onChange={(e) => void updateAction(act.id, { status: e.target.value as ActionItem["status"] })}
                    className="rounded border border-line bg-white px-2 py-1 text-xs font-medium text-slate-700"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Customer Feedback Stream (5 cols) */}
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm lg:col-span-5">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-sm font-bold text-ink">Recent Feedback Submissions</h2>
              <p className="text-xs text-ink-muted">Latest comments from embedded forms & API</p>
            </div>
            <Link to="/explorer" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              Explorer →
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {latestFeedback.map((rec) => (
              <div key={rec.id} className="rounded-xl border border-slate-100 bg-slate-50/40 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <SentimentBadge value={rec.sentiment} />
                    <span className="font-semibold text-slate-700">{rec.category}</span>
                  </div>
                  <span className="rounded bg-slate-200/60 px-1.5 py-0.5 text-[10px] uppercase font-bold text-slate-600">
                    {rec.source}
                  </span>
                </div>
                <p className="mt-2 text-slate-800 line-clamp-2 leading-relaxed">“{rec.text}”</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{rec.date ? rec.date.slice(0, 10) : "Recent"}</span>
                  <span className="font-mono text-slate-500">{rec.issueKey.replaceAll("-", " ")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclosed Priority Formula Footer */}
      <div className="border-t border-line/60 pt-3 text-[11px] leading-relaxed text-ink-muted">
        <strong>Transparent Priority Scoring:</strong> Priority = 0.40 × Frequency + 0.30 × Negative Rate + 0.20 × Trend + 0.10 × Severity (normalized 0–100). Trend weight is proportionally redistributed when dated comments are fewer than four.
      </div>
    </div>
  );
}
