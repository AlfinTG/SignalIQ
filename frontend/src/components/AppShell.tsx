import {
  Activity,
  Compass,
  FlaskConical,
  FolderGit2,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessagesSquare,
  Settings,
  FileText,
  LogOut,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/explorer", label: "Feedback", icon: MessagesSquare },
  { to: "/insights", label: "Insights", icon: Compass },
  { to: "/priorities", label: "Priorities & Actions", icon: ListChecks },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/quality", label: "Data Quality", icon: FlaskConical },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const { signOut } = useAuth();
  const {
    notice,
    error,
    storageError,
    health,
    healthError,
    analyzeProgress,
    dismissNotice,
    dismissError,
    workspace,
    currentWorkspace,
  } = useWorkspace();

  const [open, setOpen] = useState(false);
  const sidebar = (
    <div className="flex h-full flex-col border-r border-white/10 bg-brand-600 text-stone-100">
      {/* Brand Header */}
      <div className="border-b border-white/10 px-5 py-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-citrus text-brand-700"><Activity className="h-4 w-4" aria-hidden /></span>
          <span className="text-lg font-bold tracking-tight text-white">SignalIQ</span>
        </div>
        <p className="mt-0.5 text-xs text-stone-300">Customer Intelligence Platform</p>
        <p className="mt-1 text-[11px] leading-relaxed text-stone-400">Find the signal. Fix the problem.</p>

        {/* Authenticated workspace */}
        <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between text-[11px] font-semibold text-stone-300">
            <span>ACTIVE WORKSPACE</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <FolderGit2 className="h-4 w-4 shrink-0 text-citrus" />
            <span className="w-full truncate text-xs font-semibold text-white">{currentWorkspace?.name ?? "Loading workspace…"}</span>
          </div>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Primary">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive ? "bg-citrus text-brand-700 font-bold shadow-sm" : "text-stone-200 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <item.icon className="h-4 w-4" aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* System Status Footer */}
      <div className="space-y-2 border-t border-white/10 px-5 py-4 text-xs text-stone-300">
        <p className="font-medium text-stone-100">{workspace.feedback.length} submissions loaded</p>
        <p className="text-[11px] leading-relaxed">
          AI: {health?.gemini_configured ? "Gemini Live" : "Demo Rules"}
          <br />
          Adaption: {health?.adaption_configured ? "Active" : "Not configured"}
        </p>
        {workspace.isSampleWorkspace ? (
          <p className="rounded-lg bg-citrus/15 px-2 py-1 text-[11px] text-citrus">Sample Dataset</p>
        ) : null}
        <button type="button" onClick={() => void signOut()} className="flex min-h-9 w-full items-center gap-2 rounded-lg pt-1 text-left text-[11px] font-semibold text-stone-200 hover:text-white">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#252B27]/50"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-64">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2 font-bold text-ink">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-citrus text-brand-700"><Activity className="h-4 w-4" /></span> SignalIQ
          </div>
          <button
            type="button"
            className="rounded-md p-2"
            onClick={() => setOpen((value) => !value)}
            aria-label="Open menu"
          >
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

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
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
      ? "border-[#E8795B]/40 bg-[#FFF0EC] text-[#7A321F]"
      : tone === "warn"
        ? "border-amber/30 bg-[#FFF8E8] text-[#6E4C12]"
        : "border-brand-100 bg-brand-50 text-brand-700";
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
