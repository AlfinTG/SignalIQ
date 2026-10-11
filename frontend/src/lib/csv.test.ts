import { describe, expect, it } from "vitest";
import { csvEscape, parseCsvText, recordsFromCsv } from "./csv";

describe("CSV parsing", () => {
  it("accepts documented columns and quoted commas", () => {
    const raw = `feedback,date,source,rating\n"Card failed, then charged twice",2026-09-01,review,2\n`;
    const result = recordsFromCsv(raw);
    expect(result.needsMapping).toBe(false);
    expect(result.accepted).toBe(1);
    expect(result.records[0]?.text).toContain("charged twice");
    expect(result.records[0]?.source).toBe("review");
    expect(result.records[0]?.analysisMode).toBe("unclassified");
  });

  it("rejects invalid dates and ratings without crashing", () => {
    const raw = `text,date,rating\nok,not-a-date,1\nalso ok,2026-01-01,99\n\n`;
    const result = recordsFromCsv(raw);
    expect(result.accepted).toBe(0);
    expect(result.rejected.length).toBe(2);
    expect(result.rejected[0]?.reason).toMatch(/Invalid date/);
    expect(result.rejected[1]?.reason).toMatch(/Invalid rating/);
  });

  it("asks for mapping when several text-like columns exist", () => {
    const raw = `comment,review\nhello,world\n`;
    const result = recordsFromCsv(raw);
    expect(result.needsMapping).toBe(true);
    expect(result.accepted).toBe(0);
  });

  it("parses quoted newlines", () => {
    const rows = parseCsvText(`a,b\n"x\ny",z`);
    expect(rows[1]?.[0]).toBe("x\ny");
  });

  it("escapes formula-like cells", () => {
    expect(csvEscape("=cmd")).toBe("'=cmd");
  });
});
