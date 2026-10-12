import { useEffect, useState, type FormEvent } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { fetchPublicForm, submitPublicFeedback, ApiError } from "../api";
import type { FeedbackForm } from "../types";
import { CheckCircle2, MessageSquare, Star } from "lucide-react";

export function PublicFormPage() {
  const { formId } = useParams<{ formId: string }>();
  const [searchParams] = useSearchParams();
  const isEmbed = searchParams.get("embed") === "1";

  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form inputs state
  const [text, setText] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [category, setCategory] = useState("");
  const [email, setEmail] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!formId) {
      setError("No form ID provided.");
      setLoading(false);
      return;
    }
    fetchPublicForm(formId)
      .then((data) => {
        setForm(data);
        const catField = data.fields.find((f) => f.type === "category");
        if (catField && catField.options && catField.options.length > 0) {
          setCategory(catField.options[0] || "");
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Unable to load feedback form.");
        setLoading(false);
      });
  }, [formId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formId || !form) return;
    if (text.trim().length < 3) {
      setError("Please provide at least 3 characters of feedback.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payloadCustomData: Record<string, unknown> = { ...customFields };
    if (category) payloadCustomData.category = category;
    if (email) payloadCustomData.email = email;

    try {
      const res = await submitPublicFeedback({
        form_id: formId,
        text: text.trim(),
        rating,
        source: isEmbed ? "widget" : "hosted",
        custom_data: payloadCustomData,
      });
      setSubmitted(true);
      setSuccessMessage(res.message || form.success_message || "Thank you for your feedback!");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const accent = form?.accent_color || "#2563EB";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans text-slate-600">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          <span className="text-sm font-medium">Loading feedback form…</span>
        </div>
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-800">Feedback Form Unavailable</h2>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={`flex min-h-screen items-center justify-center font-sans ${isEmbed ? "bg-white p-4" : "bg-slate-50 p-6"}`}>
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">Feedback Received</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{successMessage}</p>
          <button
            type="button"
            onClick={() => {
              setText("");
              setRating(null);
              setEmail("");
              setSubmitted(false);
            }}
            style={{ backgroundColor: accent }}
            className="mt-6 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            Send Another Response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen items-center justify-center font-sans ${isEmbed ? "bg-white p-3" : "bg-slate-50 p-4 md:p-8"}`}>
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Feedback Form</span>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{form?.title}</h1>
          {form?.description ? <p className="mt-1 text-sm text-slate-500">{form.description}</p> : null}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Category selection if in fields */}
          {form?.fields.some((f) => f.type === "category") ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Topic</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {form.fields
                  .find((f) => f.type === "category")
                  ?.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
              </select>
            </div>
          ) : null}

          {/* Rating */}
          {form?.fields.some((f) => f.type === "rating") ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Overall Rating</label>
              <div className="mt-2 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((starVal) => {
                  const isFilled = rating !== null && rating >= starVal;
                  return (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => setRating(starVal)}
                      className="group p-1 transition hover:scale-110"
                      aria-label={`${starVal} stars`}
                    >
                      <Star
                        className={`h-7 w-7 transition ${
                          isFilled ? "fill-amber-400 text-amber-400" : "text-slate-300 group-hover:text-amber-300"
                        }`}
                      />
                    </button>
                  );
                })}
                {rating ? <span className="ml-2 text-xs font-semibold text-slate-500">{rating} of 5</span> : null}
              </div>
            </div>
          ) : null}

          {/* Main feedback text */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Your Feedback <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What worked well, what was frustrating, or what can we improve?"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Optional Email field */}
          {form?.fields.some((f) => f.type === "email") ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Email Address <span className="text-xs font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com (if you'd like a response)"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ) : null}

          {/* Custom text fields */}
          {form?.fields
            .filter((f) => f.type === "text")
            .map((field) => (
              <div key={field.id}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  {field.label} {field.required ? <span className="text-rose-500">*</span> : null}
                </label>
                <input
                  type="text"
                  required={field.required}
                  value={customFields[field.id] || ""}
                  onChange={(e) => setCustomFields({ ...customFields, [field.id]: e.target.value })}
                  placeholder={field.placeholder || ""}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ))}

          {error ? <p className="rounded-lg bg-rose-50 p-2.5 text-xs font-medium text-rose-700">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            style={{ backgroundColor: accent }}
            className="flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
          >
            {submitting ? "Sending..." : form?.submit_text || "Send Feedback"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
          <span>Powered by</span>
          <span className="font-semibold text-slate-600">SignalIQ</span>
        </div>
      </div>
    </div>
  );
}
