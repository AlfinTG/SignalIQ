# SignalIQ Design System

## Foundation

SignalIQ uses **warm editorial analytics**: paper-like surfaces, charcoal text, forest/sage for primary action and constructive signal, and terracotta/amber only where attention is needed. Hierarchy, borders, and whitespace take precedence over repeated large rounded cards, heavy shadows, gradients, or a navy/blue application shell.

## Semantic tokens

Implement tokens centrally (CSS variables/Tailwind aliases); components use semantic names, not scattered palette values.

| Token | Value | Role |
|---|---:|---|
| `canvas` | `#F5F3EC` | Page background |
| `surface` | `#FFFEFA` | Standard content background |
| `surface-raised` | `#FFFFFF` | Dialogs, menus, focused panels |
| `surface-muted` | `#EDEAE1` | Quiet sections/table headers |
| `text-primary` | `#252B27` | Headings and body |
| `text-secondary` | `#626B63` | Supporting text |
| `text-tertiary` | `#667066` | Readable metadata |
| `border` | `#DEDCD2` | Dividers/input borders |
| `action` | `#315D4C` | Primary controls/key data series |
| `action-hover` | `#264A3D` | Primary hover |
| `action-subtle` | `#DDE8DD` | Selected/filter highlight |
| `positive` | `#34745A` | Positive state |
| `warning` | `#94661D` | Attention state |
| `destructive` | `#B34D45` | Errors/destructive actions |
| `accent-terracotta` | `#B96D4D` | Editorial emphasis only |
| `focus-ring` | `#477B68` | 2px keyboard focus |

Rendered text/background pairs must meet WCAG AA. Sentiment, severity, priority, and lifecycle always pair colour with label, icon, or shape.

## Typography, spacing, and layout

- Use the existing readable sans stack for UI/tables; introduce an editorial heading face only if bundled and tested.
- Roles: display 32/38, h1 28/34, h2 20/26, h3 16/22, body 14/21, metadata 12/18px. Use tabular numerals for comparable metrics where available.
- Keep explanatory lines around 45–75 characters. Base rhythm: 8px with 4px refinements; sections 20–32px apart.
- Controls are 40px; isolated mobile targets are at least 44px. Dense table rows are 44–52px according to evidence depth.
- Desktop ≥1200: quiet 224–240px rail and fluid content. Tablet 768–1199: collapsible rail/two-column regions where readable. Mobile <768: drawer, one-column flow, full-width primary action, filter sheet, and list-detail navigation.

## Component contracts

| Component | Responsibility and variants |
|---|---|
| `AppShell` | Desktop rail, mobile drawer, workspace/account control, heading/action slot. |
| `Button` | Primary, secondary, tertiary, destructive; loading progress; disabled reason nearby. |
| `Field` | Label, description, input/select/textarea, required marker, validation association. |
| `FilterBar` | Search, date range, chips/selects, applied scope, clear all, mobile sheet. |
| `KpiStrip` | Label/value/scope and only valid comparisons. |
| `ChartFrame` | Business question, scope, legend/text summary, empty/insufficient state. |
| `IssueRow` | Labelled detail link, evidence count, lifecycle, priority, trend and provenance. |
| `EvidenceList` | Excerpt, source/date, analysis mode, original-record link. |
| `StatusBadge` | Text plus optional icon for sentiment/severity/lifecycle/provenance. |
| `DataTable` | Semantic headings, accessible sorting, row actions, skeleton, empty/filtered-empty, pagination. |
| `Banner` / `Toast` | Persistent system/partial errors; confirmed-success toast only. |
| `Dialog` | Focus trap, Escape, labelled content, destructive confirmation. |
| State components | Region-matched skeleton, empty state, error/retry state. |

## Interaction and chart rules

- Links navigate; buttons mutate; forms have explicit submit buttons. Inline edits suit low-risk action status; multi-field/destructive edits use dialog or route.
- Requests prevent duplicate submission, show in-flight state, and preserve drafts on recoverable failure.
- Query state includes search, sentiment, issue/category, source, rating, date, analysis state, sort and page where available. Every KPI/chart on a page uses that scope.
- Charts use forest as primary series, neutral stone/charcoal as comparison, labelled axes/units, non-hover-only legend, light gridlines, and text summary. Insufficient dates/sample size show explanation—not an implied smooth trend.

## State and accessibility standards

| State | Treatment |
|---|---|
| Loading | Geometry-matched skeleton; no false metrics. |
| Empty | Prerequisite and next allowed action. |
| Filtered empty | Explain filter effect plus reset. |
| Pending/partial | Explicit counts, provenance, retained successful results. |
| Error | Failed operation, preserved input, safe retry. |
| Missing configuration | Server-side setup explanation with no secret exposure. |
| Unauthorized | Session-expired route/message and safe return path. |

Use semantic headings/landmarks, labels/descriptions, `:focus-visible` with `focus-ring`, `aria-sort`, accessible icon names, textual chart summaries, and keyboard/pointer parity. Dialogs return focus. Honor `prefers-reduced-motion`; transitions stay below 200ms and communicate state.

## Exclusions

Do not use a dark navy/bright-blue dashboard shell, giant in-app gradients, identical-card grids, decorative radar/gauge charts, fake AI confidence, fabricated totals, hidden keyboard focus, or controls that imply unavailable backend behavior.
