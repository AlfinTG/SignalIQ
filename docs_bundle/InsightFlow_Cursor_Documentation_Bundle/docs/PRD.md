# Product Requirements Document — InsightFlow

## 1. Product summary

InsightFlow is a browser-based customer feedback intelligence prototype. It helps a small online-shopping business move from unstructured comments to understandable patterns and evidence-backed next actions.

**One-sentence value proposition:** Turn scattered customer feedback into a prioritized, explainable list of problems to fix next.

## 2. Target user and demo scenario

**Primary user:** An e-commerce owner, support lead, or product manager who receives feedback from reviews, surveys, and support interactions but has limited time to analyze it.

**Demo dataset:** Synthetic comments about payment failures, delayed deliveries, app stability, product quality, and customer support. All demo content must be visibly labeled as sample/synthetic.

## 3. Goals

- Make feedback easy to add, import, search, filter, and inspect.
- Run sentiment/topic analysis using a real LLM when configured, with an honestly labelled demo fallback.
- Find repeat issues and show the evidence behind them.
- Calculate consistent dashboard metrics from the active dataset.
- Help a user prioritize and track important issues.
- Export a readable report.
- Integrate Adaption Adaptive Data into a real, explicitly triggered dataset workflow.
- Remain functional enough to demonstrate with no external API keys.

## 4. Non-goals

Authentication, user accounts, team collaboration, billing, enterprise permissions, direct ingestion from third-party review platforms, real-time streaming, custom model training, production-grade data warehouse, and advanced unsupervised clustering are explicitly out of scope.

## 5. Functional requirements

### FR-1 Sample data

On first launch, load a useful synthetic dataset across several weeks, categories, sentiments, severities, and sources. Label it as sample data. Provide a reset action with confirmation.

### FR-2 Feedback entry

Allow users to add a feedback text and optional source/date/rating. Validate required text, impose reasonable length limits, and assign a stable ID. Keep the new record after refresh.

### FR-3 CSV import

Allow `.csv` upload; detect common text/date/source/rating columns; prompt for the text column if uncertain; report imported and rejected row counts; handle empty, malformed, and unsupported files without crashing. Do not silently claim all rows imported if some were skipped.

### FR-4 Feedback Explorer

Display feedback records with text, date, source, sentiment, category/issue, and analysis state. Support text search and available filters. Filters should compose and should update visible data and relevant aggregate UI. Provide a record details view.

### FR-5 Analysis

Provide an explicit action to analyze unclassified/new feedback or reanalyze selected/all allowed rows. Live Gemini analysis is server-side and produces validated structured classifications. If credentials are missing/provider fails, use a deterministic and visibly disclosed demo fallback. Never label fallback results as AI-generated results.

Per record, capture: sentiment (positive/neutral/negative), category, normalized `issueKey`, severity (low/medium/high), confidence when meaningful, short reason grounded in the comment, and analysis timestamp. Use a safe, bounded number of records per operation.

### FR-6 Dashboard

Display total feedback, negative share, number of distinct issue groups, and high-priority issues. Include sentiment distribution, issue frequency, and a date trend when valid dates are present. Every metric must derive from active analyzed data. Charts and metric cards must respond to applicable filters/date ranges. Avoid invented percentage change annotations.

### FR-7 Issue grouping

Group comments by normalized issue key and/or category. Each group shows frequency, sentiment breakdown, negative share, severity signal, temporal signal if enough dates exist, recent supporting comments, and affected feedback IDs. Grouping may use normalized model labels and deterministic post-processing; advanced clustering is not required.

### FR-8 Priority scoring

Calculate transparent score inputs on 0–100 scales:
- Frequency: 40%
- Negative share: 30%
- Trend/recency: 20% (only when enough valid dates exist)
- Severity: 10%

When trend cannot be calculated, either redistribute the available weights proportionally and disclose the missing trend data, or calculate a clearly labelled score using the remaining inputs. Use one consistent approach throughout the product. Provide a score breakdown or tooltip. Do not call this a scientifically validated risk score.

### FR-9 Recommendations

For important issues, suggest one specific next action. Recommendations must cite visible evidence such as comment count, negative share, common wording, date pattern, and representative excerpts. Use constrained AI output or rule-based templates. Never infer root causes from comments alone; phrase them as investigations/hypotheses where appropriate.

### FR-10 Saved issue tracking

Allow saving/unsaving issues and changing status among `Open`, `In progress`, and `Resolved`. Persist status in `localStorage`. Clearly indicate status in the issues screen.

### FR-11 Report export

Allow exporting a report for the active dataset/filter scope. Include report timestamp, filters/date range, relevant metrics, sentiment distribution, top issues, priority inputs, recommendations, and supporting evidence. Also support raw data export (CSV or JSON). Ensure exported values are calculated, not hardcoded. Escape content safely when generating HTML.

### FR-12 Adaption Lab

Explain that Adaption Adaptive Data optimizes/expands datasets for AI training. Generate a task-relevant dataset from source feedback and reviewed/available labels, such as instruction/input/output examples. Let users download the prepared source dataset. With `ADAPTION_API_KEY`, offer an estimate first and a separate explicit action to run adaptation. Show real status/error and offer output download only when available. Without key, show not configured plus setup instructions. Never fake successful external processing.

## 6. Non-functional requirements

- Responsive from ~390px mobile to 1366px desktop.
- A visually coherent product UI with accessible labels, contrast, focus states, and keyboard support.
- Secrets stay on backend.
- External provider output is schema-validated.
- Robust states for loading, empty data, bad files, provider errors, missing credentials, and partial analysis failure.
- Runs on a laptop with clear install/run instructions.
- Automated tests run without actual API credentials.

## 7. Success criteria / acceptance tests

1. A new launch loads synthetic sample feedback.
2. Adding a record updates the explorer and is retained after refresh.
3. CSV import clearly reports what was accepted/rejected.
4. Analysis returns classifications, or a labelled fallback if no key exists.
5. Sentiment/chart/KPI values change when the dataset or filters change.
6. Top issues link to supporting records and transparent scoring.
7. Recommendation text does not claim unsupported facts.
8. Saved state/status survives refresh.
9. Exported report matches the selected data scope.
10. Adaption Lab accurately represents key/run state and never fakes a completed run.
11. Frontend build and automated tests pass, or any blocker is explicitly documented.
12. The main user journey can be demonstrated without needing live API credentials.

## 8. Demo narrative

“Here is a sample set of customer feedback. I can import more data, analyze comments, see that several customers are reporting a similar problem, open the evidence, understand why it is prioritized, track the issue, and export a report. Adaption Lab separately prepares and processes a task-specific dataset for future model training/improvement.”
