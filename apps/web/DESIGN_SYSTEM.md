# Strata Design System

> Implementation guide for the Strata visual language. All tokens, components, and patterns for building consistent UI.

---

## Tokens

All design tokens live in `src/lib/tokens.ts`. Import what you need:

```tsx
import { brand, typography, card, chartColors, spacing, elevationScale } from "@/lib/tokens";
```

### Color Tokens

```tsx
brand.deepNavy     // "#0B1220" — hero bg, primary dark
brand.offWhite     // "#F7F8F9" — light section bg
brand.graphite     // "#1A2332" — primary text
brand.slate        // "#4B5563" — secondary text
brand.accentGreen  // "#0F766E" — CTAs, positive
brand.riskRed      // "#7F1D1D" — cost, liability
brand.alertAmber   // "#B45309" — warnings
brand.borderLight  // "#E5E7EB" — card/input borders
brand.borderSubtle // "#F0F1F3" — dividers
```

CSS variables (via `globals.css`):
```css
var(--background)  /* oklch light/dark aware */
var(--foreground)
var(--primary)
var(--border)
var(--ring)
```

### Typography Tokens

**App UI:**
```tsx
typography.sectionTitle   // "text-sm font-semibold text-gray-900 tracking-tight"
typography.sectionSubtitle // "text-xs text-gray-400 mt-0.5"
typography.metricLabel    // "text-[11px] uppercase tracking-wide text-gray-500"
typography.displayMono    // "text-3xl font-semibold tracking-tight ... font-mono tabular-nums"
typography.valueMono      // "text-lg font-semibold ... font-mono tabular-nums"
typography.tableMono      // "text-sm font-medium ... font-mono tabular-nums"
typography.tableHeader    // "text-[11px] font-medium uppercase tracking-wider text-gray-400"
```

**Marketing:**
```tsx
marketingTypography.heroHeadline    // "text-4xl sm:text-5xl lg:text-6xl ..."
marketingTypography.heroSubheadline // "text-lg sm:text-xl leading-relaxed"
marketingTypography.sectionLabel    // "text-sm font-medium uppercase tracking-wider"
marketingTypography.sectionHeadline // "text-2xl sm:text-3xl font-semibold tracking-tight"
marketingTypography.metricDisplay   // "text-4xl sm:text-5xl font-semibold font-mono ..."
```

### Spacing Tokens

```tsx
spacing.sectionGap  // "mb-5"
spacing.pageGap     // "space-y-7"
spacing.pageShell   // "px-8 py-8 space-y-7 max-w-[1440px] mx-auto"
```

### Elevation Tokens

```tsx
elevationScale[0]  // "shadow-none"
elevationScale[1]  // "shadow-[0_1px_3px_rgba(0,0,0,0.04)]" — resting
elevationScale[2]  // "shadow-[0_4px_12px_rgba(0,0,0,0.06)]" — hover
```

---

## Components

### Buttons

Use shadcn `<Button>` from `@/components/ui/button`. Variants:

| Variant | Use |
|---|---|
| `default` | Primary actions (dark background) |
| `outline` | Secondary actions |
| `ghost` | Tertiary / inline actions |
| `destructive` | Dangerous / irreversible actions |

Sizes: `xs`, `sm`, `default`, `lg`, `icon`

```tsx
import { Button } from "@/components/ui/button";

<Button variant="default" size="default">Save Changes</Button>
<Button variant="outline" size="sm">Cancel</Button>
```

For marketing CTAs, use the `btn-interactive` class for hover lift:
```tsx
<a className="btn-interactive rounded-lg px-6 py-3 text-sm font-medium text-white"
   style={{ backgroundColor: brand.accentGreen }}>
  Request Briefing
</a>
```

### Inputs

Use the `input-institutional` class for enterprise-grade inputs:

```tsx
<input
  className="input-institutional w-full rounded-lg border px-3.5 py-2.5 text-sm"
  style={{ borderColor: brand.borderLight, color: brand.graphite }}
  placeholder="you@company.com"
/>
```

