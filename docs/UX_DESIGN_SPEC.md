# SignalIQ UX Design Specification

## Design lock

SignalIQ is a calm, evidence-led customer-feedback workbench. Its job is to answer: **what are customers experiencing, what is recurring, what should we investigate first, and what evidence supports that action?** The product must feel editorial and operational, not like a generic AI dashboard. All aggregate views derive from the current workspace, date range, and active filters; synthetic data is always labelled.

### Reference-image interpretation

The three supplied images were inspected directly in Phase 0.

- **Dashboard reference:** retain its compact KPI strip, one dominant analytical region, and varied chart shapes. Do not copy its bright-blue/white palette, decorative radial/radar charts, or customer-growth metrics that SignalIQ cannot calculate.
- **Feedback Explorer reference:** retain the query/filter bar, dense signal list, and persistent evidence/detail pane. Replace its complex enterprise navigation and ambiguous “AI” actions with SignalIQ's focused feedback controls and clear analysis provenance.
- **Insights and Actions reference:** retain the theme-list-to-detail composition, severity summary, evidence excerpts, and action-oriented impact area. Replace its excessive card nesting and visual-alert density with the warm editorial system below.

## Information architecture and navigation

### Public routes

| Route | Purpose | Primary action |
|---|---|---|
| `/` | Explain the collection-to-action workflow and establish trust. | Create account or sign in. |
| `/sign-in`, `/sign-up`, `/recover` | Provider-backed account and recovery flows. | Submit the visible form; errors stay inline. |
| `/f/:formId` | Standalone public feedback form. | Submit validated feedback. |

### Authenticated workspace

Desktop uses a quiet left navigation rail with a compact workspace/account control; mobile uses a labelled, keyboard-operable drawer. The primary nav contains only **Overview**, **Feedback**, **Insights**, **Priorities & Actions**, and **Reports**. **Data Quality & Adaptation** is visually secondary, available from the account/tools area. **Settings** lives in the account menu. A form builder/installation area belongs under Feedback collection controls rather than competing with analytical work.

Navigation changes are routes. Filters change the current view without navigation. Creation/editing uses a route or dialog according to the amount of context needed; destructive deletion always asks for confirmation.

## Screen inventory

### Landing and authentication

**Question:** “Can this help me make a better decision from customer feedback?”  
**Layout:** editorial headline, concise workflow, representative product preview, trust/limitations note, and sign-in/create-account actions. Avoid invented testimonials, metrics, or provider claims. Auth forms have labels, validation, password visibility, progress, error, recovery confirmation, and session-expired guidance. On mobile the content becomes one column while preserving the primary action.

### First-use onboarding

**Question:** “What should I do first?”  
**Layout:** name workspace → add/import feedback → analyze. A secondary choice loads a clearly labelled synthetic sample dataset. Sample data is removable independently of real records; new accounts never inherit another user's data. Empty states explain missing prerequisites and loading uses geometry-matched skeleton steps.

### Overview

**Question:** “What needs attention now?”  
**Layout:** title/date scope and context-sensitive primary action; filter-aware KPI strip; one primary trend/sentiment visualization with textual summary; recurring issues with priority/evidence/provenance; and a next-action section naming issue, evidence, recommendation, and action status.

**Dependencies:** persisted feedback, analysis/issue/action state, filters, and date coverage. Comparisons only appear when valid. Insufficient dates replace charts with explanation; partial analysis distinguishes pending, failed, and unclassified data. Mobile stacks summary and turns issue rows into full-width links.

### Feedback Explorer

**Question:** “What did the customer actually say, and can I correct or organize it?”  
**Layout:** compact query/filter row, import/add actions, source list/table, and wide-screen detail pane. Details become a route or disclosure on narrow screens.

**Controls:** search; sort; sentiment/category-or-issue/source/rating/date/analysis filters; pagination/incremental loading; accessible add/edit/delete; re-analysis; CSV import.

