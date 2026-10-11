import { describe, expect, it } from "vitest";
import { createSampleFeedback } from "./sampleData";
import { computeMetrics, sentimentTrend } from "./metrics";
import { applyFilters } from "./filters";
import { EMPTY_FILTERS } from "../types";

describe("metrics", () => {
  it("returns empty-safe values", () => {
    const metrics = computeMetrics([]);
    expect(metrics.total).toBe(0);
    expect(metrics.negativeShare).toBeNull();
    expect(metrics.distinctIssues).toBe(0);
  });

  it("computes sample dataset from records rather than hardcoded KPIs", () => {
    const sample = createSampleFeedback();
    const metrics = computeMetrics(sample);
    expect(metrics.total).toBe(sample.length);
    expect(metrics.positive + metrics.neutral + metrics.negative + metrics.unclassified).toBe(sample.length);
    expect(metrics.negative).toBeGreaterThan(0);
    const payments = applyFilters(sample, { ...EMPTY_FILTERS, category: "Payments" });
    expect(computeMetrics(payments).total).toBe(payments.length);
    expect(computeMetrics(payments).total).toBeLessThan(metrics.total);
  });

  it("buckets dated comments", () => {
    const trend = sentimentTrend(createSampleFeedback());
    expect(trend.length).toBeGreaterThan(1);
    expect(trend.every((point) => point.total === point.positive + point.neutral + point.negative)).toBe(true);
  });
});
