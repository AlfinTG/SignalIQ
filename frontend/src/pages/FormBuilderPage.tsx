import { useState, useEffect } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { createProjectForm, updateForm, toggleFormPublish, ApiError } from "../api";
import type { FeedbackForm, FormField } from "../types";
import {
  Check,
  Code,
  ExternalLink,
  Eye,
  Layers,
  Save,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";

const TEMPLATES: Record<
  string,
  {
    title: string;
    description: string;
    fields: FormField[];
    accent: string;
    submitText: string;
  }
> = {
  general: {
    title: "Website & Product Feedback",
    description: "Tell us what you love or what we can do better.",
    accent: "#2563EB",
    submitText: "Send Feedback",
    fields: [
      { id: "category", type: "category", label: "Topic", required: false, options: ["Payments", "Delivery", "Product Quality", "Customer Support", "App Speed", "Other"] },
      { id: "text", type: "textarea", label: "Your feedback", required: true, placeholder: "Describe your experience or suggestion..." },
      { id: "rating", type: "rating", label: "Overall rating", required: false },
      { id: "email", type: "email", label: "Email (optional)", required: false, placeholder: "you@example.com" },
    ],
  },
  bug_report: {
    title: "Report an Issue or Bug",
    description: "Spotted a problem? Help us reproduce and fix it.",
    accent: "#DC2626",
    submitText: "Submit Bug Report",
    fields: [
      { id: "category", type: "category", label: "Component", required: true, options: ["Checkout", "Account & Login", "Navigation", "Performance", "Mobile View"] },
      { id: "text", type: "textarea", label: "What happened?", required: true, placeholder: "What were you doing, and what went wrong?" },
      { id: "email", type: "email", label: "Your email for updates", required: false, placeholder: "you@example.com" },
    ],
  },
  feature_request: {
    title: "Suggest a New Feature",
    description: "What capability would make this product indispensable for you?",
    accent: "#7C3AED",
    submitText: "Submit Idea",
    fields: [
      { id: "feature_name", type: "text", label: "Feature Name / Summary", required: true, placeholder: "e.g., Export to CSV, Apple Pay integration" },
      { id: "text", type: "textarea", label: "Why is this important to you?", required: true, placeholder: "Describe the workflow or problem this solves..." },
      { id: "email", type: "email", label: "Email for early access", required: false, placeholder: "you@example.com" },
    ],
  },
  csat: {
    title: "Customer Satisfaction Survey",
    description: "How satisfied are you with our service today?",
    accent: "#059669",
    submitText: "Submit Rating",
    fields: [
      { id: "rating", type: "rating", label: "Rate your overall experience", required: true },
      { id: "text", type: "textarea", label: "Any comments or details?", required: false, placeholder: "Share any thoughts on what we did well or could improve..." },
    ],
  },
};

const COLOR_PRESETS = ["#2563EB", "#7C3AED", "#059669", "#DC2626", "#D97706", "#0F172A"];

export function FormBuilderPage() {
  const { currentProject, forms, refreshForms } = useWorkspace();

  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [title, setTitle] = useState("Website & Product Feedback");
  const [description, setDescription] = useState("Tell us what you love or what we can do better.");
  const [fields, setFields] = useState<FormField[]>(TEMPLATES.general!.fields);
  const [accentColor, setAccentColor] = useState("#2563EB");
  const [submitText, setSubmitText] = useState("Send Feedback");
  const [successMessage, setSuccessMessage] = useState("Thank you for your feedback!");
  const [status, setStatus] = useState<"draft" | "published">("published");

  const [previewMode, setPreviewMode] = useState<"widget" | "hosted" | "mobile">("widget");
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form selection
  useEffect(() => {
    if (forms.length > 0 && !selectedFormId) {
      const active = forms[0];
      if (active) {
        setSelectedFormId(active.id);
        loadFormData(active);
      }
    }
  }, [forms, selectedFormId]);

  function loadFormData(f: FeedbackForm) {
    setTitle(f.title);
    setDescription(f.description || "");
    setFields(f.fields || []);
    setAccentColor(f.accent_color || "#2563EB");
    setSubmitText(f.submit_text || "Send Feedback");
    setSuccessMessage(f.success_message || "Thank you for your feedback!");
    setStatus(f.status === "published" ? "published" : "draft");
  }

  function handleSelectForm(id: string) {
    setSelectedFormId(id);
    const target = forms.find((f) => f.id === id);
    if (target) loadFormData(target);
  }

  function applyTemplate(templateKey: string) {
    const tmpl = TEMPLATES[templateKey];
    if (!tmpl) return;
    setTitle(tmpl.title);
    setDescription(tmpl.description);
    setFields([...tmpl.fields]);
    setAccentColor(tmpl.accent);
    setSubmitText(tmpl.submitText);
  }

  async function handleSave() {
    if (!currentProject) return;
    setSaving(true);
    setError(null);
    try {
      if (selectedFormId) {
        await updateForm(selectedFormId, {
          title,
          description,
          fields,
          accent_color: accentColor,
          submit_text: submitText,
          success_message: successMessage,
          status,
        });
      } else {
        const created = await createProjectForm(currentProject.id, {
          title,
          description,
          fields,
          accent_color: accentColor,
          submit_text: submitText,
          success_message: successMessage,
        });
        setSelectedFormId(created.id);
      }
      await refreshForms();
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save form.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish() {
    if (!selectedFormId) return;
    try {
      const updated = await toggleFormPublish(selectedFormId);
      setStatus(updated.status === "published" ? "published" : "draft");
      await refreshForms();
    } catch {
      /* ignore */
    }
  }

  function addField(type: FormField["type"]) {
    const id = `field_${Date.now()}`;
    const labels: Record<string, string> = {
      text: "Additional Question",
      textarea: "Detailed Message",
      rating: "Rating Scale",
      category: "Category Topic",
      email: "Contact Email",
    };
    const newField: FormField = {
      id,
      type,
      label: labels[type] || "Question",
      required: false,
      placeholder: "",
      options: type === "category" ? ["Option 1", "Option 2", "Option 3"] : undefined,
    };
    setFields([...fields, newField]);
  }

  function removeField(id: string) {
    setFields(fields.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              <Layers className="h-3.5 w-3.5" />
              Form Builder
            </span>
            <span className="text-xs text-ink-muted">· {currentProject?.name}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Design & Configure Feedback Forms</h1>
          <p className="mt-1 text-xs text-ink-muted">
            Configure questions, branding, and response actions. Changes update live in the preview pane.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {selectedFormId ? (
            <button
              type="button"
              onClick={handleTogglePublish}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                status === "published"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {status === "published" ? "● Form Published (Live)" : "○ Draft Mode"}
            </button>
          ) : null}

          {selectedFormId && status === "published" ? (
            <a
              href={`/f/${selectedFormId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-medium text-ink hover:bg-slate-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Hosted Form
            </a>
          ) : null}

          <Link
            to="/installation"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-medium text-ink hover:bg-slate-50"
          >
            <Code className="h-3.5 w-3.5" />
            Get Embed Snippet
          </Link>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {savedBanner ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
          <Check className="h-4 w-4" />
          Form settings saved successfully! Live installations are instantly updated.
        </div>
      ) : null}

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">{error}</div> : null}

      {/* Main Builder Grid: Editor (Left) & Preview (Right) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Editor Controls (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Form Selector & Starter Templates Card */}
          <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">Active Form</label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedFormId}
                  onChange={(e) => handleSelectForm(e.target.value)}
                  className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink"
                >
                  {forms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title} ({f.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                <span>Load Starter Template</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { key: "general", label: "General Feedback" },
                  { key: "bug_report", label: "Bug Report" },
                  { key: "feature_request", label: "Feature Request" },
                  { key: "csat", label: "CSAT / Rating" },
                ].map((tmpl) => (
                  <button
                    key={tmpl.key}
                    type="button"
                    onClick={() => applyTemplate(tmpl.key)}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-left text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50/50"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form Content & Branding Configuration */}
          <div className="space-y-4 rounded-xl border border-line bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-ink">Branding & Text</h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Form Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Introductory Subtitle</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Brand Accent Color</label>
                <div className="mt-1.5 flex items-center gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAccentColor(color)}
                      style={{ backgroundColor: color }}
                      className={`h-7 w-7 rounded-full border-2 transition ${
                        accentColor === color ? "border-slate-800 scale-110 shadow-sm" : "border-transparent"
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-7 w-8 cursor-pointer rounded border border-line p-0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Submit Button Label</label>
                <input
                  type="text"
                  value={submitText}
                  onChange={(e) => setSubmitText(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Success Confirmation Message</label>
              <input
                type="text"
                value={successMessage}
                onChange={(e) => setSuccessMessage(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Form Fields Configuration */}
          <div className="space-y-4 rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">Form Fields & Questions</h2>
              <div className="flex items-center gap-1">
                <span className="text-xs text-ink-muted">Add Field:</span>
                <button
                  type="button"
                  onClick={() => addField("category")}
                  className="rounded-md border border-line px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  + Topic
                </button>
                <button
                  type="button"
                  onClick={() => addField("rating")}
                  className="rounded-md border border-line px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  + Rating
                </button>
                <button
                  type="button"
                  onClick={() => addField("text")}
                  className="rounded-md border border-line px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  + Short Text
                </button>
                <button
                  type="button"
                  onClick={() => addField("email")}
                  className="rounded-md border border-line px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  + Email
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {fields.map((f, idx) => (
                <div key={f.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                        {f.type}
                      </span>
                      <input
                        type="text"
                        value={f.label}
                        onChange={(e) => {
                          const updated = [...fields];
                          const target = updated[idx];
                          if (target) {
                            target.label = e.target.value;
                            setFields(updated);
                          }
                        }}
                        className="flex-1 rounded border border-line bg-white px-2 py-1 text-xs font-semibold text-ink"
                      />
                      <label className="flex items-center gap-1 text-[11px] text-slate-600">
                        <input
                          type="checkbox"
                          checked={f.required}
                          onChange={(e) => {
                            const updated = [...fields];
                            const target = updated[idx];
                            if (target) {
                              target.required = e.target.checked;
                              setFields(updated);
                            }
                          }}
                        />
                        Required
                      </label>
                    </div>

                    {f.type === "category" ? (
                      <div className="text-[11px] text-slate-500">
                        <span>Choices: {f.options?.join(", ") || "None"}</span>
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeField(f.id)}
                    className="p-1 text-slate-400 transition hover:text-rose-600"
                    title="Remove field"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Interactive Preview (5 cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 rounded-xl border border-line bg-white shadow-sm">
            {/* Preview Toolbar */}
            <div className="flex items-center justify-between border-b border-line bg-slate-50 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-700">Live Form Preview</span>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewMode("widget")}
                  className={`rounded px-2 py-1 text-[11px] font-medium transition ${
                    previewMode === "widget" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Floating
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("hosted")}
                  className={`rounded px-2 py-1 text-[11px] font-medium transition ${
                    previewMode === "hosted" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Hosted
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("mobile")}
                  className={`rounded px-2 py-1 text-[11px] font-medium transition ${
                    previewMode === "mobile" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Smartphone className="inline h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Simulated Frame */}
            <div className={`p-4 ${previewMode === "hosted" ? "bg-slate-100" : "bg-slate-50/60"}`}>
              <div
                className={`mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition-all ${
                  previewMode === "mobile" ? "max-w-[320px]" : "max-w-md"
                }`}
              >
                {/* Simulated Header */}
                <div className="border-b border-slate-100 p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Feedback Form</span>
                  </div>
                  <h3 className="mt-1 text-base font-bold text-slate-900">{title}</h3>
                  {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
                </div>

                {/* Simulated Form Body */}
                <div className="space-y-3.5 p-4 text-xs">
                  {fields.map((field) => (
                    <div key={field.id} className="space-y-1">
                      <label className="block font-semibold text-slate-700">
                        {field.label} {field.required ? <span className="text-rose-500">*</span> : null}
                      </label>

                      {field.type === "category" ? (
                        <select className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800">
                          {field.options?.map((opt) => (
                            <option key={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : null}

                      {field.type === "rating" ? (
                        <div className="flex items-center gap-1.5 py-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className="h-5 w-5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      ) : null}

                      {field.type === "textarea" ? (
                        <textarea
                          rows={3}
                          placeholder={field.placeholder || "Enter your feedback..."}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800"
                        />
                      ) : null}

                      {field.type === "text" || field.type === "email" ? (
                        <input
                          type={field.type}
                          placeholder={field.placeholder || ""}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800"
                        />
                      ) : null}
                    </div>
                  ))}

                  <button
                    type="button"
                    style={{ backgroundColor: accentColor }}
                    className="mt-2 w-full rounded-lg py-2.5 text-xs font-semibold text-white shadow-sm"
                  >
                    {submitText}
                  </button>

                  <div className="pt-2 text-center text-[10px] text-slate-400">Powered by SignalIQ</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
