import type { FeedbackRecord, IssueGroup } from "../types";

interface Input {
  issueKey: string;
  category: string;
  count: number;
  negativeCount: number;
  negativeRate: number;
  trendDirection: IssueGroup["trendDirection"];
  records: FeedbackRecord[];
}

const CATEGORY_ACTIONS: Record<string, string> = {
  Payments: "Reproduce the failing checkout path and inspect gateway error codes for the same window.",
  Delivery: "Trace the affected orders in carrier tracking and open an SLA review for that lane.",
  "Product quality": "Pull recent QC samples for the mentioned SKU and pause the listing if defects repeat.",
  "Customer service": "Audit the related tickets for wait time, auto-close, and missing follow-up.",
  "App performance": "Capture a session replay or crash report for the named screen and file a defect.",
};

export function recommendForGroup(input: Input): {
  recommendation: string;
  evidenceNote: string;
  suggestedAction: string;
} {
  const excerpts = input.records.slice(0, 2).map((record) => record.text);
  const excerptBit = excerpts.length ? ` Example: “${excerpts[0]?.slice(0, 90)}”` : "";
  const trendBit =
    input.trendDirection === "up"
      ? " Later-dated comments are more common than earlier ones."
      : input.trendDirection === "insufficient"
        ? " Trend is not used because dated history is thin."
        : "";
  const caution =
    input.count < 3
      ? " Only a few records support this group, so treat it as a hypothesis until more comments arrive."
      : "";
  const fromModel = input.records.map((record) => record.suggestedAction).find((value) => value);
  const suggestedAction =
    fromModel ?? CATEGORY_ACTIONS[input.category] ?? "Review the supporting comments and assign an owner.";
  return {
    recommendation: `Investigate ${input.issueKey.replaceAll("-", " ")} using ${input.count} related comments (${input.negativeCount} negative).${caution}`,
    evidenceNote: `${input.negativeRate.toFixed(0)}% of grouped comments are negative.${trendBit}${excerptBit}`,
    suggestedAction,
  };
}
