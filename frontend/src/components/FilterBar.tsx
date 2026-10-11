import { uniqueValues } from "../lib/filters";
import type { Filters, FeedbackRecord } from "../types";

export function FilterBar({
  records,
  filters,
  onChange,
}: {
  records: FeedbackRecord[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  const categories = uniqueValues(records, "category");
  const sources = uniqueValues(records, "source");
  return (
    <div className="grid gap-3 rounded-xl border border-line bg-white p-4 md:grid-cols-2 xl:grid-cols-6">
      <label className="block text-sm xl:col-span-2">
        <span className="mb-1 block text-ink-muted">Search</span>
        <input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Text, issue, or category"
          className="w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-ink-muted">Sentiment</span>
        <select
          value={filters.sentiment}
          onChange={(event) => onChange({ ...filters, sentiment: event.target.value as Filters["sentiment"] })}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="negative">Negative</option>
          <option value="neutral">Neutral</option>
          <option value="positive">Positive</option>
          <option value="unclassified">Unclassified</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-ink-muted">Category</span>
        <select
          value={filters.category}
          onChange={(event) => onChange({ ...filters, category: event.target.value })}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm"
        >
          <option value="all">All</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-ink-muted">Source</span>
        <select
          value={filters.source}
          onChange={(event) => onChange({ ...filters, source: event.target.value })}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm"
        >
          <option value="all">All</option>
          {sources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2 xl:col-span-1 md:col-span-2 xl:col-span-2">
        <label className="block text-sm">
          <span className="mb-1 block text-ink-muted">From</span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-muted">To</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) => onChange({ ...filters, dateTo: event.target.value })}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm"
          />
        </label>
      </div>
    </div>
  );
}
