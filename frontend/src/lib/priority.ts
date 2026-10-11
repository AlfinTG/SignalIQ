import type { FeedbackRecord, IssueGroup, Severity } from "../types";
import { recommendForGroup } from "./recommendations";

const SEVERITY_SCORE: Record<Severity, number> = {
  unknown: 0,
  low: 33,
  medium: 67,
  high: 100,
};

function titleFromKey(issueKey: string): string {
  return issueKey
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function trendFor(records: FeedbackRecord[]): { score: number | null; direction: IssueGroup["trendDirection"]; note: string } {
  const dated = records
    .map((record) => record.date)
    .filter((date): date is string => Boolean(date))
    .sort();
  if (dated.length < 4) {
    return {
      score: null,
      direction: "insufficient",
      note: "Trend is not scored: fewer than four dated comments in this group.",
    };
  }
  const midpoint = dated[Math.floor(dated.length / 2)];
  if (!midpoint) {
    return { score: null, direction: "insufficient", note: "Trend is not scored." };
  }
  const first = dated.filter((date) => date < midpoint).length;
  const second = dated.filter((date) => date >= midpoint).length;
  if (first === 0) {
    return { score: null, direction: "insufficient", note: "Trend is not scored: all dates sit in one period." };
  }
  const change = (second - first) / first;
  const score = Math.max(0, Math.min(100, 50 + change * 50));
  const direction = change > 0.15 ? "up" : change < -0.15 ? "down" : "flat";
  return {
    score,
    direction,
    note: `Earlier period ${first} comments vs later period ${second} comments.`,
  };
}

function priorityLabel(score: number, count: number): IssueGroup["priorityLabel"] {
  if (count < 3) return "Low";
  if (score >= 70) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

export function groupIssues(records: FeedbackRecord[]): IssueGroup[] {
  const analyzed = records.filter((record) => record.issueKey && record.issueKey !== "unclassified");
  const buckets = new Map<string, FeedbackRecord[]>();
  for (const record of analyzed) {
    const list = buckets.get(record.issueKey) ?? [];
    list.push(record);
    buckets.set(record.issueKey, list);
  }
  const maxCount = Math.max(1, ...[...buckets.values()].map((list) => list.length));

  return [...buckets.entries()]
    .map(([issueKey, groupRecords]) => {
      const count = groupRecords.length;
      const negativeCount = groupRecords.filter((record) => record.sentiment === "negative").length;
      const frequencyScore = (count / maxCount) * 100;
      const negativeScore = (negativeCount / count) * 100;
      const severityScore =
        groupRecords.reduce((sum, record) => sum + SEVERITY_SCORE[record.severity], 0) / count;
      const trend = trendFor(groupRecords);
      let priorityScore: number;
      if (trend.score === null) {
        priorityScore = (frequencyScore * 0.4 + negativeScore * 0.3 + severityScore * 0.1) / 0.8;
      } else {
        priorityScore =
          frequencyScore * 0.4 + negativeScore * 0.3 + trend.score * 0.2 + severityScore * 0.1;
      }
      const category = groupRecords[0]?.category ?? "Uncategorized";
      const label = priorityLabel(priorityScore, count);
      const rec = recommendForGroup({
        issueKey,
        category,
        count,
        negativeCount,
        negativeRate: negativeScore,
        trendDirection: trend.direction,
        records: groupRecords,
      });
      return {
        issueKey,
        title: titleFromKey(issueKey),
        category,
        records: [...groupRecords].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
        count,
        negativeCount,
        negativeRate: negativeScore,
        frequencyScore,
        negativeScore,
        trendScore: trend.score,
        severityScore,
        priorityScore,
        priorityLabel: label,
        trendDirection: trend.direction,
        trendNote: trend.note,
        recommendation: rec.recommendation,
        evidenceNote: rec.evidenceNote,
        suggestedAction: rec.suggestedAction,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

export function highPriorityCount(groups: IssueGroup[]): number {
  return groups.filter((group) => group.priorityLabel === "High").length;
}
