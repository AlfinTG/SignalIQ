import { describe, expect, it } from "vitest";
import type { FeedbackRecord } from "../types";
import { groupIssues, highPriorityCount } from "./priority";

function record(partial: Partial<FeedbackRecord>): FeedbackRecord {
  return {
    id: partial.id ?? "1",
    text: partial.text ?? "text",
    source: "review",
    date: partial.date ?? "2026-09-01T00:00:00.000Z",
    rating: null,
    sentiment: partial.sentiment ?? "negative",
    category: partial.category ?? "Payments",
    issueKey: partial.issueKey ?? "card-fail",
    severity: partial.severity ?? "high",
    confidence: 0.5,
    analysisReason: "reason",
    suggestedAction: "act",
    analysisMode: "demo-rules",
    analyzedAt: "2026-10-01T00:00:00.000Z",
    isSample: true,
  };
}

describe("priority", () => {
  it("does not label high priority with fewer than three comments", () => {
    const groups = groupIssues([
      record({ id: "a", issueKey: "rare" }),
      record({ id: "b", issueKey: "rare", date: "2026-09-02T00:00:00.000Z" }),
    ]);
    expect(groups[0]?.priorityLabel).toBe("Low");
    expect(groups[0]?.recommendation).toMatch(/few records/i);
  });

  it("scores a frequent negative issue above a rare positive one", () => {
    const frequent = Array.from({ length: 6 }, (_, index) =>
      record({
        id: `n${index}`,
        issueKey: "late-delivery",
        category: "Delivery",
        date: `2026-09-0${(index % 9) + 1}T00:00:00.000Z`,
      }),
    );
    const rarePositive = [
      record({
        id: "p1",
        issueKey: "love-product",
        sentiment: "positive",
        severity: "low",
        category: "Product quality",
      }),
    ];
    const groups = groupIssues([...frequent, ...rarePositive]);
    expect(groups[0]?.issueKey).toBe("late-delivery");
    expect(groups[0]?.priorityScore).toBeGreaterThan(groups[1]?.priorityScore ?? 0);
    expect(highPriorityCount(groups)).toBeGreaterThanOrEqual(0);
  });

  it("marks trend insufficient without four dated comments", () => {
    const groups = groupIssues([
      record({ id: "1", date: null }),
      record({ id: "2", date: null }),
      record({ id: "3", date: null }),
    ]);
    expect(groups[0]?.trendDirection).toBe("insufficient");
    expect(groups[0]?.trendScore).toBeNull();
  });
});
