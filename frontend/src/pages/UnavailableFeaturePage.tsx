import { Link } from "react-router-dom";

export function UnavailableFeaturePage() {
  return <main className="mx-auto max-w-2xl p-6"><section className="border border-line bg-surface p-7 shadow-card"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Availability notice</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">This workflow is not available yet</h1><p className="mt-3 text-sm leading-6 text-ink-muted">SignalIQ has retired the prototype endpoint behind this feature because it did not meet account-isolation and durability requirements. It will return only after it is rebuilt on the authenticated, persistent API.</p><p className="mt-3 text-sm leading-6 text-ink-muted">This is not a completed Adaption run, form-management action, or data export.</p><Link to="/" className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Return to overview</Link></section></main>;
}
