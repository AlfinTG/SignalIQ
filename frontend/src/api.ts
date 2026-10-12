import type {
  ActionItem,
  AnalyzeApiItem,
  FeedbackForm,
  FeedbackRecord,
  HealthStatus,
  Project,
} from "./types";
import type { TaskExample } from "./lib/adaptionDataset";
import { authHeaders } from "./auth";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, headers: authHeaders(init?.headers) });
}

async function readError(response: Response): Promise<ApiError> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body && "detail" in body) {
      const detail = (body as { detail: { error?: string; code?: string } }).detail;
      return new ApiError(detail.error ?? "Request failed", detail.code ?? "unknown", response.status);
    }
  } catch {
    /* ignore */
  }
  return new ApiError(`Request failed (${response.status})`, "http_error", response.status);
}

export async function fetchHealth(): Promise<HealthStatus> {
  const response = await apiFetch("/api/health");
  if (!response.ok) throw await readError(response);
  return (await response.json()) as HealthStatus;
}

type PersistentFeedback = {
  id: string; text: string; source: string; submitted_at: string | null; rating: number | null;
  sentiment: FeedbackRecord["sentiment"]; category: string | null; issue_key: string | null;
  severity: FeedbackRecord["severity"] | null; confidence: number | null;
  analysis_explanation: string | null; suggested_action: string | null; analysis_mode: FeedbackRecord["analysisMode"]; analyzed_at: string | null; is_sample: boolean;
};

function fromPersistentFeedback(row: PersistentFeedback): FeedbackRecord {
  return { id: row.id, text: row.text, source: row.source, date: row.submitted_at ?? "", rating: row.rating, sentiment: row.sentiment, category: row.category ?? "Uncategorized", issueKey: row.issue_key ?? "unclassified", severity: row.severity ?? "unknown", confidence: row.confidence, analysisReason: row.analysis_explanation ?? "", suggestedAction: row.suggested_action, analysisMode: row.analysis_mode, analyzedAt: row.analyzed_at, isSample: row.is_sample };
}

export async function fetchPersistentFeedback(): Promise<FeedbackRecord[]> {
  const response = await apiFetch("/api/feedback?limit=100");
  if (!response.ok) throw await readError(response);
  const body = await response.json() as { items: PersistentFeedback[] };
  return body.items.map(fromPersistentFeedback);
}

export async function createPersistentFeedback(data: { text: string; source: string; date: string; rating: number | null }): Promise<FeedbackRecord> {
  const response = await apiFetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: data.text, source: data.source, submitted_at: data.date || undefined, rating: data.rating }) });
  if (!response.ok) throw await readError(response);
  return fromPersistentFeedback(await response.json() as PersistentFeedback);
}

