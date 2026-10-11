export type Sentiment = "positive" | "neutral" | "negative" | "unclassified";
export type Severity = "low" | "medium" | "high" | "unknown";
export type AnalysisMode = "live-ai" | "demo-rules" | "unclassified";
export type IssueStatus = "Open" | "In progress" | "Resolved";
export type SourceLabel = "review" | "survey" | "support" | "imported" | "manual";

export interface FeedbackRecord {
  id: string;
  text: string;
  source: string;
  date: string | null;
  rating: number | null;
  sentiment: Sentiment;
  category: string;
  issueKey: string;
  severity: Severity;
  confidence: number | null;
  analysisReason: string;
  suggestedAction: string | null;
  analysisMode: AnalysisMode;
  analyzedAt: string | null;
  isSample: boolean;
}

export interface IssueState {
  issueKey: string;
  status: IssueStatus;
  saved: boolean;
  updatedAt: string;
}

export interface Workspace {
  version: 1;
  feedback: FeedbackRecord[];
  issues: Record<string, IssueState>;
  isSampleWorkspace: boolean;
}

export interface Filters {
  search: string;
  sentiment: Sentiment | "all";
  category: string | "all";
  source: string | "all";
  dateFrom: string;
  dateTo: string;
}

export interface TrendPoint {
  date: string;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
}

export interface IssueGroup {
  issueKey: string;
  title: string;
  category: string;
  records: FeedbackRecord[];
  count: number;
  negativeCount: number;
  negativeRate: number;
  frequencyScore: number;
  negativeScore: number;
  trendScore: number | null;
  severityScore: number;
  priorityScore: number;
  priorityLabel: "High" | "Medium" | "Low";
  trendDirection: "up" | "down" | "flat" | "insufficient";
  trendNote: string;
  recommendation: string;
  evidenceNote: string;
  suggestedAction: string;
}

export interface CsvParseResult {
  records: FeedbackRecord[];
  accepted: number;
  rejected: Array<{ row: number; reason: string }>;
  skippedEmpty: number;
  textColumn: string;
  ambiguousTextColumns: string[];
  needsMapping: boolean;
  headers: string[];
}

export interface HealthStatus {
  ok: boolean;
  service: string;
  version: string;
  environment: string;
  gemini_configured: boolean;
  adaption_configured: boolean;
  max_analysis_rows: number;
  gemini_model: string | null;
}

export interface AnalyzeApiItem {
  id: string;
  sentiment: "positive" | "neutral" | "negative";
  category: string;
  issue_key: string;
  summary: string;
  severity: "low" | "medium" | "high";
  confidence: number | null;
  explanation: string;
  suggested_action: string | null;
}

export const EMPTY_FILTERS: Filters = {
  search: "",
  sentiment: "all",
  category: "all",
  source: "all",
  dateFrom: "",
  dateTo: "",
};
