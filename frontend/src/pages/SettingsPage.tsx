import { useWorkspace } from "../context/WorkspaceContext";

export function SettingsPage() {
  const { currentWorkspace, health } = useWorkspace();
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="border-b border-line pb-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Workspace</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Settings</h1><p className="mt-2 text-sm text-ink-muted">Current configuration and honest integration status. Secrets are never shown here.</p></header>
      <section className="grid gap-6 md:grid-cols-2">
        <article className="border border-line bg-surface p-5"><h2 className="font-semibold text-ink">Current workspace</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-ink-muted">Name</dt><dd className="font-medium text-ink">{currentWorkspace?.name ?? "Loading workspace…"}</dd></div><div><dt className="text-ink-muted">Scope</dt><dd className="break-all text-ink">Private to your authenticated account</dd></div></dl></article>
        <article className="border border-line bg-surface p-5"><h2 className="font-semibold text-ink">Service status</h2><dl className="mt-4 space-y-3 text-sm"><Status label="Gemini analysis" value={health?.gemini_configured ? "Configured server-side" : "Not configured — demo rules remain available"} /><Status label="Adaption" value={health?.adaption_configured ? "Configured server-side" : "Not configured"} /><Status label="Account" value="Authenticated Supabase workspace" /></dl></article>
      </section>
      <section className="border-l-2 border-[#B98232] bg-[#FFF9EC] p-5"><h2 className="font-semibold text-ink">Data handling</h2><p className="mt-2 text-sm leading-6 text-ink-muted">Persistent feedback and saved issue states are scoped to your authenticated workspace. Sample data remains browser-only until you import it.</p></section>
    </div>
  );
}

function Status({ label, value }: { label: string; value: string }) { return <div><dt className="text-ink-muted">{label}</dt><dd className="mt-1 text-ink">{value}</dd></div>; }
