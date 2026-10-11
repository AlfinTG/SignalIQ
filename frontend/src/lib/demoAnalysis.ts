import type { FeedbackRecord, Sentiment, Severity } from "../types";

interface Rule {
  issueKey: string;
  category: string;
  keywords: string[];
  severity: Severity;
  sentimentHint?: Sentiment;
}

const RULES: Rule[] = [
  { issueKey: "duplicate-checkout-charge", category: "Payments", keywords: ["charged twice", "duplicate charge", "paid again"], severity: "high" },
  { issueKey: "wallet-payment-failure", category: "Payments", keywords: ["apple pay", "google pay", "wallet"], severity: "high" },
  { issueKey: "upi-pending-hang", category: "Payments", keywords: ["upi"], severity: "high" },
  { issueKey: "card-authorization-failure", category: "Payments", keywords: ["card", "visa", "debit", "payment failed", "payment unsuccessful"], severity: "high" },
  { issueKey: "slow-refund", category: "Payments", keywords: ["refund"], severity: "high" },
  { issueKey: "promo-code-mismatch", category: "Payments", keywords: ["promo", "discount code", "coupon"], severity: "medium" },
  { issueKey: "late-delivery", category: "Delivery", keywords: ["late", "delayed", "still waiting", "arrived on day"], severity: "high" },
  { issueKey: "false-delivered", category: "Delivery", keywords: ["marked delivered", "missing"], severity: "high" },
  { issueKey: "wrong-item-shipped", category: "Delivery", keywords: ["wrong size", "wrong item"], severity: "high" },
  { issueKey: "poor-package-handling", category: "Delivery", keywords: ["damaged", "soaked", "rain"], severity: "high" },
  { issueKey: "fabric-quality", category: "Product quality", keywords: ["pilled", "fabric", "cheap"], severity: "medium" },
  { issueKey: "zipper-failure", category: "Product quality", keywords: ["zipper"], severity: "high" },
  { issueKey: "doa-accessory", category: "Product quality", keywords: ["dead on arrival", "charger"], severity: "high" },
  { issueKey: "slow-support-response", category: "Customer service", keywords: ["waited", "chat", "no one", "closed the chat"], severity: "medium" },
  { issueKey: "missed-follow-up", category: "Customer service", keywords: ["called back", "follow"], severity: "high" },
  { issueKey: "checkout-freeze", category: "App performance", keywords: ["freezes", "freeze", "spinner"], severity: "high" },
  { issueKey: "coupon-crash-android", category: "App performance", keywords: ["crash", "android"], severity: "high" },
  { issueKey: "stale-search-results", category: "App performance", keywords: ["search", "slow"], severity: "medium" },
];

const POSITIVE = ["love", "excellent", "happy", "smooth", "comfortable", "instant", "sorted", "premium", "great"];
const NEGATIVE = ["fail", "failed", "late", "crash", "missing", "damaged", "slow", "never", "unusable", "angry", "worst"];

function sentimentFor(text: string, hint?: Sentiment): Sentiment {
  const lower = text.toLowerCase();
  const pos = POSITIVE.filter((word) => lower.includes(word)).length;
  const neg = NEGATIVE.filter((word) => lower.includes(word)).length;
  if (hint) return hint;
  if (neg > pos) return "negative";
  if (pos > neg) return "positive";
  if (neg === 0 && pos === 0) return "neutral";
  return "neutral";
}

export function demoAnalyzeRecord(record: FeedbackRecord): FeedbackRecord {
  const lower = record.text.toLowerCase();
  const match = RULES.find((rule) => rule.keywords.some((keyword) => lower.includes(keyword)));
  const sentiment = sentimentFor(record.text, match && lower.match(/fail|late|crash|missing|damaged/) ? "negative" : undefined);
  const category = match?.category ?? "Other";
  const issueKey = match?.issueKey ?? `${category.toLowerCase().replaceAll(" ", "-")}-general`;
  const severity: Severity = match?.severity ?? (sentiment === "negative" ? "medium" : "low");
  const hits = match ? match.keywords.filter((keyword) => lower.includes(keyword)).length : 0;
  return {
    ...record,
    sentiment,
    category,
    issueKey,
    severity,
    confidence: Math.min(0.78, 0.52 + hits * 0.08),
    analysisReason: match
      ? `Demo rules matched “${match.keywords.find((keyword) => lower.includes(keyword))}” in the comment.`
      : "Demo rules found no specific pattern; classified from general wording.",
    suggestedAction: match
      ? `Investigate ${match.issueKey.replaceAll("-", " ")} using this comment as evidence.`
      : "Read the comment and assign a more specific issue after review.",
    analysisMode: "demo-rules",
    analyzedAt: new Date().toISOString(),
  };
}

export function demoAnalyzeMany(records: FeedbackRecord[]): FeedbackRecord[] {
  return records.map(demoAnalyzeRecord);
}
