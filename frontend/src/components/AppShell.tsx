import { Activity, FlaskConical, LayoutDashboard, ListChecks, Menu, MessagesSquare, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/explorer", label: "Feedback Explorer", icon: MessagesSquare },
  { to: "/insights", label: "Insights & Actions", icon: ListChecks },
  { to: "/adaption-lab", label: "Adaption Lab", icon: FlaskConical },
];

export function AppShell() {
  const { notice, error, storageError, health, healthError, analyzeProgress, dismissNotice, dismissError, workspace } =
    useWorkspace();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col bg-navy-950 text-slate-200">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-brand-500" aria-hidden />
          <span className="text-lg font-semibold tracking-tight text-white">SignalIQ</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">Customer Intelligence Platform</p>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Find the signal. Fix the problem.</p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Primary">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <item.icon className="h-4 w-4" aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-2 border-t border-white/10 px-5 py-4 text-xs text-slate-400">
        <p>{workspace.feedback.length} records in this browser</p>
        <p>
          Gemini: {health?.gemini_configured ? "configured" : "not configured"}
          <br />
          Adaption: {health?.adaption_configured ? "configured" : "not configured"}
        </p>
        {workspace.isSampleWorkspace ? <p className="text-amber-200">Demonstration dataset</p> : null}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F8FB] lg:flex">
      <aside className="hidden w-60 shrink-0 lg:block">{sidebar}</aside>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-navy-950/50" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="relative h-full w-64">{sidebar}</div>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2 font-semibold">
            <Activity className="h-4 w-4 text-brand-600" /> SignalIQ
          </div>
          <button type="button" className="rounded-md p-2" onClick={() => setOpen((value) => !value)} aria-label="Open menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>
        <div className="space-y-2 px-4 pt-4 lg:px-8">
          {storageError ? <Banner tone="warn">{storageError}</Banner> : null}
          {healthError ? <Banner tone="warn">{healthError}</Banner> : null}
          {notice ? (
            <Banner tone="info" onDismiss={dismissNotice}>
              {notice}
            </Banner>
          ) : null}
          {error ? (
            <Banner tone="error" onDismiss={dismissError}>
              {error}
            </Banner>
          ) : null}
          {analyzeProgress.active ? (
            <Banner tone="info">
              {analyzeProgress.message} {analyzeProgress.processed}/{analyzeProgress.total}
            </Banner>
          ) : null}
        </div>
        <main className="flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Banner({
  children,
  tone,
  onDismiss,
}: {
  children: ReactNode;
  tone: "info" | "warn" | "error";
  onDismiss?: () => void;
}) {
  const cls =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-brand-100 bg-brand-50 text-slate-800";
  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${cls}`}>
      <p>{children}</p>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} className="shrink-0 text-xs font-medium">
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