export async function analyzePersistentFeedback(recordIds: string[], mode: "live-ai" | "demo-rules"): Promise<{ updated: FeedbackRecord[]; failedIds: string[]; warning: string | null }> {
  const response = await apiFetch("/api/feedback/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ record_ids: recordIds, mode }) });
  if (!response.ok) throw await readError(response);
  const body = await response.json() as { updated: PersistentFeedback[]; failed_ids: string[]; warning: string | null };
  return { updated: body.updated.map(fromPersistentFeedback), failedIds: body.failed_ids, warning: body.warning };
}

export async function importPersistentFeedback(records: FeedbackRecord[]): Promise<FeedbackRecord[]> {
  const response = await apiFetch("/api/feedback/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ records: records.map((record) => ({ text: record.text, source: record.source, submitted_at: record.date || undefined, rating: record.rating })) }) });
  if (!response.ok) throw await readError(response);
  const body = await response.json() as { records: PersistentFeedback[] };
  return body.records.map(fromPersistentFeedback);
}

export async function updatePersistentIssue(issueKey: string, status: "Open" | "In progress" | "Resolved", notes?: string): Promise<{ issue_key: string; status: "Open" | "In progress" | "Resolved"; updated_at: string }> {
  const response = await apiFetch(`/api/issues/${encodeURIComponent(issueKey)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, notes }) });
  if (!response.ok) throw await readError(response);
  return await response.json() as { issue_key: string; status: "Open" | "In progress" | "Resolved"; updated_at: string };
}

// --- Projects API ---
export async function fetchProjects(): Promise<Project[]> {
  const response = await apiFetch("/api/projects");
  if (!response.ok) throw await readError(response);
  return (await response.json()) as Project[];
}

export async function createProject(name: string, url?: string): Promise<Project> {
  const response = await apiFetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, url }),
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as Project;
}

// --- Forms API ---
export async function fetchProjectForms(projectId: string): Promise<FeedbackForm[]> {
  const response = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/forms`);
  if (!response.ok) throw await readError(response);
  return (await response.json()) as FeedbackForm[];
}

export async function createProjectForm(
  projectId: string,
  form: {
    title: string;
    description: string;
    fields: FeedbackForm["fields"];
    accent_color?: string;
    submit_text?: string;
    success_message?: string;
    template?: string;
  },
): Promise<FeedbackForm> {
  const response = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/forms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as FeedbackForm;
}

export async function updateForm(
  formId: string,
  form: Partial<{
    title: string;
    description: string;
    fields: FeedbackForm["fields"];
    accent_color: string;
    submit_text: string;
    success_message: string;
    status: FeedbackForm["status"];
    template: string;
  }>,
): Promise<FeedbackForm> {
  const response = await apiFetch(`/api/forms/${encodeURIComponent(formId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as FeedbackForm;
}

export async function toggleFormPublish(formId: string): Promise<FeedbackForm> {
  const response = await apiFetch(`/api/forms/${encodeURIComponent(formId)}/publish`, {
    method: "POST",
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as FeedbackForm;
}

// --- Public Form Endpoints ---
export async function fetchPublicForm(formId: string): Promise<FeedbackForm> {
  const response = await apiFetch(`/api/public/forms/${encodeURIComponent(formId)}`);
  if (!response.ok) throw await readError(response);
  return (await response.json()) as FeedbackForm;
}

export async function submitPublicFeedback(payload: {
  form_id: string;
  text: string;
  rating?: number | null;
  source?: string;
  custom_data?: Record<string, unknown>;
}): Promise<{ ok: boolean; submission_id: string; message: string }> {
  const response = await apiFetch("/api/public/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as { ok: boolean; submission_id: string; message: string };
}

// --- Project Submissions API ---
export async function fetchProjectSubmissions(projectId: string): Promise<FeedbackRecord[]> {
  const response = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/submissions`);
  if (!response.ok) throw await readError(response);
  const rows = (await response.json()) as Array<{
    id: string;
    text: string;
    rating: number | null;
    source: string;
    sentiment: FeedbackRecord["sentiment"];
    category: string;
    issue_key: string;
    severity: FeedbackRecord["severity"];
    confidence: number | null;
    analysis_reason: string | null;
    suggested_action: string | null;
    analysis_mode: FeedbackRecord["analysisMode"];
    created_at: string;
    form_id?: string;
    custom_data?: Record<string, unknown>;
  }>;

  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    source: r.source || "widget",
    date: r.created_at,
    rating: r.rating,
    sentiment: r.sentiment || "unclassified",
    category: r.category || "Uncategorized",
    issueKey: r.issue_key || "unclassified",
    severity: r.severity || "unknown",
    confidence: r.confidence,
    analysisReason: r.analysis_reason || "",
    suggestedAction: r.suggested_action,
    analysisMode: r.analysis_mode || "unclassified",
    analyzedAt: r.created_at,
    isSample: false,
    formId: r.form_id,
    customData: r.custom_data,
  }));
}

