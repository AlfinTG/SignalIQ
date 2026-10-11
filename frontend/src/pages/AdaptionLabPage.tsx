import { useEffect, useMemo, useState } from "react";
import {
  downloadAdaptionOutput,
  pollAdaptionJob,
  requestAdaptionEstimate,
  runAdaption,
  ApiError,
} from "../api";
import { useWorkspace } from "../context/WorkspaceContext";
import { buildTaskExamples, examplesToCsv } from "../lib/adaptionDataset";
import { downloadText } from "../lib/export";

interface JobView {
  jobId: string;
  datasetId: string;
  status: string;
  phase: string;
  estimatedCredits: number | null;
  estimatedMinutes: number | null;
  downloadReady: boolean;
  error: string | null;
  note: string | null;
}

export function AdaptionLabPage() {
  const { workspace, health } = useWorkspace();
  const examples = useMemo(() => buildTaskExamples(workspace.feedback, 24), [workspace.feedback]);
  const [job, setJob] = useState<JobView | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const configured = health?.adaption_configured === true;

  useEffect(() => {
    if (!job?.jobId || job.downloadReady || job.status === "failed") return;
    if (job.phase === "estimated" && job.status !== "running") return;
    const timer = window.setInterval(() => {
      void pollAdaptionJob(job.jobId)
        .then((status) => {
          setJob({
            jobId: status.job_id,
            datasetId: status.dataset_id,
            status: status.status,
            phase: status.phase,
            estimatedCredits: status.estimated_credits_consumed,
            estimatedMinutes: status.estimated_minutes,
            downloadReady: status.download_ready,
            error: status.error,
            note: status.note,
          });
        })
        .catch((caught) => {
          setMessage(caught instanceof ApiError ? caught.message : "Could not refresh Adaption status.");
        });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [job]);

  async function estimate() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await requestAdaptionEstimate(examples, Math.min(40, examples.length));
      setJob({
        jobId: result.job_id,
        datasetId: result.dataset_id,
        status: result.status,
        phase: "estimated",
        estimatedCredits: result.estimated_credits_consumed,
        estimatedMinutes: result.estimated_minutes,
        downloadReady: false,
        error: null,
        note: result.warning,
      });
      setMessage(result.warning ?? "Estimate completed. No adaptation run has started.");
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "Estimate failed.");
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    if (!job) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await runAdaption(job.jobId);
      setJob((current) =>
        current
          ? { ...current, status: result.status, phase: "running" }
          : current,
      );
      setMessage("Adaption run requested. Status below is reported by Adaption, not simulated.");
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "Run failed.");
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    if (!job) return;
    try {
      const blob = await downloadAdaptionOutput(job.jobId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `signaliq-adapted-${job.jobId}.jsonl`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "Download failed.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Adaption Lab</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-muted">
          A narrow Adaptive Data workflow using the official Python SDK: upload labelled instruction/input/output examples,
          request an estimate, then start a run only after confirmation. Adapted rows are training data. SignalIQ does not
          use them for live classification unless they are separately evaluated and wired in.
        </p>
      </div>

      {!configured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">Adaption is not configured</p>
          <p className="mt-1">
            Set <code>ADAPTION_API_KEY</code> on the backend. The rest of SignalIQ stays usable. This is a setup state, not a
            simulated successful job.
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm">
          Adaption key detected. Estimate first. Starting a run may consume Adaption credits.
        </p>
      )}

      <section className="rounded-xl border border-line bg-white p-4 shadow-card">
        <h2 className="text-sm font-semibold">Task dataset</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {examples.length} labelled examples from the current workspace (minimum 3 required). Columns match Adaptive Data
          mapping: instruction → prompt, input → context, output → completion.
        </p>
        <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-line">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-2 py-2">Input (feedback)</th>
                <th className="px-2 py-2">Expected output</th>
              </tr>
            </thead>
            <tbody>
              {examples.slice(0, 8).map((example) => (
                <tr key={example.input} className="border-t border-line align-top">
                  <td className="px-2 py-2">{example.input.slice(0, 140)}</td>
                  <td className="px-2 py-2 font-mono">{example.output.slice(0, 180)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="mt-3 rounded-lg border border-line px-3 py-2 text-sm"
          onClick={() => downloadText("signaliq-adaption-task.csv", examplesToCsv(examples), "text/csv")}
        >
          Download local CSV copy
        </button>
      </section>

      <section className="space-y-3 rounded-xl border border-line bg-white p-4 shadow-card">
        <h2 className="text-sm font-semibold">Estimate, run, inspect</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!configured || busy || examples.length < 3}
            onClick={() => void estimate()}
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Request estimate
          </button>
          <button
            type="button"
            disabled={!configured || busy || !job}
            onClick={() => void start()}
            className="rounded-lg border border-line px-3 py-2 text-sm disabled:opacity-50"
          >
            Confirm and start run
          </button>
          <button
            type="button"
            disabled={!job?.downloadReady}
            onClick={() => void download()}
            className="rounded-lg border border-line px-3 py-2 text-sm disabled:opacity-50"
          >
            Download adapted JSONL
          </button>
        </div>
        {message ? <p className="text-sm">{message}</p> : null}
        {job ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Job</dt>
              <dd className="font-mono">{job.jobId}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Dataset</dt>
              <dd className="font-mono">{job.datasetId}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Status</dt>
              <dd>
                {job.status} ({job.phase})
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Estimate</dt>
              <dd>
                {job.estimatedCredits ?? "—"} credits · {job.estimatedMinutes ?? "—"} min
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-ink-muted">No Adaption job in this session. Jobs are stored in backend memory and reset when the server restarts.</p>
        )}
        {job?.error ? <p className="text-sm text-rose-700">{job.error}</p> : null}
        {job?.note ? <p className="text-xs text-ink-muted">{job.note}</p> : null}
      </section>
    </div>
  );
}
