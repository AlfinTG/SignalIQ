import type { AnalyzeApiItem, FeedbackRecord, HealthStatus } from "./types";
import type { TaskExample } from "./lib/adaptionDataset";

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
  const response = await fetch("/api/health");
  if (!response.ok) throw await readError(response);
  return (await response.json()) as HealthStatus;
}

export async function analyzeLive(records: FeedbackRecord[]): Promise<{
  results: AnalyzeApiItem[];
  failedIds: string[];
  model: string;
  warning: string | null;
}> {
  const response = await fetch("/api/analyze", {
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

export async function requestAdaptionEstimate(examples: TaskExample[], maxRows: number) {
  const response = await fetch("/api/adaption/estimate", {
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
  const response = await fetch("/api/adaption/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId, confirm: true }),
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as { job_id: string; run_id: string | null; status: string };
}

export async function pollAdaptionJob(jobId: string) {
  const response = await fetch(`/api/adaption/jobs/${jobId}`);
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
  const response = await fetch(`/api/adaption/jobs/${jobId}/download`);
  if (!response.ok) throw await readError(response);
  return response.blob();
}