Focus state: dark ring with `box-shadow: 0 0 0 3px rgba(11,18,32,0.08)`.

### Cards

Use the `card` token from `tokens.ts`:

```tsx
import { card } from "@/lib/tokens";

<div className={card.container}>Standard card</div>
<div className={card.clickable}>Interactive card</div>
```

Or compose manually:
```tsx
<div className="card-elevate rounded-xl border bg-white p-6"
     style={{ borderColor: brand.borderLight }}>
  Content
</div>
```

### Badges

Use shadcn `<Badge>` with status color tokens:

```tsx
import { statusColors } from "@/lib/tokens";

<div className={`px-2 py-0.5 rounded text-xs font-medium border ${statusColors.positive.badge}`}>
  Active
</div>
```

Status variants: `positive`, `warning`, `negative`, `info`, `purple`, `neutral`

### Tables

Use shadcn `<Table>` components with typography tokens:

```tsx
<TableHeader>
  <TableRow>
    <TableHead className={typography.tableHeader}>Product</TableHead>
    <TableHead className={typography.tableHeader}>Monthly Cost</TableHead>
  </TableRow>
</TableHeader>
<TableBody>
  <TableRow>
    <TableCell className="text-sm">Customer 360</TableCell>
    <TableCell className={typography.tableMono}>$18,400</TableCell>
  </TableRow>
</TableBody>
```

### Charts

All charts use `recharts`. Apply consistent styling via `chartAxis` tokens:

```tsx
import { chartAxis, chartColors } from "@/lib/tokens";

<XAxis {...chartAxis.tick} />
<YAxis {...chartAxis.tick} />
<CartesianGrid {...chartAxis.cartesianGrid} />
<Line stroke={chartColors.value} />
```

### Empty States

Use `<EmptyState>` from `@/components/shared/empty-state`:

```tsx
<EmptyState
  icon={BarChart3}
  title="No data products"
  description="Connect a data source to see your portfolio."
/>
```

### Alerts / Error States

For form errors:
```tsx
<div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
  Error message
</div>
```

For inline warnings, use `statusColors.warning`:
```tsx
<div className={`rounded-lg px-4 py-3 text-sm border ${statusColors.warning.bg} ${statusColors.warning.border} ${statusColors.warning.text}`}>
  Warning message
</div>
```

---

## Layout Rules

### Marketing Pages

```
Section padding: py-24 (96px)
Content max-width: max-w-6xl (1152px)
Content padding: px-6 (24px)
Section background alternates: deepNavy → offWhite → white → deepNavy
```

### App Pages

```
Page shell: px-8 py-8 space-y-7 max-w-[1440px] mx-auto
Section gap: mb-5
Card gap: gap-4 or gap-6
Sidebar: fixed 60px left margin
```

### Responsive Breakpoints

| Breakpoint | Width | Use |
|---|---|---|
| `sm` | 640px | Stack → side-by-side for small cards |
| `md` | 768px | 2-3 column grids |
| `lg` | 1024px | Full desktop layout |
| `xl` | 1280px | Max content width |

---

## CSS Utilities

### Marketing Animations

| Class | Purpose |
|---|---|
| `.fade-in-up` + `.visible` | Scroll reveal |
| `.stagger-children` | Auto-stagger child animations |
| `.animate-line-draw` | SVG chart line animation |
| `.btn-interactive` | Button hover lift |
| `.card-elevate` | Card hover elevation |
| `.animate-count-up` | Metric entrance |

### Brand Utilities

| Class | Purpose |
|---|---|
| `.ledger-divider` | Subtle gradient divider (light bg) |
| `.ledger-divider-dark` | Subtle gradient divider (dark bg) |
| `.metric-stripe` | Left accent border on metrics |
| `.input-institutional` | Focus ring for enterprise inputs |

---

## Accessibility Checklist

