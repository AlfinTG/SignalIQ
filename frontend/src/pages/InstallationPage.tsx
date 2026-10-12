import { useState } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { submitPublicFeedback } from "../api";
import {
  Check,
  Code2,
  Copy,
  ExternalLink,
  Globe,
  Send,
  Sparkles,
  Terminal,
} from "lucide-react";
import { Link } from "react-router-dom";

export function InstallationPage() {
  const { currentProject, forms, refreshSubmissions } = useWorkspace();

  const [selectedFormId, setSelectedFormId] = useState<string>(forms[0]?.id || "form-default");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [widgetMode, setWidgetMode] = useState<"floating" | "inline">("floating");

  // Live test states
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testFeedbackText, setTestFeedbackText] = useState("Testing the SignalIQ widget integration from installation console.");

  const currentForm = forms.find((f) => f.id === selectedFormId) || forms[0];
  const formId = currentForm?.id || "form-default";
  const origin = window.location.origin;

  const floatingSnippet = `<!-- SignalIQ Feedback Widget (Floating Trigger) -->
<script
  src="${origin}/widget.js"
  data-form="${formId}"
  data-mode="floating"
  data-accent="${currentForm?.accent_color || "#2563EB"}"
  data-text="Feedback"
  async>
</script>`;

  const inlineSnippet = `<!-- SignalIQ Inline Feedback Form -->
<div id="signaliq-feedback-container"></div>
<script
  src="${origin}/widget.js"
  data-form="${formId}"
  data-mode="inline"
  data-target="signaliq-feedback-container"
  async>
</script>`;

  const hostedUrl = `${origin}/f/${formId}`;

  const curlSnippet = `curl -X POST "${origin}/api/public/submit" \\
  -H "Content-Type: application/json" \\
  -d '{
    "form_id": "${formId}",
    "text": "The checkout was fast and simple!",
    "rating": 5,
    "source": "api"
  }'`;

  function copyToClipboard(text: string, key: string) {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  }

  async function handleSendTest() {
    setTestStatus("testing");
    try {
      await submitPublicFeedback({
        form_id: formId,
        text: testFeedbackText,
        rating: 4,
        source: "widget_test",
      });
      setTestStatus("success");
      await refreshSubmissions();
    } catch {
      setTestStatus("error");
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-line pb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
            <Code2 className="h-3.5 w-3.5" />
            Integration & Installation
          </span>
          <span className="text-xs text-ink-muted">· {currentProject?.name}</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Add Feedback Collection to Your Product</h1>
        <p className="mt-1 text-xs text-ink-muted">
          Choose between an embeddable website widget, a direct shareable hosted page, or direct REST API ingestion.
        </p>

        {/* Form Selector */}
        {forms.length > 1 ? (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Select Form to Install:</span>
            <select
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink"
            >
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title} ({f.status})
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {/* Integration Methods Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Method A: Website Widget */}
        <div className="flex flex-col justify-between rounded-xl border border-line bg-white p-6 shadow-sm lg:col-span-2">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Code2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-ink">Method A: Copy-and-Paste Website Widget</h2>
                  <span className="text-[11px] text-ink-muted">Zero build setup · Works on any website or framework</span>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Recommended
              </span>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Widget Mode:</span>
              <button
                type="button"
                onClick={() => setWidgetMode("floating")}
                className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                  widgetMode === "floating"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                Floating Button
              </button>
              <button
                type="button"
                onClick={() => setWidgetMode("inline")}
                className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                  widgetMode === "inline"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                Inline Container
              </button>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              {widgetMode === "floating"
                ? "Adds an unobtrusive floating button to the bottom-right of your pages that smoothly opens a branded feedback modal."
                : "Embeds the feedback form directly inside a container element on your page."}
            </p>

            <div className="relative mt-3 rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono text-xs text-slate-200">
              <pre className="overflow-x-auto">{widgetMode === "floating" ? floatingSnippet : inlineSnippet}</pre>
              <button
                type="button"
                onClick={() => copyToClipboard(widgetMode === "floating" ? floatingSnippet : inlineSnippet, "widget")}
                className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-700"
              >
                {copiedKey === "widget" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedKey === "widget" ? "Copied" : "Copy Snippet"}
              </button>
            </div>
          </div>

          <div className="mt-4 border-t border-line pt-3 text-[11px] text-ink-muted">
            <strong>Placement:</strong> Paste right before the closing <code className="rounded bg-slate-100 px-1 font-mono">&lt;/body&gt;</code> tag on your HTML, React, Next.js, WordPress, or Webflow site.
          </div>
        </div>

        {/* Method B: Hosted Shareable Link */}
        <div className="flex flex-col justify-between rounded-xl border border-line bg-white p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-ink">Method B: Hosted URL</h2>
                <span className="text-[11px] text-ink-muted">Share via email, support or chat</span>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600">
              Collect feedback instantly without touching any code. Send this link to customers or embed it in support tickets.
            </p>

            <div className="mt-4 rounded-xl border border-line bg-slate-50 p-3">
              <span className="block truncate font-mono text-xs text-slate-700">{hostedUrl}</span>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => copyToClipboard(hostedUrl, "hosted")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white py-2 text-xs font-semibold text-ink shadow-sm hover:bg-slate-50"
            >
              {copiedKey === "hosted" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedKey === "hosted" ? "Copied" : "Copy Link"}
            </button>
            <a
              href={hostedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink hover:bg-slate-50"
              title="Open form in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Method C: REST API Ingestion */}
      <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink">Method C: REST API for Custom Software</h2>
            <span className="text-[11px] text-ink-muted">Send feedback programmatically from your backend, mobile app, or CLI</span>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-600">
          Submit JSON payloads directly to <code className="rounded bg-slate-100 px-1 font-mono text-slate-800">POST /api/public/submit</code>. Feedback is stored and analyzed immediately.
        </p>

        <div className="relative mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono text-xs text-slate-200">
          <pre className="overflow-x-auto">{curlSnippet}</pre>
          <button
            type="button"
            onClick={() => copyToClipboard(curlSnippet, "curl")}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-700"
          >
            {copiedKey === "curl" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedKey === "curl" ? "Copied" : "Copy cURL"}
          </button>
        </div>
      </div>

      {/* Live Integration Verification Tool */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <h2 className="text-sm font-bold text-blue-900">Live Integration Verification</h2>
        </div>
        <p className="mt-1 text-xs text-blue-700">
          Send a simulated submission to verify that your form ingestion and AI analysis pipeline is running end-to-end.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={testFeedbackText}
            onChange={(e) => setTestFeedbackText(e.target.value)}
            className="flex-1 min-w-[280px] rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleSendTest}
            disabled={testStatus === "testing"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {testStatus === "testing" ? "Submitting..." : "Send Test Submission"}
          </button>
        </div>

        {testStatus === "success" ? (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-100/70 p-3 text-xs font-medium text-emerald-800">
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4" />
              Submission received and analyzed successfully!
            </span>
            <Link to="/" className="font-semibold underline hover:text-emerald-950">
              View on Dashboard →
            </Link>
          </div>
        ) : null}

        {testStatus === "error" ? (
          <div className="mt-3 rounded-lg bg-rose-100/70 p-3 text-xs font-medium text-rose-800">
            Test submission failed. Check that the backend server is running and form is published.
          </div>
        ) : null}
      </div>
    </div>
  );
}
