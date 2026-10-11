import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { analyzeLive, ApiError, fetchHealth } from "../api";
import { applyAnalysisItems, unclassifiedRecords } from "../lib/analysis";
import { demoAnalyzeMany } from "../lib/demoAnalysis";
import { applyFilters } from "../lib/filters";
import { createId } from "../lib/ids";
import { computeMetrics } from "../lib/metrics";
import { loadWorkspace, saveWorkspace } from "../lib/persistence";
import { groupIssues, highPriorityCount } from "../lib/priority";
import { createSampleFeedback } from "../lib/sampleData";
import type {
  FeedbackRecord,
  Filters,
  HealthStatus,
  IssueState,
  IssueStatus,
  Workspace,
} from "../types";
import { EMPTY_FILTERS } from "../types";

interface AnalyzeProgress {
  active: boolean;
  mode: "live-ai" | "demo-rules" | null;
  processed: number;
  total: number;
  message: string;
}

interface WorkspaceContextValue {
  workspace: Workspace;
  filters: Filters;
  setFilters: (next: Filters | ((current: Filters) => Filters)) => void;
  filtered: FeedbackRecord[];
  storageError: string | null;
  recovered: boolean;
  notice: string | null;
  error: string | null;
  health: HealthStatus | null;
  healthError: string | null;
  analyzeProgress: AnalyzeProgress;
  loadSample: () => void;
  startEmpty: () => void;
  addFeedback: (input: { text: string; source: string; date: string; rating: number | null }) => FeedbackRecord;
  importRecords: (records: FeedbackRecord[], replaceSample: boolean) => void;
  analyzeRecords: (ids?: string[], preferLive?: boolean) => Promise<void>;
  saveIssue: (issueKey: string) => void;
  setIssueStatus: (issueKey: string, status: IssueStatus) => void;
  dismissNotice: () => void;
  dismissError: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const BATCH = 16;

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const initial = loadWorkspace();
  const [workspace, setWorkspace] = useState<Workspace>(initial.workspace);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [storageError, setStorageError] = useState<string | null>(initial.storageError);
  const [recovered] = useState(initial.recovered);
  const [notice, setNotice] = useState<string | null>(
    initial.recovered ? "Previous workspace data could not be read. Demonstration data was loaded instead." : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [analyzeProgress, setAnalyzeProgress] = useState<AnalyzeProgress>({
    active: false,
    mode: null,
    processed: 0,
    total: 0,
    message: "",
  });

  useEffect(() => {
    const saveError = saveWorkspace(workspace);
    setStorageError(saveError);
  }, [workspace]);

  useEffect(() => {
    let cancelled = false;
    fetchHealth()
      .then((status) => {
        if (!cancelled) {
          setHealth(status);
          setHealthError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHealthError("Backend health check failed. Live analysis and Adaption Lab need the API running.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => applyFilters(workspace.feedback, filters), [workspace.feedback, filters]);

  const updateWorkspace = useCallback((updater: (current: Workspace) => Workspace) => {
    setWorkspace((current) => updater(current));
  }, []);

  const loadSample = useCallback(() => {
    setWorkspace({
      version: 1,
      feedback: createSampleFeedback(),
      issues: {},
      isSampleWorkspace: true,
    });
    setNotice("Loaded synthetic demonstration data for an online shopping business.");
  }, []);

  const startEmpty = useCallback(() => {
    setWorkspace({ version: 1, feedback: [], issues: {}, isSampleWorkspace: false });
    setNotice("Workspace cleared in this browser. Load sample data or import a CSV to continue.");
  }, []);

  const addFeedback = useCallback(
    (input: { text: string; source: string; date: string; rating: number | null }) => {
      const record: FeedbackRecord = {
        id: createId("man"),
        text: input.text.trim(),
        source: input.source || "manual",
        date: input.date ? new Date(input.date).toISOString() : new Date().toISOString(),
        rating: input.rating,
        sentiment: "unclassified",
        category: "Uncategorized",
        issueKey: "unclassified",
        severity: "unknown",
        confidence: null,
        analysisReason: "",
        suggestedAction: null,
        analysisMode: "unclassified",
        analyzedAt: null,
        isSample: false,
      };
      updateWorkspace((current) => ({
        ...current,
        isSampleWorkspace: false,
        feedback: [record, ...current.feedback],
      }));
      return record;
    },
    [updateWorkspace],
  );

  const importRecords = useCallback(
    (records: FeedbackRecord[], replaceSample: boolean) => {
      updateWorkspace((current) => ({
        ...current,
        isSampleWorkspace: false,
        feedback: replaceSample && current.isSampleWorkspace ? records : [...records, ...current.feedback],
      }));
    },
    [updateWorkspace],
  );

  const analyzeRecords = useCallback(
    async (ids?: string[], preferLive = true) => {
      const targets = workspace.feedback.filter((record) => (ids ? ids.includes(record.id) : true));
      const pending = ids ? targets : unclassifiedRecords(targets);
      const subset = pending.length ? pending : targets;
      if (!subset.length) {
        setNotice("Nothing to analyze.");
        return;
      }

      setError(null);
      setAnalyzeProgress({
        active: true,
        mode: preferLive ? "live-ai" : "demo-rules",
        processed: 0,
        total: subset.length,
        message: preferLive ? "Requesting live AI analysis…" : "Running labelled demo analysis…",
      });

      const applyLocalDemo = () => {
        const analyzed = demoAnalyzeMany(subset);
        const map = new Map(analyzed.map((record) => [record.id, record]));
        updateWorkspace((current) => ({
          ...current,
          feedback: current.feedback.map((record) => map.get(record.id) ?? record),
        }));
        setAnalyzeProgress({
          active: false,
          mode: "demo-rules",
          processed: subset.length,
          total: subset.length,
          message: "",
        });
        setNotice(
          "Demo analysis used. Results come from deterministic keyword rules, not a live model. Configure GEMINI_API_KEY on the backend for live AI.",
        );
      };

      if (!preferLive) {
        applyLocalDemo();
        return;
      }

      try {
        const merged: FeedbackRecord[] = [];
        for (let i = 0; i < subset.length; i += BATCH) {
          const batch = subset.slice(i, i + BATCH);
          setAnalyzeProgress({
            active: true,
            mode: "live-ai",
            processed: i,
            total: subset.length,
            message: `Live AI batch ${Math.floor(i / BATCH) + 1} of ${Math.ceil(subset.length / BATCH)}…`,
          });
          const response = await analyzeLive(batch);
          const applied = applyAnalysisItems(batch, response.results);
          merged.push(...applied.filter((record) => record.analysisMode === "live-ai"));
          if (response.warning) setNotice(response.warning);
        }
        const map = new Map(merged.map((record) => [record.id, record]));
        updateWorkspace((current) => ({
          ...current,
          feedback: current.feedback.map((record) => map.get(record.id) ?? record),
        }));
        const failed = subset.length - merged.length;
        setAnalyzeProgress({ active: false, mode: "live-ai", processed: subset.length, total: subset.length, message: "" });
        setNotice(
          failed
            ? `Live AI classified ${merged.length} record(s). ${failed} could not be validated from the model response and were left unchanged.`
            : `Live AI classified ${merged.length} record(s).`,
        );
      } catch (caught) {
        const missingKey = caught instanceof ApiError && caught.code === "missing_gemini_key";
        if (missingKey) {
          applyLocalDemo();
          setError(null);
          setNotice(
            "Live AI is not configured (no GEMINI_API_KEY). Labelled demo analysis was used instead. Results are keyword rules, not a live model.",
          );
          return;
        }
        const message =
          caught instanceof ApiError
            ? caught.message
            : "Live AI analysis failed. No fabricated results were saved.";
        setError(`${message} Use Retry or labelled demo analysis. Nothing was invented.`);
        setAnalyzeProgress({
          active: false,
          mode: null,
          processed: 0,
          total: subset.length,
          message: "",
        });
      }
    },
    [updateWorkspace, workspace.feedback],
  );

  const saveIssue = useCallback((issueKey: string) => {
    updateWorkspace((current) => {
      const existing = current.issues[issueKey];
      const next: IssueState = {
        issueKey,
        status: existing?.status ?? "Open",
        saved: true,
        updatedAt: new Date().toISOString(),
      };
      return { ...current, issues: { ...current.issues, [issueKey]: next } };
    });
    setNotice("Issue saved in this browser. It is not synced across devices.");
  }, [updateWorkspace]);

  const setIssueStatus = useCallback((issueKey: string, status: IssueStatus) => {
    updateWorkspace((current) => {
      const existing = current.issues[issueKey];
      return {
        ...current,
        issues: {
          ...current.issues,
          [issueKey]: {
            issueKey,
            status,
            saved: existing?.saved ?? true,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  }, [updateWorkspace]);

  const value: WorkspaceContextValue = {
    workspace,
    filters,
    setFilters,
    filtered,
    storageError,
    recovered,
    notice,
    error,
    health,
    healthError,
    analyzeProgress,
    loadSample,
    startEmpty,
    addFeedback,
    importRecords,
    analyzeRecords,
    saveIssue,
    setIssueStatus,
    dismissNotice: () => setNotice(null),
    dismissError: () => setError(null),
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return value;
}

export function useDashboardStats() {
  const { filtered, workspace } = useWorkspace();
  const metrics = useMemo(() => computeMetrics(filtered), [filtered]);
  const groups = useMemo(() => groupIssues(filtered), [filtered]);
  return {
    metrics,
    groups,
    highPriority: highPriorityCount(groups),
    savedCount: Object.values(workspace.issues).filter((issue) => issue.saved).length,
  };
}