**Import:** select → detect/map columns → preview/validate → confirm → progress → accepted/rejected/skipped summary with reviewable rejects. Detail shows original text, source/date/rating, classification, evidence reason, suggested action, mode/model timestamp, related issue, and correction history. Rule/demo output is labelled. Mobile uses readable cards or controlled table scroll—never tiny columns.

### Insights

**Question:** “Which feedback forms a reliable pattern?”  
**Layout:** filter-aware theme list plus issue detail on desktop; focused detail route on mobile. Detail includes plain-language statement, count, date coverage, sentiment/severity distribution, trend or insufficient-data state, provenance, evidence excerpts linked to original feedback, and evidence-scoped recommendation. Uncertain groupings are marked rather than forced.

### Priorities & Actions

**Question:** “Why is this ranked here, and what has the team done?”  
**Layout:** sortable priority queue plus issue/action detail. Rows expose lifecycle, score, evidence count, negative share, severity, trend availability, owner and due date when present.

**Score:** detail exposes normalized frequency, negative-rate, trend and severity components; weights; total; and any trend redistribution. It is labelled a heuristic. Action flow is create from issue → proposed fix/assignee/due date/notes → save → `Open` / `In progress` / `Resolved`. Changes persist, update all views, and never delete evidence. Deletion/archive confirms; normal status edits save inline with progress.

### Reports

**Question:** “What can I share about this selected period?”  
**Layout:** scope/date controls, preview, limitations/evidence coverage, export actions. It includes scope, date range, metric definitions, analysis coverage, issues, score breakdown, recommendations, evidence summary, and limitations. Exports reflect active scope, escape untrusted values, and report completion/failure.

### Data Quality & Adaptation

**Question:** “Which labels are safe to prepare for later model work?”  
**Layout:** secondary tools page: live-vs-training explanation; review queue; verified-example selector; dataset/mapping preview; separate estimate/run/status area.

**Flow:** inspect → correct label → mark verified → choose eligible examples → preview/export → request estimate → read returned cost/units → explicit confirmation → provider status/errors → download only available output. Synthetic, heuristic, and unreviewed records are ineligible by default. Adapted output is training data, not deployed classification.

### Settings

**Question:** “What workspace/account am I using, and how is data handled?”  
**Layout:** account/session controls, workspace, collection/form configuration, provider status without secrets, implemented export/delete controls, and privacy/storage disclosures. Billing, teams, and client-side secret entry are out of scope.

## Shared interaction contracts

### Evidence

Every insight, priority, recommendation, action, and report section links to source feedback IDs, count, date range, filters, provenance, and uncertainty. “View evidence” opens the scoped feedback list/detail, never an unsupported summary alone.

### Async states

- Initial fetch uses a geometry-matched skeleton, never false metrics.
- Empty and filtered-empty states explain the prerequisite or filter effect and provide the next action/reset.
- Partial success preserves valid results and names pending/failed count plus retry scope.
- Failure preserves safe user input, names the failed operation, and offers meaningful retry.
- Success appears only after server confirmation: brief toast/banner plus durable page state where it matters.
- Unauthorized/session expiry preserves safe drafts and leads to sign-in.

### Accessibility and responsive behavior

All navigation, filters, menus, dialogs, rows/actions, and forms work by keyboard. Focus is visible; dialogs trap/restore focus and support Escape. Icon-only controls have names. Charts include a text equivalent/legend. Motion is short, state-oriented, and reduced for `prefers-reduced-motion`. Support 1366px desktop and 390px mobile without page overflow.

## Phase 2 implementation map

1. Add warm tokens and rebuild shell/navigation without breaking routes.
2. Rebuild overview around one primary insight region and evidence-linked issue queue.
3. Convert Explorer to responsive list/detail with truthful import/analysis controls.
4. Apply the shared evidence-to-action pattern to Insights and Priorities.
5. Add Reports, Data Quality & Adaptation, Settings, and public/auth presentation states as typed UI boundaries; real auth/persistence wiring remains Phase 3.

No control may be decorative: it must call a verified capability, be disabled with an explanation, or remain absent until its phase.
