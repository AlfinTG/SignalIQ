import { describe, expect, it } from "vitest";
import { buildReportHtml, escapeHtml, issuesToCsv } from "./export";
import { createSampleFeedback } from "./sampleData";
import { groupIssues } from "./priority";
import { EMPTY_FILTERS } from "../types";

describe("export", () => {
  it("escapes HTML in reports", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">`)).not.toContain("<img");
    const records = createSampleFeedback().map((record, index) =>
      index === 0 ? { ...record, text: `<script>alert(1)</script>` } : record,
    );
    const html = buildReportHtml(records, EMPTY_FILTERS, {}, groupIssues(records));
    expect(html).toContain("SignalIQ");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("writes issue CSV rows", () => {
    const groups = groupIssues(createSampleFeedback());
    const csv = issuesToCsv(groups, { [groups[0]!.issueKey]: { issueKey: groups[0]!.issueKey, status: "Open", saved: true, updatedAt: "t" } });
    expect(csv.split("\n")[0]).toContain("issueKey");
    expect(csv).toContain(groups[0]!.issueKey);
  });

  it("guards spreadsheet formulas in issue exports", () => {
    const records = createSampleFeedback().map((record, index) =>
      index === 0 ? { ...record, issueKey: "=danger", category: "+formula" } : record,
    );
    const csv = issuesToCsv(groupIssues(records), {});
    expect(csv).toContain("'=danger");
    expect(csv).toContain("'+formula");
  });
});
