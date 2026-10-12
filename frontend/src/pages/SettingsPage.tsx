import { Link } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";

export function SettingsPage() {
  const { currentProject, health } = useWorkspace();
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="border-b border-line pb-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Workspace</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Settings</h1><p className="mt-2 text-sm text-ink-muted">Current configuration and honest integration status. Secrets are never shown here.</p></header>
      <section className="grid gap-6 md:grid-cols-2">
        <article className="border border-line bg-surface p-5"><h2 className="font-semibold text-ink">Current project</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-ink-muted">Name</dt><dd className="font-medium text-ink">{currentProject?.name ?? "Loading project…"}</dd></div><div><dt className="text-ink-muted">Website</dt><dd className="break-all text-ink">{currentProject?.url || "Not configured"}</dd></div></dl><Link to="/builder" className="mt-5 inline-block text-sm font-semibold text-brand-700 hover:text-brand-600">Manage feedback form →</Link></article>
        <article className="border border-line bg-surface p-5"><h2 className="font-semibold text-ink">Service status</h2><dl className="mt-4 space-y-3 text-sm"><Status label="Gemini analysis" value={health?.gemini_configured ? "Configured server-side" : "Not configured — demo rules remain available"} /><Status label="Adaption" value={health?.adaption_configured ? "Configured server-side" : "Not configured"} /><Status label="Account" value="Authentication is planned for Phase 3; this local prototype is not a private account." /></dl></article>
      </section>
      <section className="border-l-2 border-[#B98232] bg-[#FFF9EC] p-5"><h2 className="font-semibold text-ink">Data handling limitation</h2><p className="mt-2 text-sm leading-6 text-ink-muted">Local sample/import state may be stored in this browser and the current backend is not yet account-isolated. Do not treat this environment as a multi-user production workspace.</p></section>
    </div>
  );
}

function Status({ label, value }: { label: string; value: string }) { return <div><dt className="text-ink-muted">{label}</dt><dd className="mt-1 text-ink">{value}</dd></div>; }
