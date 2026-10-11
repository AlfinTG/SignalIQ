import type { FeedbackRecord, TrendPoint } from "../types";

export interface DashboardMetrics {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  unclassified: number;
  negativeShare: number | null;
  distinctIssues: number;
  analyzed: number;
}

export function computeMetrics(records: FeedbackRecord[]): DashboardMetrics {
  const total = records.length;
  if (total === 0) {
    return {
      total: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      unclassified: 0,
      negativeShare: null,
      distinctIssues: 0,
      analyzed: 0,
    };
  }
  const positive = records.filter((record) => record.sentiment === "positive").length;
  const neutral = records.filter((record) => record.sentiment === "neutral").length;
  const negative = records.filter((record) => record.sentiment === "negative").length;
  const unclassified = records.filter((record) => record.sentiment === "unclassified").length;
  const analyzed = total - unclassified;
  const issues = new Set(
    records
      .filter((record) => record.issueKey && record.issueKey !== "unclassified")
      .map((record) => record.issueKey),
  );
  return {
    total,
    positive,
    neutral,
    negative,
    unclassified,
    negativeShare: analyzed === 0 ? null : (negative / analyzed) * 100,
    distinctIssues: issues.size,
    analyzed,
  };
}

export function sentimentTrend(records: FeedbackRecord[]): TrendPoint[] {
  const buckets = new Map<string, TrendPoint>();
  for (const record of records) {
    if (!record.date) continue;
    const day = record.date.slice(0, 10);
    const current = buckets.get(day) ?? { date: day, total: 0, positive: 0, neutral: 0, negative: 0 };
    current.total += 1;
    if (record.sentiment === "positive") current.positive += 1;
    if (record.sentiment === "neutral") current.neutral += 1;
    if (record.sentiment === "negative") current.negative += 1;
    buckets.set(day, current);
  }
  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function issueFrequency(records: FeedbackRecord[]): Array<{ issueKey: string; count: number; category: string }> {
  const map = new Map<string, { issueKey: string; count: number; category: string }>();
  for (const record of records) {
    if (!record.issueKey || record.issueKey === "unclassified") continue;
    const current = map.get(record.issueKey) ?? {
      issueKey: record.issueKey,
      count: 0,
      category: record.category,
    };
    current.count += 1;
    map.set(record.issueKey, current);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}
