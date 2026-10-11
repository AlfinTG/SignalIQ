# Design System — InsightFlow

## 1. Design direction

Aim for a credible modern B2B analytics product: restrained, calm, precise, readable. The UI should feel human-designed and intentional, not flashy or packed with AI motifs.

## 2. Visual palette

Suggested tokens (Cursor can tune contrast after seeing actual components):

- `navy-950`: `#14243A` — sidebar/header emphasis.
- `blue-600`: `#2F6FED` — primary interaction and chart highlight.
- `blue-50`: `#EFF5FF` — soft informational surface.
- `text-primary`: `#192638`.
- `text-secondary`: `#667085`.
- `surface`: `#FFFFFF`.
- `surface-subtle`: `#F6F8FB`.
- `border`: `#E2E8F0`.
- `positive`: `#23845D` with a light green surface.
- `warning`: `#A56B16` with a pale amber surface.
- `negative`: `#C54848` with a pale red surface.

Use semantic colour with text/icons as well as colour; never communicate sentiment or priority by colour alone. Check text/background contrast.

## 3. Layout

- Desktop: compact left sidebar, broad main canvas, page heading, KPI row, charts, issue list.
- Mobile: collapse sidebar to a menu/top nav; stack KPI cards and charts; keep controls reachable; horizontally scroll wide tables or show record cards.
- Use a consistent max-content width, grid spacing, and aligned card edges. Do not create a separate decorative card for every line of text.

## 4. Type and spacing

- Choose a highly legible system/modern sans-serif font stack.
- Page titles should be clear rather than oversized.
- Use consistent spacing tokens, for example 4/8/12/16/24/32px.
- Reserve bold weights for headings, issue titles, scores, and important values. Use small all-caps labels sparingly.
- Keep dashboard labels concise and avoid unnecessary jargon.

## 5. Components

### Navigation

Clear current-page state, sensible section icons, accessible tooltip/labels when collapsed.

### KPI card

Label, large number, optional concise context. Do not add change arrows/percentages unless correctly calculated from a comparable prior period.

### Chart card

Title and short explanation, axis/legend labels, responsive dimensions, empty state if data is insufficient, sensible tooltip content.

### Feedback item/table

Readable multi-line content, date/source, sentiment badge, category/issue, optional rating. Avoid overly dense rows. Search and active filters should be visible.

### Priority/issue card

Issue name, priority label/score, report count, negative-share signal, trend signal when valid, one-line recommendation, and a clear route to supporting evidence. Explain the score inputs on the detail view.

### Status badge

`Open`, `In progress`, and `Resolved` each have consistent neutral/semantic styling and readable text.

### Forms and feedback states

Labels remain visible; errors appear beside the relevant input; buttons have loading/disabled states; success/error messages are concise; destructive reset requires confirmation.

## 6. Motion and polish

Use subtle transitions for hover, focus, and small UI state changes only. Avoid parallax, heavy page animation, autoplay, glassmorphism everywhere, neon gradients, excessive rounding, and oversized hero sections.

## 7. Accessibility

- Semantic headings and landmarks.
- Keyboard navigation and visible focus.
- Labels for every form control; actionable icon-only buttons get accessible names.
- Sufficient contrast and reduced-motion respect where animation is used.
- Chart summaries or text equivalents so the message isn't chart-only.
- Do not rely on colour alone for sentiment, severity, or status.

## 8. Quality bar

The main dashboard should quickly communicate what is happening, why it matters, and what to do next. Each element should have a purpose. Ensure real imported data remains as readable as the synthetic demo content.
