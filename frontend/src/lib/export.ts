import { computeMetrics } from "./metrics";
import { groupIssues } from "./priority";
import { csvEscape } from "./csv";
import type { FeedbackRecord, Filters, IssueGroup, IssueState } from "../types";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function filterSummary(filters: Filters): string {
  const bits = [];
  if (filters.search) bits.push(`search “${filters.search}”`);
  if (filters.sentiment !== "all") bits.push(`sentiment ${filters.sentiment}`);
  if (filters.category !== "all") bits.push(`category ${filters.category}`);
  if (filters.source !== "all") bits.push(`source ${filters.source}`);
  if (filters.dateFrom || filters.dateTo) bits.push(`dates ${filters.dateFrom || "…"} to ${filters.dateTo || "…"}`);
  return bits.length ? bits.join(", ") : "No filters applied (full workspace).";
}

export function buildReportHtml(
  records: FeedbackRecord[],
  filters: Filters,
  issues: Record<string, IssueState>,
  groups: IssueGroup[],
): string {
  const metrics = computeMetrics(records);
  const generated = new Date().toISOString();
  const top = groups.slice(0, 8);
  const issueBlocks = top
    .map((group) => {
      const status = issues[group.issueKey]?.status ?? "Open";
      const excerpts = group.records
        .slice(0, 3)
        .map((record) => `<li>${escapeHtml(record.text)} <span class="meta">(${escapeHtml(record.sentiment)}, ${escapeHtml(record.date?.slice(0, 10) ?? "undated")})</span></li>`)
        .join("");
      const trend = group.trendScore === null ? "unavailable" : `${group.trendDirection} (${group.trendScore.toFixed(0)})`;
      return `<section class="issue">
        <h3>${escapeHtml(group.title)} <small>${escapeHtml(group.priorityLabel)} · ${escapeHtml(status)}</small></h3>
        <p>Category ${escapeHtml(group.category)}. ${group.count} comments, ${group.negativeCount} negative (${group.negativeRate.toFixed(0)}%). Priority ${group.priorityScore.toFixed(1)}.</p>
        <p>Score inputs: frequency ${group.frequencyScore.toFixed(0)}, negative rate ${group.negativeScore.toFixed(0)}, trend ${escapeHtml(trend)}, severity ${group.severityScore.toFixed(0)}. Weights 40/30/20/10; trend weight redistributed when unavailable.</p>
        <p><strong>Recommended action:</strong> ${escapeHtml(group.suggestedAction)}</p>
        <p>${escapeHtml(group.evidenceNote)}</p>
        <ul>${excerpts}</ul>
      </section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>SignalIQ insight report</title>
  <style>
    body { font-family: Inter, Segoe UI, sans-serif; color: #192638; margin: 32px; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .muted { color: #667085; }
    .kpis { display: flex; gap: 16px; flex-wrap: wrap; margin: 16px 0 24px; }
    .kpi { border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 16px; min-width: 140px; }
    .kpi b { display: block; font-size: 22px; }
    .issue { border-top: 1px solid #E2E8F0; padding: 16px 0; }
    .meta { color: #667085; font-size: 12px; }
    @media print { body { margin: 16px; } }
  </style>
</head>
<body>
  <h1>SignalIQ insight report</h1>
  <p class="muted">Find the signal. Fix the problem. Generated ${escapeHtml(generated)}.</p>
  <p>Scope: ${escapeHtml(filterSummary(filters))}. ${records.length} feedback records in this view.</p>
  <div class="kpis">
    <div class="kpi"><span>Total</span><b>${metrics.total}</b></div>
    <div class="kpi"><span>Negative share</span><b>${metrics.negativeShare === null ? "n/a" : `${metrics.negativeShare.toFixed(1)}%`}</b></div>
    <div class="kpi"><span>Positive / Neutral / Negative</span><b>${metrics.positive} / ${metrics.neutral} / ${metrics.negative}</b></div>
    <div class="kpi"><span>Distinct issues</span><b>${metrics.distinctIssues}</b></div>
  </div>
  <p class="muted">Priority formula is a documented design choice (frequency 40%, negative rate 30%, trend 20%, severity 10%), not a validated industry standard. Sample/demo analysis is labelled in the source records.</p>
  <h2>Top issues</h2>
  ${issueBlocks || "<p>No grouped issues in this scope.</p>"}
</body>
</html>`;
}

export function issuesToCsv(groups: IssueGroup[], states: Record<string, IssueState>): string {
  const header = "issueKey,title,category,count,negativeCount,priorityScore,priorityLabel,status,saved,recommendation";
  const rows = groups.map((group) => {
    const state = states[group.issueKey];
    const cells = [
      group.issueKey,
      group.title,
      group.category,
      String(group.count),
      String(group.negativeCount),
      group.priorityScore.toFixed(1),
      group.priorityLabel,
      state?.status ?? "Open",
      state?.saved ? "true" : "false",
      group.suggestedAction,
    ];
    return cells.map(csvEscape).join(",");
  });
  return `${[header, ...rows].join("\n")}\n`;
}

export function downloadText(filename: string, content: string, type = "text/plain"): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function reportFromRecords(records: FeedbackRecord[], filters: Filters, issues: Record<string, IssueState>): string {
  return buildReportHtml(records, filters, issues, groupIssues(records));
}
