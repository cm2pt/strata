# Design QA Checklist — Strata

> Single reference for every visual rule in the design system.
> Token source of truth: `src/lib/tokens.ts`

---

## A. Typography

| Rule | Token / Value | How to Verify |
|------|---------------|---------------|
| Body font | Inter (`--font-inter`) via `--font-sans` | Inspect any `<p>` — should resolve to Inter |
| Mono font | JetBrains Mono (`--font-mono`) | Inspect any `.font-mono` element (KPI values, table costs) |
| Section title | `text-sm font-semibold text-gray-900` | All `<SectionHeader>` titles are 14px semibold |
| Section subtitle | `text-xs text-gray-400 mt-0.5` | Subtitle renders 12px, gray-400, 2px top margin |
| Metric label (KPI) | `text-[11px] uppercase tracking-wide text-gray-500` | 11px ALL-CAPS on every KPI/metric micro-label |
| Table header | `text-[11px] font-medium uppercase tracking-wider text-gray-400` | Table `<th>` cells are 11px ALL-CAPS |
| Display figure | `text-3xl font-semibold tracking-tight text-gray-900 font-mono` | KPICard main value is 30px mono |
| Table figure | `text-sm font-medium text-gray-900 font-mono` | Cost/value columns in tables are 14px mono |

**Verification:** Open any screen → DevTools → inspect a KPI card label, main value, and table header. Sizes must match.

---

## B. Cards & Surfaces

| Rule | Token | Value |
|------|-------|-------|
| Border radius | `rounded-xl` | 12px (0.75rem) on all cards |
| Border | `border border-border` | 1px solid oklch(0.922 0 0) |
| Resting shadow | `shadow-[0_1px_3px_rgba(0,0,0,0.04)]` | Subtle 1px blur, 4% black |
| Hover shadow | `shadow-[0_4px_12px_rgba(0,0,0,0.06)]` | 4px blur, 6% black on hover |
| Padding | `p-6` | 24px all sides |
| Transition | `transition-shadow` | Shadow transitions smoothly |

**Verification:**
1. Hover over any Card — shadow must lift from 1px→4px blur.
2. Click a card that has `onClick` — focus ring should appear (keyboard accessible).
3. Non-interactive cards should NOT have `cursor-pointer` or hover shadow.

---

## C. Page Layout

| Rule | Token | Value |
|------|-------|-------|
| Max width | `max-w-[1440px]` | Content caps at 1440px |
| Horizontal padding | `px-8` | 32px each side |
| Vertical padding | `py-8` | 32px top and bottom |
| Section spacing | `space-y-7` | 28px between sections |
| Section header gap | `mb-5` | 20px below every SectionHeader |

**Verification:**
1. Resize browser to 1920px wide — content must not exceed 1440px.
2. All pages use `<PageShell>` wrapper — no inline `px-8 py-8` patterns outside it.
3. Space between consecutive Cards/sections is exactly 28px.

---

## D. Color Tokens

### Lifecycle Stages (Recharts hex)

| Stage | Hex | Tailwind pill class |
|-------|-----|---------------------|
| Draft | `#9CA3AF` | `bg-gray-100 text-gray-600` |
| Active | `#2563EB` | `bg-blue-50 text-blue-700` |
| Growth | `#0F766E` | `bg-teal-50 text-teal-700` |
| Mature | `#115E59` | `bg-teal-50 text-teal-700` |
| Decline | `#B45309` | `bg-amber-50 text-amber-700` |
| Retired | `#6B7280` | `bg-gray-100 text-gray-500` |

### Trend Lines

| Series | Hex | Usage |
|--------|-----|-------|
| Cost | `#7F1D1D` (Risk Red) | `CostValueTrend` cost line |
| Value | `#0F766E` (Accent Green) | `CostValueTrend` value area |
| Usage | `#1E40AF` (blue-800) | `UsageTrendChart` line |

### Cost Breakdown Donut

| Segment | Hex |
|---------|-----|
| Compute | `#1E40AF` (blue-800) |
| Storage | `#6D28D9` (violet-700) |
| Pipeline | `#B45309` (Alert Amber) |
| Human | `#6B7280` (gray-500) |

