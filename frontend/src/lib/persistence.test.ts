import { describe, expect, it } from "vitest";
import { emptyWorkspace, parseWorkspace, STORAGE_KEY } from "./persistence";

describe("workspace persistence", () => {
  it("loads demonstration data when storage is empty", () => {
    const parsed = parseWorkspace(null);
    expect(parsed.workspace.isSampleWorkspace).toBe(true);
    expect(parsed.workspace.feedback.length).toBeGreaterThan(10);
  });

  it("keeps saved issue status", () => {
    const workspace = emptyWorkspace();
    workspace.issues["late-delivery"] = {
      issueKey: "late-delivery",
      status: "In progress",
      saved: true,
      updatedAt: "2026-10-10T00:00:00.000Z",
    };
    const parsed = parseWorkspace(JSON.stringify(workspace));
    expect(parsed.workspace.issues["late-delivery"]?.status).toBe("In progress");
    expect(parsed.workspace.issues["late-delivery"]?.saved).toBe(true);
  });

  it("recovers from corrupt JSON", () => {
    const parsed = parseWorkspace("{not json");
    expect(parsed.recovered).toBe(true);
    expect(parsed.workspace.feedback.length).toBeGreaterThan(0);
  });

  it("allows an empty workspace to round-trip", () => {
    const parsed = parseWorkspace(JSON.stringify({ version: 1, feedback: [], issues: {}, isSampleWorkspace: false }));
    expect(parsed.recovered).toBe(false);
    expect(parsed.workspace.feedback).toEqual([]);
    expect(STORAGE_KEY).toBe("signaliq.workspace.v1");
  });
});