export async function addProjectSubmission(
  projectId: string,
  data: { text: string; source: string; date?: string; rating?: number | null },
): Promise<FeedbackRecord> {
  const response = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "manual-" + Date.now(),
      text: data.text,
      source: data.source,
      date: data.date,
      rating: data.rating,
    }),
  });
  if (!response.ok) throw await readError(response);
  const r = (await response.json()) as {
    id: string;
    text: string;
    rating: number | null;
    source: string;
    sentiment: FeedbackRecord["sentiment"];
    category: string;
    issue_key: string;
    severity: FeedbackRecord["severity"];
    confidence: number | null;
    analysis_reason: string | null;
    suggested_action: string | null;
    analysis_mode: FeedbackRecord["analysisMode"];
    created_at: string;
  };

  return {
    id: r.id,
    text: r.text,
    source: r.source,
    date: r.created_at,
    rating: r.rating,
    sentiment: r.sentiment,
    category: r.category,
    issueKey: r.issue_key,
    severity: r.severity,
    confidence: r.confidence,
    analysisReason: r.analysis_reason || "",
    suggestedAction: r.suggested_action,
    analysisMode: r.analysis_mode,
    analyzedAt: r.created_at,
    isSample: false,
  };
}

export async function triggerProjectAnalysis(projectId: string): Promise<{ ok: boolean; analyzed_count: number; mode: string }> {
  const response = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/analyze`, {
    method: "POST",
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as { ok: boolean; analyzed_count: number; mode: string };
}

// --- Action Items API ---
export async function fetchProjectActions(projectId: string): Promise<ActionItem[]> {
  const response = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/actions`);
  if (!response.ok) throw await readError(response);
  return (await response.json()) as ActionItem[];
}

export async function createProjectAction(
  projectId: string,
  payload: {
    issue_key: string;
    title: string;
    proposed_fix?: string;
    assignee?: string;
    due_date?: string;
    notes?: string;
    status?: ActionItem["status"];
  },
): Promise<ActionItem> {
  const response = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as ActionItem;
}

export async function updateActionItem(
  actionId: string,
  payload: Partial<{
    title: string;
    proposed_fix: string | null;
    assignee: string | null;
    due_date: string | null;
    status: ActionItem["status"];
    notes: string | null;
  }>,
): Promise<ActionItem> {
  const response = await apiFetch(`/api/actions/${encodeURIComponent(actionId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as ActionItem;
}

// --- Batch Live AI Analysis ---
export async function analyzeLive(records: FeedbackRecord[]): Promise<{
  results: AnalyzeApiItem[];
  failedIds: string[];
  model: string;
  warning: string | null;
}> {
  const response = await apiFetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: records.map((record) => ({
        id: record.id,
        text: record.text,
        source: record.source,
        date: record.date,
        rating: record.rating,
      })),
    }),
  });
  if (!response.ok) throw await readError(response);
  const body = (await response.json()) as {
    results: AnalyzeApiItem[];
    failed_ids: string[];
    model: string;
    warning: string | null;
  };
  return {
    results: body.results,
    failedIds: body.failed_ids,
    model: body.model,
    warning: body.warning,
  };
}

// --- Adaption Lab API ---
export async function requestAdaptionEstimate(examples: TaskExample[], maxRows: number) {
  const response = await apiFetch("/api/adaption/estimate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ examples, max_rows: maxRows }),
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as {
    job_id: string;
    dataset_id: string;
    status: string;
    estimated_credits_consumed: number | null;
    estimated_minutes: number | null;
    row_count: number | null;
    warning: string | null;
  };
}

export async function runAdaption(jobId: string) {
  const response = await apiFetch("/api/adaption/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId, confirm: true }),
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as { job_id: string; run_id: string | null; status: string };
}

export async function pollAdaptionJob(jobId: string) {
  const response = await apiFetch(`/api/adaption/jobs/${jobId}`);
  if (!response.ok) throw await readError(response);
  return (await response.json()) as {
    job_id: string;
    dataset_id: string;
    run_id: string | null;
    status: string;
    phase: string;
    row_count: number | null;
    progress_percent: number | null;
    download_ready: boolean;
    error: string | null;
    estimated_credits_consumed: number | null;
    estimated_minutes: number | null;
    note: string | null;
  };
}

export async function downloadAdaptionOutput(jobId: string): Promise<Blob> {
  const response = await apiFetch(`/api/adaption/jobs/${jobId}/download`);
  if (!response.ok) throw await readError(response);
  return response.blob();
}