### Status Accents

| Variant | Background | Border | Text |
|---------|------------|--------|------|
| Positive | `bg-teal-50` | `border-teal-200` | `text-teal-800` |
| Warning | `bg-amber-50` | `border-amber-200` | `text-amber-700` |
| Negative | `bg-red-50` | `border-red-200` | `text-red-900` |
| Info | `bg-blue-50` | `border-blue-200` | `text-blue-700` |
| Purple | `bg-purple-50` | `border-purple-200` | `text-purple-700` |
| Neutral | `bg-gray-50` | `border-gray-200` | `text-gray-700` |

### ROI Band Colors

| Band | Class |
|------|-------|
| High (>3x) | `text-teal-700` |
| Healthy (1-3x) | `text-gray-900` |
| Underperforming (0-1x) | `text-amber-700` |
| Critical (<0x) | `text-red-900` |
| None (null) | `text-gray-300` |

**Verification:** Open BCG Matrix → inspect any dot → fill must match the lifecycle hex above, not a hardcoded value.

---

## E. Chart Consistency

| Rule | Token | How to Verify |
|------|-------|---------------|
| Grid lines | `strokeDasharray: "3 3"`, `stroke: #F7F8F9` | Open any chart → inspect `<line>` inside CartesianGrid |
| Axis lines | `stroke: #E5E7EB` | XAxis/YAxis axis line color |
| Tick labels | `fontSize: 11`, `fill: #9CA3AF` | Tick text is 11px gray-400 |
| Tooltip container | `rounded-lg border border-border bg-white px-3 py-2 shadow-lg text-xs` | Hover any data point → tooltip matches pattern |

**Verification:** Compare any two charts (e.g. BCG Matrix vs Usage Trend) — grid, axis, and tick styling must be identical.

---

## F. Buttons

| Size | Height | Font | Usage |
|------|--------|------|-------|
| `sm` | `h-8` (32px) | `text-xs` | Table actions, card CTAs, inline buttons |
| `md` | `h-9` (36px) | `text-sm` | Default buttons |
| `lg` | `h-10` (40px) | `text-sm` | Full-width primary actions |

**Verification:**
1. Every small button (`size="sm"`) must be exactly 32px tall — no h-7 remnants.
2. No button should use an ad-hoc height class.

---

## G. Reusable Components

### PageShell

| Check | Expected |
|-------|----------|
| All dashboard pages wrapped in `<PageShell>` | Yes — no inline `px-8 py-8` wrappers |
| Board-view page uses its own layout (not PageShell) | Yes — print-optimized custom layout |

### SectionHeader

| Check | Expected |
|-------|----------|
| Every card/section uses `<SectionHeader>` for its heading | No raw `<h2>` with inline styles |
| Icon badge is 28px (h-7 w-7) rounded-lg | Inspect icon container |
| Subtitle uses `text-xs text-gray-400 mt-0.5` | Consistent across all instances |
| Action slot renders flush-right | Verify alignment |

### Card

| Check | Expected |
|-------|----------|
| All content cards use `<Card>` or `card.*` tokens | No raw `rounded-lg border bg-white shadow-sm` patterns |
| Cards with onClick are keyboard accessible | Tab → Enter/Space triggers click |
| Cards with onClick have `cursor-pointer` | Hover shows pointer cursor |

### InsightCallout

| Check | Expected |
|-------|----------|
| Portfolio AI insights use `<InsightCallout>` | Not raw colored divs |
| Variant colors come from `statusColors` tokens | No hardcoded amber/emerald/blue backgrounds |
| Icon renders at 16px (h-4 w-4) with proper color | Consistent across all callouts |

### EmptyState

| Check | Expected |
|-------|----------|
| All empty states use `<EmptyState>` component | Dashed border, centered icon, title |
| Icon is 40px (h-10 w-10) gray-200 | Large muted icon |
| Inner padding is `p-12` | Generous whitespace |

### LifecyclePill

