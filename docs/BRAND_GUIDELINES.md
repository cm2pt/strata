# Strata — Brand Guidelines

## Brand Philosophy

Strata exists in the **Data Capital Management** category. It treats data as a financial asset class — measurable, allocatable, and accountable.

The brand is **institutional, minimal, financial, and calm**. Every surface communicates precision, trust, and executive credibility.

**Tagline:** Govern Data as Capital.
**Positioning:** The financial operating system for enterprise data portfolios.

---

## Category

**Data Capital Management** — not data governance, not data catalogs, not BI.

Strata sits at the intersection of data management and financial discipline. It is the control plane that makes data spend visible, turns visibility into decisions, and turns decisions into institutional memory.

---

## Color Palette

### Primary

| Name | Hex | Usage |
|------|-----|-------|
| Deep Navy | `#0E1A2B` | Primary brand, logo bg, hero sections, footer |
| Off White | `#F7F8F9` | Page backgrounds, card backgrounds |
| Graphite | `#1F2937` | Primary text (foreground) |

### Accent

| Name | Hex | Usage |
|------|-----|-------|
| Accent Green | `#0F766E` | Positive metrics, CTAs, teal-700 |
| Alert Amber | `#B45309` | Warnings, decline lifecycle |
| Risk Red | `#7F1D1D` | Destructive actions, critical metrics |

### Extended Chart Palette

| Token | Hex |
|-------|-----|
| lifecycle.active | `#2563EB` |
| lifecycle.growth | `#0F766E` |
| lifecycle.mature | `#115E59` |
| lifecycle.decline | `#B45309` |
| costBreakdown | `#1E40AF`, `#6D28D9`, `#B45309`, `#6B7280` |

### Rules

- Never use neon or saturated accent colors
- Positive values always use teal (not emerald/green)
- Negative values always use deep red (not bright red)
- Chart grid lines use Off White (`#F7F8F9`)

---

## Typography

**Font:** Inter (Google Fonts)
**Mono:** JetBrains Mono (financial figures)

| Token | Spec |
|-------|------|
| sectionTitle | `text-sm font-semibold text-gray-900 tracking-tight` |
| displayMono | `text-3xl font-semibold font-mono tabular-nums tracking-tight` |
| metricLabel | `text-[11px] font-medium text-gray-500 uppercase tracking-wide` |
| heroHeadline | `text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight` |
| metricDisplay | `text-4xl sm:text-5xl font-semibold font-mono tabular-nums tracking-tight` |

### Rules

- Use `tracking-tight` on section titles and headings
- Use `tabular-nums` on **all** financial figures (enforced in tokens)
- Weight range: 400 (body), 500 (labels), 600 (headings) — never 700+
- No decorative or serif fonts

---

## Voice & Tone

- **Institutional** — write like a financial operating system, not a SaaS product
- **Precise** — use exact language: "capital freed" not "savings", "portfolio ROI" not "value"
- **Calm** — no exclamation marks, no urgency, no hype
- **Executive-first** — every sentence should be defensible in a board presentation

### Vocabulary Rules

| Use | Avoid |
|-----|-------|
| Data capital | Data assets |
| Portfolio | Collection |
| Capital event | Action |
| Governance | Management |
| Financial control plane | Platform |
| Prove impact | Show value |

---

## Visual Rules

### Spacing

- Page shell: `px-8 py-8 space-y-7`
- Card padding: `p-6`
- Section gap: `mb-5`
- Page gap: `space-y-7`
- Spacing scale: 4, 8, 16, 24, 32, 48, 64, 96 (px)

### Cards

- `rounded-xl border border-gray-200 shadow-sm`
- No drop shadows beyond elevation level 2
- No gradients on cards

### Borders

- Standard: `border-gray-200`
- Subtle: `border-gray-100`
- Active: `border-gray-300`

### Elevation

| Level | Shadow | Usage |
|-------|--------|-------|
| 0 | none | Flat surfaces |
| 1 | `shadow-[0_1px_3px_rgba(0,0,0,0.04)]` | Resting cards |
| 2 | `shadow-[0_4px_12px_rgba(0,0,0,0.06)]` | Hover / raised |

---

## Logo

