import type { FeedbackRecord } from "../types";

export interface TaskExample {
  instruction: string;
  input: string;
  output: string;
}

const INSTRUCTION =
  "Classify this customer feedback. Return JSON with sentiment (positive|neutral|negative), category, issue_key, severity (low|medium|high), and a one-sentence summary grounded only in the comment.";

export function buildTaskExamples(records: FeedbackRecord[], limit = 24): TaskExample[] {
  const labelled = records.filter(
    (record) => record.analysisMode !== "unclassified" && record.sentiment !== "unclassified",
  );
  return labelled.slice(0, limit).map((record) => ({
    instruction: INSTRUCTION,
    input: record.text,
    output: JSON.stringify({
      sentiment: record.sentiment,
      category: record.category,
      issue_key: record.issueKey,
      severity: record.severity,
      summary: record.analysisReason || record.text.slice(0, 160),
      source_analysis_mode: record.analysisMode,
    }),
  }));
}

export function examplesToCsv(examples: TaskExample[]): string {
  const header = "instruction,input,output";
  const rows = examples.map((example) =>
    [example.instruction, example.input, example.output]
      .map((value) => `"${value.replaceAll('"', '""')}"`)
      .join(","),
  );
  return `${[header, ...rows].join("\n")}\n`;
}
