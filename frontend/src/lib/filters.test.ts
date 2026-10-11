import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS } from "../types";
import { applyFilters } from "./filters";
import { createSampleFeedback } from "./sampleData";

describe("filters", () => {
  it("searches text and issue keys", () => {
    const records = createSampleFeedback();
    const hits = applyFilters(records, { ...EMPTY_FILTERS, search: "upi" });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((record) => `${record.text} ${record.issueKey}`.toLowerCase().includes("upi"))).toBe(true);
  });

  it("filters sentiment", () => {
    const records = createSampleFeedback();
    const negative = applyFilters(records, { ...EMPTY_FILTERS, sentiment: "negative" });
    expect(negative.every((record) => record.sentiment === "negative")).toBe(true);
    expect(negative.length).toBeLessThan(records.length);
  });
});