| Check | Expected |
|-------|----------|
| All stage badges use `<LifecyclePill>` | Not raw `<span>` with colors |
| `xs` size: `px-2 py-0.5 text-[10px]` | Used in tables and tight layouts |
| `sm` size: `px-2.5 py-1 text-xs` | Used in detail views |
| Color dot is `h-1.5 w-1.5 rounded-full` | Present on every pill |

### KPICard

| Check | Expected |
|-------|----------|
| Uses `cardTokens.base`, `cardTokens.hover`, `cardTokens.padding` | Not hardcoded shadow classes |
| Label is `text-[11px]` uppercase tracking-wide | Consistent with metric label token |
| Main value is `text-3xl font-semibold font-mono` | Matches display figure token |
| Variant border: positive=teal, negative=red, warning=amber | 2px left border accent |

---

## H. Board-Ready Export View

| Check | Expected |
|-------|----------|
| Route | `/portfolio/board-view` |
| Toolbar hidden on print | `data-print-hide` attribute on toolbar div |
| Content max width | `max-w-[1100px]` |
| Header includes logo, title, date, "Board of Directors" | Verify visually |
| KPI grid | 6 columns, matching portfolioSummary data |
| Cost vs Value chart renders | CostValueTrend component with 220px height |
| Top Performers table | Top 5 by ROI, with rank/name/cost/ROI/stage columns |
| Recommended Actions | 4 callout cards (retire, cost spikes, growth, value gap) |
| Footer | "Generated by Strata" + "Confidential" |

### Print Styles (`globals.css`)

| Rule | Implementation |
|------|----------------|
| Sidebar/nav hidden | `aside, nav, [data-print-hide] { display: none !important }` |
| Shadows removed | `* { box-shadow: none !important }` |
| Section break control | `section { break-inside: avoid }` |
| Page size | `@page { size: landscape; margin: 1cm }` |
| Color preservation | `print-color-adjust: exact` |

**Verification:**
1. Navigate to `/portfolio/board-view` → click "Print / Export PDF".
2. In print preview: toolbar should be hidden, chart colors preserved, no page breaks mid-section.
3. PDF should be landscape A4 with 1cm margins.

---

## I. Spacing & Alignment Consistency

| Rule | How to Verify |
|------|---------------|
| No `text-base` section headers anywhere | `grep -r "text-base.*font-semibold" src/app/` returns 0 results |
| No `h-7` small buttons (except icon containers) | `grep -r '"h-7"' src/app/` — only SectionHeader icon badge uses h-7 |
| No hardcoded chart hex colors in components | `grep -r '"#[0-9A-Fa-f]"' src/components/charts/` returns 0 results |
| All `mb-4` section gaps replaced with `mb-5` | SectionHeader standardizes to mb-5 |
| All small button heights are `h-8` | `grep -r 'size="sm"' src/app/` — verify each uses default h-8 |

---

## J. Accessibility

| Rule | How to Verify |
|------|---------------|
| Clickable cards have `role="button"` | Inspect Card with onClick — role attribute present |
| Clickable cards have `tabIndex={0}` | Tab key reaches the card |
| Clickable cards respond to Enter/Space | Press Enter on focused card — triggers onClick |
| KPI info tooltips are keyboard accessible | Tab to info icon → tooltip appears |
| Color is never the sole indicator | Every colored badge has a text label (e.g., LifecyclePill has dot + text) |

---

## K. Quick Smoke Test (5-minute check)

1. **Portfolio** — 6 KPI cards render with mono values, BCG matrix shows colored dots, "Board-ready view" button visible
2. **Assets** — Table renders in a card container, lifecycle pills have colored dots, row hover works
3. **Asset Detail** — All section cards have SectionHeader with icons, charts render with token colors
4. **Lifecycle** — Stage distribution bar chart, 3 action cards with distinct colors, empty states show dashed borders
5. **Marketplace** — Search bar works, product cards have consistent padding/shadow, Subscribe button is h-8
6. **Simulate** — Slider inputs work, results Card has hover shadow, empty state renders when no simulation run
7. **Setup** — All section headers use SectionHeader (not text-base), connector cards use card.container tokens
8. **Board View** — Print button works, layout is print-optimized, confidential footer visible

---

*Last updated: 2026-02-25*
*Token source: `src/lib/tokens.ts`*
