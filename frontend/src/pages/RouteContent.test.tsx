import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { IssueGroup } from "../types";

const group: IssueGroup = {
  issueKey: "checkout-friction",
  title: "Checkout friction",
  category: "Checkout",
  records: [],
  count: 8,
  negativeCount: 5,
  negativeRate: 62.5,
  frequencyScore: 80,
  negativeScore: 62.5,
  trendScore: 10,
  severityScore: 60,
  priorityScore: 82,
  priorityLabel: "High",
  trendDirection: "up",
  trendNote: "Increasing in the current period.",
  recommendation: "Investigate checkout errors.",
  evidenceNote: "Eight comments describe checkout friction.",
  suggestedAction: "Review the checkout flow.",
};

vi.mock("../context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    configured: true,
    loading: false,
    session: {},
    signOut: vi.fn(),
  }),
}));
vi.mock("../context/WorkspaceContext", () => ({
  WorkspaceProvider: ({ children }: { children: React.ReactNode }) => children,
  useWorkspace: () => ({
    workspace: { feedback: [], issues: {}, isSampleWorkspace: false },
    currentWorkspace: { name: "Test workspace" },
    filtered: [],
    filters: {
      search: "",
      sentiment: "all",
      category: "all",
      source: "all",
      dateFrom: "",
      dateTo: "",
    },
    setFilters: vi.fn(),
    saveIssue: vi.fn(),
    setIssueStatus: vi.fn(),
    notice: null,
    error: null,
    storageError: null,
    health: null,
    healthError: null,
    analyzeProgress: { active: false, processed: 0, total: 0, message: "" },
    dismissNotice: vi.fn(),
    dismissError: vi.fn(),
  }),
  useDashboardStats: () => ({
    groups: [group],
    highPriority: 1,
    savedCount: 0,
    metrics: { analyzed: 8, unclassified: 0, negative: 5, negativeShare: 62.5 },
  }),
}));

import App from "../App";

describe("insights and priorities routes", () => {
  it("renders pattern discovery content on /insights without action controls", () => {
    render(
      <MemoryRouter initialEntries={["/insights"]}>
        <App />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: "Insights" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Most discussed topics")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Mark Resolved" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Insights" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Priorities & Actions" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("renders the decision queue and issue status controls on /priorities", () => {
    render(
      <MemoryRouter initialEntries={["/priorities"]}>
        <App />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: "Priorities & Actions" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Score 82.0")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mark Resolved" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Most discussed topics")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Priorities & Actions" }),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Insights" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
