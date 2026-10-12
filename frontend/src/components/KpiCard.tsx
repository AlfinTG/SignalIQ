export function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="panel p-4">
      <p className="metric-label">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-ink">{value}</p>
      {hint ? <p className="mt-1 text-sm text-ink-muted">{hint}</p> : null}
    </article>
  );
}
