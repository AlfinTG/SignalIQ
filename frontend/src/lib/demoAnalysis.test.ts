import { describe, expect, it } from "vitest";
import { demoAnalyzeRecord } from "./demoAnalysis";
import type { FeedbackRecord } from "../types";

const base: FeedbackRecord = {
  id: "x",
  text: "Apple Pay keeps failing on the last step.",
  source: "support",
  date: "2026-09-01T00:00:00.000Z",
  rating: null,
  sentiment: "unclassified",
  category: "Uncategorized",
  issueKey: "unclassified",
  severity: "unknown",
  confidence: null,
  analysisReason: "",
  suggestedAction: null,
  analysisMode: "unclassified",
  analyzedAt: null,
  isSample: false,
};

describe("demo analysis", () => {
  it("labels results as demo-rules", () => {
    const result = demoAnalyzeRecord(base);
    expect(result.analysisMode).toBe("demo-rules");
    expect(result.category).toBe("Payments");
    expect(result.sentiment).toBe("negative");
  });
});