The Strata logo is a geometric diamond mark in a rounded rectangle, rendered as SVG.

### Assets

| File | Location | Usage |
|------|----------|-------|
| `strata-logo-mark.svg` | `/public/brand/` | Diamond mark only |
| `strata-logo.svg` | `/public/brand/` | Full horizontal lockup (mark + wordmark) |
| `strata-logo-dark.svg` | `/public/brand/` | For dark backgrounds |
| `strata-logo-light.svg` | `/public/brand/` | For light backgrounds |
| `favicon.svg` | `/public/brand/` | Browser tab icon |

### React Component

Use `<StrataLogo>` from `@/components/shared/strata-logo`:

```tsx
<StrataLogo variant="mark" theme="light" size="md" />  // Sidebar
<StrataLogo variant="full" theme="dark" size="lg" />    // Hero
<StrataLogo variant="full" theme="dark" size="sm" />    // Footer
```

### Sizes

| Size | Dimensions | Context |
|------|-----------|---------|
| sm | 28px | Footer, inline |
| md | 32px | Sidebar, login |
| lg | 36px | Hero, marketing |

### Rules

- Logo background is always Deep Navy or `rgba(255,255,255,0.1)` on dark backgrounds
- Never use a colored background for the logo
- Always pair with "Strata" text label when space allows
- Never use Unicode diamond `◆` — always use the SVG component

---

## Animation

### Durations

| Token | Value | Usage |
|-------|-------|-------|
| fast | 150ms | Hover, focus, micro-interactions |
| normal | 300ms | Toggle, reveal |
| slow | 500ms | Entrance, scroll reveal |

### Curves

| Token | Value | Usage |
|-------|-------|-------|
| default | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard transitions |
| enter | `cubic-bezier(0, 0, 0.2, 1)` | Entry animations |
| exit | `cubic-bezier(0.4, 0, 1, 1)` | Exit animations |

### Principles

- Enterprise calm — controlled, never flashy
- No parallax, no bouncing, no spring physics
- No gratuitous animation — motion serves comprehension
- Scroll-triggered fade-in for marketing sections
- 150ms hover elevation for interactive cards
- SVG line-draw for chart mockups (2s)

### CSS Classes

| Class | Effect |
|-------|--------|
| `.fade-in-up` + `.visible` | Scroll reveal (opacity + translateY) |
| `.stagger-children` | Staggered child animation (100ms intervals) |
| `.animate-line-draw` | SVG stroke animation |
| `.btn-interactive` | Button hover lift + shadow |
| `.card-elevate` | Card hover elevation |

---

## Chart Rules

- Grid: Off White (`#F7F8F9`)
- Axis lines: `#E5E7EB`
- Tick labels: `#9CA3AF`
- Use muted, institutional colors — no bright blues or greens
- Area fills should be semi-transparent (opacity 0.1-0.3)
- Always include axis labels and units

---

## Favicon & Meta

| Asset | Location | Size |
|-------|----------|------|
| `favicon.svg` | `/public/brand/` | Scalable |
| `favicon-32.png` | `/public/brand/` | 32x32 |
| `favicon-16.png` | `/public/brand/` | 16x16 |
| `apple-touch-icon.png` | `/public/brand/` | 180x180 |
| OG image | Dynamic via `opengraph-image.tsx` | 1200x630 |

SEO metadata, Open Graph, Twitter Card, and JSON-LD structured data are configured in `app/layout.tsx`.

---

## Do / Don't

| Do | Don't |
|----|-------|
| Use "Strata" as the product name | Use "Data Asset OS" anywhere |
| Use Deep Navy for primary brand surfaces | Use black (`#000`) for brand elements |
| Use teal for positive indicators | Use emerald/green for positive |
| Write in calm, institutional voice | Use exclamation marks or hype language |
| Use `tracking-tight` on headings | Use loose letter spacing |
| Keep sections `py-24` on marketing pages | Use tight spacing on marketing surfaces |
| Use Inter for all text | Mix in other font families |
| Use SVG `<StrataLogo>` component | Use Unicode `◆` for logo |
| Use `tabular-nums` on financial figures | Use proportional figures for numbers |
| Use 150ms transitions on hover states | Use bouncy or spring animations |
