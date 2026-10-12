import { uniqueValues } from "../lib/filters";
import { EMPTY_FILTERS } from "../types";
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
  const isFiltered =
    filters.search ||
    filters.sentiment !== "all" ||
    filters.category !== "all" ||
    filters.source !== "all" ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="grid gap-3 rounded-2xl border border-line bg-stone/70 p-4 md:grid-cols-2 xl:grid-cols-6">
      <label className="block text-sm xl:col-span-2">
        <span className="mb-1 block text-ink-muted">Search</span>
        <input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Text, issue, or category"
          className="field mt-1"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-ink-muted">Sentiment</span>
        <select
          value={filters.sentiment}
          onChange={(event) => onChange({ ...filters, sentiment: event.target.value as Filters["sentiment"] })}
          className="field mt-1"
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
          className="field mt-1"
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
          className="field mt-1"
        >
          <option value="all">All</option>
          {sources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </label>
      <div className="md:col-span-2 xl:col-span-1 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            <span className="mb-1 block text-ink-muted">From</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })}
              className="field mt-1"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-muted">To</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => onChange({ ...filters, dateTo: event.target.value })}
              className="field mt-1"
            />
          </label>
        </div>
        {isFiltered ? (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
          >
            Reset filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
