import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Code2,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react";

export function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-16 py-6 font-sans">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-white via-[#F8F7F1] to-brand-50/40 p-8 text-center shadow-card md:p-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/70 px-3 py-1 text-xs font-semibold text-brand-700">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Real-World Customer Intelligence Platform</span>
        </div>

        <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-ink md:text-5xl">
          Collect customer feedback. <br className="hidden sm:inline" />
          <span className="text-brand-600">Let AI find the signal</span> and fix the problem.
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted md:text-base">
          Embed an unobtrusive feedback widget on your website with one line of code. SignalIQ automatically clusters incoming submissions into recurring issues, calculates evidence-backed priority scores, and guides your team on what to fix first.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <span>Launch Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            to="/builder"
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-sm font-semibold text-ink shadow-sm transition hover:bg-slate-50"
          >
            <Layers className="h-4 w-4 text-brand-600" />
            <span>Customize Feedback Form</span>
          </Link>

          <Link
            to="/installation"
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-sm font-semibold text-ink shadow-sm transition hover:bg-slate-50"
          >
            <Code2 className="h-4 w-4 text-slate-600" />
            <span>View Widget Snippet</span>
          </Link>
        </div>

        {/* Feature Badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 border-t border-line/60 pt-6 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Zero website rebuild required
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Server-side SQLite persistence
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Gemini AI with deterministic fallback
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Transparent priority scoring
          </span>
        </div>
      </div>

      {/* 4-Step Bento Pipeline */}
      <div>
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600">The Complete Journey</span>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">From Embedded Collection to Business Action</h2>
          <p className="mt-1 text-xs text-ink-muted">Everything you need to turn customer feedback into high-leverage product decisions.</p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Step 1 */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm transition hover:border-brand-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Layers className="h-5 w-5" />
            </div>
            <span className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-brand-600">Step 1 · Builder</span>
            <h3 className="mt-1 text-base font-bold text-ink">Design Branded Forms</h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Use pre-built templates for general feedback, bug reports, feature requests, or CSAT surveys. Configure custom questions and colors with a live preview.
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm transition hover:border-brand-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Code2 className="h-5 w-5" />
            </div>
            <span className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-emerald-600">Step 2 · Installation</span>
            <h3 className="mt-1 text-base font-bold text-ink">1-Line Widget Embed</h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Paste a lightweight asynchronous script into your website. Supports floating pills, inline embeds, shareable hosted links, and direct REST APIs.
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm transition hover:border-brand-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Cpu className="h-5 w-5" />
            </div>
            <span className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-violet-600">Step 3 · Ingestion</span>
            <h3 className="mt-1 text-base font-bold text-ink">Automated AI Analysis</h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Incoming submissions are persisted immediately, redacted for PII, and classified for sentiment, category, severity, and normalized recurring issue key.
            </p>
          </div>

          {/* Step 4 */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm transition hover:border-brand-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <span className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-amber-600">Step 4 · Action</span>
            <h3 className="mt-1 text-base font-bold text-ink">Prioritize & Track Fixes</h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Rank issues using a 40/30/20/10 priority formula. Assign team members, track resolution statuses, and export print-ready stakeholder reports.
            </p>
          </div>
        </div>
      </div>

      {/* Two Users Comparison */}
      <div className="rounded-3xl border border-line bg-white p-8 shadow-sm">
        <h2 className="text-center text-xl font-bold text-ink">Built for Both Sides of the Feedback Loop</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-6">
            <span className="inline-block rounded-md bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700">
              User A: The Product Owner
            </span>
            <h3 className="mt-2 text-base font-bold text-ink">Executive & Engineering Dashboard</h3>
            <ul className="mt-3 space-y-2 text-xs text-slate-700">
              <li className="flex items-center gap-2">✓ No custom backend or machine-learning pipeline to maintain</li>
              <li className="flex items-center gap-2">✓ High-priority issue alerts grounded in actual customer quotes</li>
              <li className="flex items-center gap-2">✓ Track actions from identification to resolution</li>
              <li className="flex items-center gap-2">✓ Separate projects for multiple websites or applications</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
            <span className="inline-block rounded-md bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-800">
              User B: Your End User
            </span>
            <h3 className="mt-2 text-base font-bold text-ink">Clean, Fast & Unobtrusive Experience</h3>
            <ul className="mt-3 space-y-2 text-xs text-slate-700">
              <li className="flex items-center gap-2">✓ Loads in milliseconds without blocking the host website</li>
              <li className="flex items-center gap-2">✓ Matches your brand accent and visual identity</li>
              <li className="flex items-center gap-2">✓ Never forces end users to create an account</li>
              <li className="flex items-center gap-2">✓ Immediate submission confirmation and validation feedback</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