- [ ] All interactive elements have visible focus indicators
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 for text, 3:1 for large text)
- [ ] All images/SVGs have `alt` or `aria-label` attributes
- [ ] Form inputs have associated `<label>` elements
- [ ] Error messages are announced to screen readers
- [ ] Focus order follows visual order
- [ ] No information conveyed by color alone
- [ ] Touch targets are at least 44x44px on mobile
- [ ] Animations respect `prefers-reduced-motion`
- [ ] All text is readable at 200% zoom

---

## Page Layout Standard

Every page uses `<PageHeader>` (replaces `Topbar`) + `<PageShell>` with consistent loading/error/empty patterns.

### PageHeader

```tsx
import { PageHeader } from "@/components/layout/page-header";

// List page with actions
<PageHeader title="Portfolio" subtitle="Capital overview" primaryAction={...} />

// Detail page with breadcrumbs
<PageHeader title={name} breadcrumbs={[{ label: "Assets", href: "/assets" }, { label: name }]} />
```

### Skeleton Loading

```tsx
import { KPISkeleton, CardSkeleton, TableSkeleton } from "@/components/shared/skeleton";

// Show PageHeader + skeletons while data loads — never "Loading..." text
```

### Navigation

Sidebar grouped: **Discover** → **Govern** → **Optimize** → **Measure** → **Platform**. Global search via `Cmd+K` command palette.

### Demo Mode

Amber banner when offline: `<DemoModeBanner />` in layout. See `docs/demo-mode.md`.

---

## How to Extend

### Adding a new component

1. Check if shadcn has it: `npx shadcn@latest add [component]`
2. If custom, create in `src/components/shared/`
3. Use tokens from `@/lib/tokens` — never hardcode colors
4. Apply `brand.borderLight` for borders, `brand.graphite` for text
5. Use `card-elevate` or `btn-interactive` for hover states

### Adding a new page

1. Create in `src/app/(dashboard)/[route]/page.tsx`
2. Use `<PageHeader>` (not `Topbar`) for the sticky header with title, subtitle, and action slots
3. Wrap content in `<PageShell>` for consistent layout
4. Add skeleton loading state using `KPISkeleton`, `CardSkeleton`, `TableSkeleton` from `@/components/shared/skeleton`
5. Use `<SectionHeader>` for section titles
6. Use `<ErrorState>` for failed data loads, `<EmptyState>` for empty data sets
7. Detail pages: add `breadcrumbs` prop to `PageHeader`
8. See `docs/ux-standards.md` for full patterns

### Adding a new chart

1. Create component in `src/components/charts/` — never inline in page files
2. Use centralized tokens from `@/lib/chart-colors`:
   - `CHART_COLORS` for multi-series (primary, secondary, tertiary, etc.)
   - `CHART_SEMANTIC` for data types (revenue, cost, roi, risk)
   - `PIE_COLORS` for donut/pie charts
   - `CHART_GRID` for CartesianGrid styling
   - `CHART_TOOLTIP` for Tooltip contentStyle
3. Type tooltip payloads using `ChartTooltipPayload` from `@/lib/chart-colors`
4. Lazy-load chart via `next/dynamic` with `ssr: false` — Recharts uses `window`
5. Add empty array guard: `if (!data || data.length === 0) return <EmptyState />`
6. Wrap in `<FadeInSection>` for scroll reveal on marketing pages

### API Response Validation

Use Zod schemas from `@/lib/api/schemas` to validate API responses:

```tsx
import { DataProductSchema, validateResponse } from "@/lib/api/schemas";

const data = await apiGet<DataProduct>("/data-products/123");
const validated = validateResponse(DataProductSchema, data, "/data-products/123");
```

Schemas log warnings in dev mode but never throw in production. Use `.passthrough()` on all schemas to tolerate new backend fields.

### API Endpoints

All endpoint paths are centralized in `@/lib/api/endpoints`:

```tsx
import { API_ENDPOINTS } from "@/lib/api/endpoints";

await apiGet(API_ENDPOINTS.DATA_PRODUCTS);
await apiGet(API_ENDPOINTS.DECISION("abc-123"));
```

