import type { AnalysisMode, Sentiment, Severity } from "../types";

const sentimentClass: Record<Sentiment, string> = {
  positive: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  negative: "bg-rose-50 text-rose-800 ring-rose-200",
  unclassified: "bg-amber-50 text-amber-800 ring-amber-200",
};

const severityClass: Record<Severity, string> = {
  high: "bg-rose-50 text-rose-800 ring-rose-200",
  medium: "bg-amber-50 text-amber-800 ring-amber-200",
  low: "bg-slate-100 text-slate-700 ring-slate-200",
  unknown: "bg-slate-50 text-slate-600 ring-slate-200",
};

export function SentimentBadge({ value }: { value: Sentiment }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${sentimentClass[value]}`}>
      {value}
    </span>
  );
}

export function SeverityBadge({ value }: { value: Severity }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${severityClass[value]}`}>
      {value}
    </span>
  );
}

export function PriorityBadge({ value }: { value: "High" | "Medium" | "Low" }) {
  const cls =
    value === "High"
      ? "bg-rose-50 text-rose-800 ring-rose-200"
      : value === "Medium"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {value} priority
    </span>
  );
}

export function ModeBadge({ value }: { value: AnalysisMode }) {
  const label = value === "live-ai" ? "Live AI" : value === "demo-rules" ? "Demo analysis" : "Not analyzed";
  const cls =
    value === "live-ai"
      ? "bg-brand-50 text-brand-700 ring-brand-100"
      : value === "demo-rules"
        ? "bg-violet-50 text-violet-800 ring-violet-200"
        : "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {label}
    </span>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const cls =
    value === "Resolved"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : value === "In progress"
        ? "bg-brand-50 text-brand-700 ring-brand-100"
        : "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {value}
    </span>
  );
}
