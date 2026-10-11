import type { AnalyzeApiItem, FeedbackRecord } from "../types";

export function applyAnalysisItems(records: FeedbackRecord[], results: AnalyzeApiItem[]): FeedbackRecord[] {
  const map = new Map(results.map((result) => [result.id, result]));
  const now = new Date().toISOString();
  return records.map((record) => {
    const hit = map.get(record.id);
    if (!hit) return record;
    return {
      ...record,
      sentiment: hit.sentiment,
      category: hit.category,
      issueKey: hit.issue_key,
      severity: hit.severity,
      confidence: hit.confidence,
      analysisReason: hit.explanation,
      suggestedAction: hit.suggested_action,
      analysisMode: "live-ai",
      analyzedAt: now,
    };
  });
}

export function unclassifiedRecords(records: FeedbackRecord[]): FeedbackRecord[] {
  return records.filter((record) => record.analysisMode === "unclassified" || record.sentiment === "unclassified");
}
