import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, MessageSquarePlus, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { FilterBar } from "../components/FilterBar";
import { EmptyState } from "../components/EmptyState";
import { PriorityBadge, SentimentBadge } from "../components/Badges";
import { useDashboardStats, useWorkspace } from "../context/WorkspaceContext";
import { issueFrequency, sentimentTrend } from "../lib/metrics";
import { SAMPLE_NOTICE } from "../lib/sampleData";

export function DashboardPage() {
  const { workspace, filtered, filters, setFilters, loadSample, currentWorkspace } = useWorkspace();
  const { metrics, groups, highPriority } = useDashboardStats();
  const trend = sentimentTrend(filtered);
  const topics = issueFrequency(filtered).slice(0, 5).map((row) => ({ ...row, label: row.issueKey.replaceAll("-", " ") }));
  const latestFeedback = [...filtered].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5);
  const featured = groups[0];

  if (workspace.feedback.length === 0) {
    return <EmptyState title="Your feedback workspace is ready" body="Import customer feedback to reveal recurring issues, sentiment, and evidence-backed priorities." action={<div className="flex flex-wrap items-center justify-center gap-3"><Link to="/explorer" className="primary-button"><MessageSquarePlus className="mr-2 h-4 w-4" />Import feedback</Link><button type="button" onClick={loadSample} className="secondary-button">Explore sample data</button></div>} />;
  }

  return <div className="app-page">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="page-kicker">Workspace intelligence · {currentWorkspace?.name ?? "Loading workspace"}</p><h1 className="page-title">What your customers are telling you</h1><p className="page-copy">A focused view of feedback patterns, the evidence behind them, and where to investigate next.</p></div>
      <Link to="/explorer" className="primary-button"><MessageSquarePlus className="mr-2 h-4 w-4" />Add feedback</Link>
    </header>

    {workspace.isSampleWorkspace ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber/30 bg-[#FFF8E8] px-4 py-3 text-sm text-[#6E4C12]"><span>{SAMPLE_NOTICE}</span><Link to="/explorer" className="font-bold underline">Import real feedback</Link></div> : null}
    <FilterBar records={workspace.feedback} filters={filters} onChange={setFilters} />

    <section className="grid gap-4 xl:grid-cols-12">
      <article className="relative overflow-hidden rounded-2xl bg-brand-600 p-6 text-white shadow-card xl:col-span-7">
        <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-citrus/15" />
        <div className="relative flex h-full flex-col justify-between gap-8">
          <div><span className="inline-flex items-center gap-1.5 rounded-full bg-citrus px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-700"><Sparkles className="h-3.5 w-3.5" />Featured signal</span>
          {featured ? <><h2 className="mt-5 max-w-xl text-2xl font-semibold tracking-[-0.03em]">{featured.title}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/75">{featured.evidenceNote}</p></> : <><h2 className="mt-5 text-2xl font-semibold">No recurring signal yet</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/75">Analyze more feedback to identify a reliable, evidence-backed priority.</p></>}</div>
          <div className="flex flex-wrap items-end justify-between gap-4"><div className="flex gap-6"><MetricOnDark label="Evidence" value={featured ? `${featured.count} comments` : "—"} /><MetricOnDark label="Negative" value={featured ? String(featured.negativeCount) : "—"} /></div><Link to="/insights" className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-sm font-bold text-brand-700 hover:bg-citrus">Investigate <ArrowRight className="h-4 w-4" /></Link></div>
        </div>
      </article>
      <div className="grid gap-4 sm:grid-cols-2 xl:col-span-5">
        <MetricCard label="Feedback in scope" value={String(metrics.total)} note={`${metrics.analyzed} analyzed`} />
        <MetricCard label="Priority issues" value={String(highPriority)} note="Evidence-based ranking" accent />
        <MetricCard label="Negative sentiment" value={metrics.negativeShare === null ? "—" : `${metrics.negativeShare.toFixed(1)}%`} note={`${metrics.negative} analyzed comments`} warning />
        <MetricCard label="Recurring topics" value={String(metrics.distinctIssues)} note="Grouped from feedback" />
      </div>
    </section>

    <section className="grid gap-4 xl:grid-cols-12">
      <article className="panel p-5 sm:p-6 xl:col-span-7"><PanelHeading title="Feedback trend" description="Dated feedback in the current scope" link="/explorer" linkLabel="View feedback" />
        {trend.length < 2 ? <ChartEmpty text="Add dated feedback to reveal the trend over time." /> : <div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><CartesianGrid vertical={false} stroke="#ECE8DE" /><XAxis dataKey="date" tick={{ fontSize: 11, fill: "#70756D" }} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#70756D" }} axisLine={false} tickLine={false}/><Tooltip /><Area type="monotone" dataKey="total" stroke="#174C38" fill="#E4EBDD" fillOpacity={0.9} name="Feedback" /><Area type="monotone" dataKey="negative" stroke="#E8795B" fill="#E8795B" fillOpacity={0.12} name="Negative" /></AreaChart></ResponsiveContainer></div>}</article>
      <article className="panel p-5 sm:p-6 xl:col-span-5"><PanelHeading title="Priority issues" description="Ranked by evidence and severity" link="/insights" linkLabel="All insights" />
        <div className="mt-4 divide-y divide-line">{groups.slice(0, 4).map((group) => <Link key={group.issueKey} to="/insights" className="flex items-center justify-between gap-3 py-3 transition hover:bg-[#ECE8DE]/60"><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{group.title}</p><p className="mt-1 text-xs text-ink-muted">{group.count} comments · {group.negativeCount} negative</p></div><PriorityBadge value={group.priorityLabel} /></Link>)}{!groups.length ? <ChartEmpty text="No grouped issues in this view." /> : null}</div></article>
    </section>

    <section className="grid gap-4 xl:grid-cols-12">
      <article className="panel p-5 sm:p-6 xl:col-span-4"><PanelHeading title="Most reported" description="Topic volume in this scope" />
        {topics.length ? <div className="mt-4 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={topics} layout="vertical" margin={{ left: 4 }}><XAxis type="number" allowDecimals={false} hide /><YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 10, fill: "#70756D" }} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="count" fill="#174C38" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div> : <ChartEmpty text="No grouped topics yet." />}</article>
      <article className="panel p-5 sm:p-6 xl:col-span-8"><PanelHeading title="Recent feedback" description="Newest records from the current selection" link="/explorer" linkLabel="Open explorer" />
        <div className="mt-4 divide-y divide-line">{latestFeedback.map((record) => <Link key={record.id} to="/explorer" className="grid gap-2 py-3.5 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="line-clamp-1 text-sm text-ink">{record.text}</p><p className="mt-1 text-xs text-ink-muted">{record.source} · {record.date?.slice(0, 10) ?? "Undated"}</p></div><SentimentBadge value={record.sentiment} /></Link>)}</div>
      </article>
    </section>
  </div>;
}

function MetricOnDark({ label, value }: { label: string; value: string }) { return <div><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">{label}</p><p className="mt-1 text-lg font-semibold text-white">{value}</p></div>; }
function MetricCard({ label, value, note, accent, warning }: { label: string; value: string; note: string; accent?: boolean; warning?: boolean }) { return <article className={`panel p-4 ${accent ? "border-citrus bg-citrus" : ""}`}><p className={`metric-label ${accent ? "text-brand-700" : ""}`}>{label}</p><p className={`mt-3 text-2xl font-semibold tracking-[-0.04em] ${warning ? "text-[#B94D35]" : "text-ink"}`}>{value}</p><p className={`mt-1 text-xs ${accent ? "text-brand-700" : "text-ink-muted"}`}>{note}</p></article>; }
function PanelHeading({ title, description, link, linkLabel }: { title: string; description: string; link?: string; linkLabel?: string }) { return <div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-ink">{title}</h2><p className="mt-1 text-xs text-ink-muted">{description}</p></div>{link ? <Link to={link} className="shrink-0 text-xs font-bold text-brand-700 hover:text-brand-600">{linkLabel} <ArrowRight className="inline h-3.5 w-3.5" /></Link> : null}</div>; }
function ChartEmpty({ text }: { text: string }) { return <p className="grid min-h-40 place-items-center text-center text-sm text-ink-muted">{text}</p>; }
