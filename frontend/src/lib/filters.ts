import type { FeedbackRecord, Filters } from "../types";

export function applyFilters(records: FeedbackRecord[], filters: Filters): FeedbackRecord[] {
  const search = filters.search.trim().toLowerCase();
  return records.filter((record) => {
    if (search) {
      const haystack = `${record.text} ${record.category} ${record.issueKey} ${record.source}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (filters.sentiment !== "all" && record.sentiment !== filters.sentiment) return false;
    if (filters.category !== "all" && record.category !== filters.category) return false;
    if (filters.source !== "all" && record.source !== filters.source) return false;
    if (filters.dateFrom) {
      if (!record.date || record.date.slice(0, 10) < filters.dateFrom) return false;
    }
    if (filters.dateTo) {
      if (!record.date || record.date.slice(0, 10) > filters.dateTo) return false;
    }
    return true;
  });
}

export function uniqueValues(records: FeedbackRecord[], key: "category" | "source"): string[] {
  return [...new Set(records.map((record) => record[key]).filter(Boolean))].sort();
}