### Feature Flags

Simple env-var flags in `@/lib/feature-flags`:

```tsx
import { useFeatureFlag } from "@/lib/feature-flags";

function MyComponent() {
  const showPalette = useFeatureFlag("COMMAND_PALETTE");
  if (!showPalette) return null;
  // ...
}
```

Override via `NEXT_PUBLIC_FF_<FLAG>=false` in `.env`.

### Page Decomposition Pattern

Pages over ~300 lines should be decomposed into a `components/` folder:

```
src/app/(dashboard)/my-page/
  page.tsx           ← Data fetching, state, handlers, composition
  components/
    MyPageKPIs.tsx   ← KPI card row
    MyPageTable.tsx  ← Main data table
    MyPageChart.tsx  ← Chart section
    MyPageDialog.tsx ← Dialogs/modals
    index.ts         ← Barrel exports
```

Rules:
- Data fetching hooks stay in `page.tsx`
- State (`useState`) stays in `page.tsx`
- Action handlers stay in `page.tsx`
- Sub-components receive data via typed props
- Each component file ≤150 lines

---

## Capital Hierarchy Components

The Portfolio page follows a capital-dominant information hierarchy. See `docs/ui-capital-hierarchy.md` for the full specification.

### Key Components

| Component | Purpose |
|-----------|---------|
| `CapitalHeader` | Hero metric (Monthly Data Capital Spend) + 3 secondary metrics + Board Snapshot pill |
| `CapitalActions` | Horizontal strip of 3-5 action cards with $ impact, confidence, approver, CTA |
| `DecisionCockpit` | Decision Queue table + Coverage & Auditability sidebar (replaces Executive Intelligence) |
| `InactionCost` | Warning module: projected spend + liability if no action taken |
| `CapitalFlowChart` | Stacked bar chart: monthly spend, misallocation, freed, recovered |

### Composition Hook

```tsx
import { useCapitalModel } from "@/lib/hooks/use-capital-model";

const { data: model, loading } = useCapitalModel();
// model: CapitalModel — all capital metrics derived from 10 existing hooks
```

### Color Semantics

- **Teal** (`brand.accentGreen`) — capital freed, positive outcomes
- **Amber** (`brand.alertAmber`) — misallocated, at-risk, warnings
- **Red** (`brand.riskRed`) — cost, liability, overdue
- **Blue** (`#2563EB`) — recovered / pricing revenue
- **Navy** (`brand.deepNavy`) — board-level authority elements

### Formatting

All capital amounts use `formatCurrency(value, true)` for compact display ($K/$M). Decision latency in days, confidence as percentage, ROI as multiplier (`X.Xx`).

---

## Infrastructure

### Circuit Breaker

API calls are protected by a circuit breaker (`@/lib/api/circuit-breaker`):
- After 5 consecutive failures to the same endpoint prefix, requests are short-circuited
- 30-second cooldown before retrying with a half-open probe
- Automatic recovery on successful probe

### CSRF Protection

Mutations use double-submit cookie pattern:
- Backend sets `csrf_token` cookie on login
- Frontend reads cookie and sends as `X-CSRF-Token` header on POST/PATCH/DELETE
- Backend middleware validates they match

### Build & Deploy

```tsx
import { BUILD_ID } from "@/lib/build-info";
// BUILD_ID = git SHA (injected via NEXT_PUBLIC_BUILD_ID)
```

Bundle analysis: `npm run analyze` (opens bundle visualization).

### Environment Validation

All env vars are validated at startup via `@/lib/env.ts`:
- `NEXT_PUBLIC_API_URL` — validated URL format
- `NEXT_PUBLIC_DEMO_MODE` — blocked in production with warning
- Feature flags — `NEXT_PUBLIC_FF_<FLAG>` overrides

### Quality Commands

```bash
npm run check     # tsc + lint + tests (single command)
npm run analyze   # Bundle size visualization
```
