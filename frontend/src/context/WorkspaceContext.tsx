import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  analyzePersistentFeedback,
  ApiError,
  createProject,
  createProjectAction,
  createPersistentFeedback,
  importPersistentFeedback,
  fetchHealth,
  fetchProjectActions,
  fetchProjectForms,
  fetchProjects,
  fetchPersistentFeedback,
  fetchProjectSubmissions,
  updateActionItem,
  updatePersistentIssue,
} from "../api";
import { unclassifiedRecords } from "../lib/analysis";
import { applyFilters } from "../lib/filters";
import { createId } from "../lib/ids";
import { computeMetrics } from "../lib/metrics";
import { groupIssues, highPriorityCount } from "../lib/priority";
import { createSampleFeedback } from "../lib/sampleData";
import type {
  ActionItem,
  FeedbackForm,
  FeedbackRecord,
  Filters,
  HealthStatus,
  IssueState,
  IssueStatus,
  Project,
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
  projects: Project[];
  currentProject: Project | null;
  setCurrentProject: (proj: Project) => void;
  createNewProject: (name: string, url?: string) => Promise<Project>;
  forms: FeedbackForm[];
  refreshForms: () => Promise<void>;
  actions: ActionItem[];
  refreshActions: () => Promise<void>;
  addAction: (payload: { issue_key: string; title: string; proposed_fix?: string; assignee?: string; due_date?: string; notes?: string }) => Promise<ActionItem>;
  updateAction: (actionId: string, payload: Partial<ActionItem>) => Promise<ActionItem>;
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
  refreshSubmissions: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const BATCH = 16;

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace>({ version: 1, feedback: [], issues: {}, isSampleWorkspace: false });
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [storageError] = useState<string | null>(null);
  const [recovered] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
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

  // Load backend health and projects
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
          setHealthError("Backend is offline. Using local storage mode.");
        }
      });

    fetchProjects()
      .then((projs) => {
        if (!cancelled && projs.length > 0) {
          setProjects(projs);
          setCurrentProjectState((curr) => curr || projs[0] || null);
        }
      })
      .catch(() => {
      /* Legacy project endpoints are not the signed-in persistence source. */
      });

    fetchPersistentFeedback()
      .then((feedback) => {
        if (!cancelled) setWorkspace((current) => ({ ...current, feedback, isSampleWorkspace: false }));
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof ApiError ? requestError.message : "Your persistent workspace could not be loaded.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshForms = useCallback(async () => {
    if (!currentProject) return;
    try {
      const f = await fetchProjectForms(currentProject.id);
      setForms(f);
    } catch {
      /* ignore */
    }
  }, [currentProject]);

  const refreshActions = useCallback(async () => {
    if (!currentProject) return;
    try {
      const a = await fetchProjectActions(currentProject.id);
      setActions(a);
    } catch {
      /* ignore */
    }
  }, [currentProject]);

  const refreshSubmissions = useCallback(async () => {
    if (!currentProject) return;
    try {
      const subs = await fetchProjectSubmissions(currentProject.id);
      if (subs.length > 0) {
        setWorkspace((curr) => ({
          ...curr,
          feedback: subs,
          isSampleWorkspace: false,
        }));
      }
    } catch {
      /* fallback to local workspace */
    }
  }, [currentProject]);

  // When active project changes, load forms, actions, and submissions
  useEffect(() => {
    if (currentProject) {
      void refreshForms();
      void refreshActions();
      void refreshSubmissions();
    }
  }, [currentProject, refreshForms, refreshActions, refreshSubmissions]);

  const setCurrentProject = useCallback((proj: Project) => {
    setCurrentProjectState(proj);
  }, []);

  const createNewProject = useCallback(async (name: string, url?: string) => {
    const proj = await createProject(name, url);
    setProjects((prev) => [proj, ...prev]);
    setCurrentProjectState(proj);
    setNotice(`Project “${proj.name}” created.`);
    return proj;
  }, []);

  const addAction = useCallback(
    async (payload: { issue_key: string; title: string; proposed_fix?: string; assignee?: string; due_date?: string; notes?: string }) => {
      if (!currentProject) throw new Error("No active project");
      const created = await createProjectAction(currentProject.id, payload);
      setActions((prev) => [created, ...prev]);
      setNotice(`Action item created: ${created.title}`);
      return created;
    },
    [currentProject],
  );

  const updateAction = useCallback(async (actionId: string, payload: Partial<ActionItem>) => {
    const updated = await updateActionItem(actionId, payload);
    setActions((prev) => prev.map((a) => (a.id === actionId ? updated : a)));
    setNotice(`Action updated: ${updated.title}`);
    return updated;
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

      void createPersistentFeedback({ text: record.text, source: record.source, date: record.date ?? "", rating: record.rating })
        .then((saved) => updateWorkspace((current) => ({ ...current, isSampleWorkspace: false, feedback: [saved, ...current.feedback] })))
        .catch((requestError: unknown) => setError(requestError instanceof ApiError ? requestError.message : "Feedback could not be saved."));
      return record;
    },
    [updateWorkspace],
  );

  const importRecords = useCallback(
    (records: FeedbackRecord[], replaceSample: boolean) => {
      void importPersistentFeedback(records)
        .then((saved) => updateWorkspace((current) => ({ ...current, isSampleWorkspace: false, feedback: replaceSample && current.isSampleWorkspace ? saved : [...saved, ...current.feedback] })))
        .catch((requestError: unknown) => setError(requestError instanceof ApiError ? requestError.message : "Feedback import could not be saved."));
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

      const applyPersistentAnalysis = async (mode: "live-ai" | "demo-rules") => {
        const response = await analyzePersistentFeedback(subset.map((record) => record.id), mode);
        const map = new Map(response.updated.map((record) => [record.id, record]));
        updateWorkspace((current) => ({ ...current, feedback: current.feedback.map((record) => map.get(record.id) ?? record) }));
        setAnalyzeProgress({
          active: false,
          mode,
          processed: response.updated.length,
          total: subset.length,
          message: "",
        });
        setNotice(response.warning ?? (mode === "demo-rules" ? "Demo analysis used. Results come from deterministic keyword rules, not a live model." : `Live Gemini classified ${response.updated.length} record(s).`));
      };

      if (!preferLive) {
        await applyPersistentAnalysis("demo-rules");
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
          const response = await analyzePersistentFeedback(batch.map((record) => record.id), "live-ai");
          merged.push(...response.updated);
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

  const saveIssue = useCallback(
    (issueKey: string) => {
      const existing = workspace.issues[issueKey];
      const status = existing?.status ?? "Open";
      void updatePersistentIssue(issueKey, status).catch((requestError: unknown) => setError(requestError instanceof ApiError ? requestError.message : "Issue state could not be saved."));
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
      setNotice("Issue saved in this browser.");
    },
    [updateWorkspace, workspace.issues],
  );

  const setIssueStatus = useCallback(
    (issueKey: string, status: IssueStatus) => {
      void updatePersistentIssue(issueKey, status).catch((requestError: unknown) => setError(requestError instanceof ApiError ? requestError.message : "Issue status could not be saved."));
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
    },
    [updateWorkspace],
  );

  const value: WorkspaceContextValue = {
    workspace,
    projects,
    currentProject,
    setCurrentProject,
    createNewProject,
    forms,
    refreshForms,
    actions,
    refreshActions,
    addAction,
    updateAction,
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
    refreshSubmissions,
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
