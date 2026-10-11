import { describe, expect, it } from "vitest";
import { applyAnalysisItems, unclassifiedRecords } from "./analysis";
import { createSampleFeedback } from "./sampleData";

describe("analysis merge", () => {
  it("applies live results only to matching ids", () => {
    const records = createSampleFeedback().slice(0, 2);
    const [first, second] = records;
    if (!first || !second) throw new Error("expected sample records");
    const merged = applyAnalysisItems(records, [
      {
        id: first.id,
        sentiment: "negative",
        category: "Payments",
        issue_key: "checkout-fail",
        summary: "Checkout failed",
        severity: "high",
        confidence: 0.9,
        explanation: "Customer described a failed checkout.",
        suggested_action: "Inspect gateway logs.",
      },
    ]);
    expect(merged[0]?.analysisMode).toBe("live-ai");
    expect(merged[0]?.issueKey).toBe("checkout-fail");
    expect(merged[1]?.id).toBe(second.id);
    expect(merged[1]?.analysisMode).toBe(second.analysisMode);
  });

  it("lists unclassified records", () => {
    const sample = createSampleFeedback();
    expect(unclassifiedRecords(sample)).toEqual([]);
  });
});
