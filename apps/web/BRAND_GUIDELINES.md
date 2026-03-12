# Strata Brand Guidelines

> Data Capital Management — the financial operating system for enterprise data portfolios.

---

## Brand Positioning

**Category:** Data Capital Management
**Tone:** Institutional, financially authoritative, calm confidence. Never startup, never playful.
**Audience:** CFOs, CDOs, data leadership, board-level stakeholders.

### Voice Principles

| Do | Don't |
|---|---|
| "Capital allocation framework" | "Cool dashboard" |
| "Depreciation schedule" | "Analytics tool" |
| "Governance failure" | "Data problem" |
| "Decision latency" | "Slow process" |
| "Auditability" | "Transparency" |
| "Liability gap" | "Cost issue" |

### Vocabulary

Use financial / governance language consistently:
- **Capital** (not "budget" or "money")
- **Depreciation** (not "decline" or "decrease")
- **Liability** (not "cost" or "expense")
- **Governance** (not "management" or "oversight")
- **Allocation** (not "distribution" or "assignment")
- **Provenance** (not "history" or "tracking")

---

## Logo

### The Mark

The Strata mark is a **double diamond** with **capital grid lines**:

- **Outer diamond (outline):** Represents the full scope of the data portfolio
- **Inner diamond (solid):** Represents governed, measured capital
- **Three horizontal lines:** Evoke a balance sheet / financial ledger ("capital grid" motif)

### Variants

| Variant | File | Use |
|---|---|---|
| Mark only | `public/brand/strata-logo-mark.svg` | App icon, favicon, tight spaces |
| Full (light bg) | `public/brand/strata-logo-light.svg` | Light backgrounds |
| Full (dark bg) | `public/brand/strata-logo-dark.svg` | Dark backgrounds (hero, footer) |
| Default | `public/brand/strata-logo.svg` | General use |

### React Component

```tsx
import { StrataLogo } from "@/components/shared/strata-logo";

<StrataLogo variant="mark" theme="light" size="md" />
<StrataLogo variant="full" theme="dark" size="lg" />
```

Props: `variant` (mark | full), `theme` (light | dark), `size` (sm | md | lg)

### Clear Space

Maintain a minimum clear space equal to the inner diamond width around the mark on all sides. Never place the logo on busy backgrounds without sufficient contrast.

### Logo Don'ts

- Do not stretch or distort the mark
- Do not change the diamond proportions
- Do not remove the grid lines from the mark
- Do not place on backgrounds with insufficient contrast
- Do not add drop shadows or effects to the mark
- Do not use the wordmark without the mark

---

## Color Palette

### Primary

| Name | Hex | Use |
|---|---|---|
| Deep Navy | `#0B1220` | Hero backgrounds, primary dark surfaces |
| Graphite | `#1A2332` | Primary text on light backgrounds |
| Slate | `#4B5563` | Secondary text, descriptions |
| Off White | `#F7F8F9` | Light section backgrounds |

### Accent

| Name | Hex | Use |
|---|---|---|
| Capital Green | `#0F766E` | Primary CTAs, positive indicators, accent |
| Capital Green Dark | `#115E59` | Hover states on green CTAs |
| Alert Amber | `#B45309` | Warnings, caution states |
| Risk Red | `#7F1D1D` | Negative indicators, cost lines, liability |

### Borders & Surfaces

| Name | Hex | Use |
|---|---|---|
| Border Light | `#E5E7EB` | Card borders, input borders |
| Border Subtle | `#F0F1F3` | Dividers, section separators |

### Chart Colors

See `src/lib/tokens.ts` → `chartColors` for the complete data visualization palette.

---

## Typography

### Typefaces

| Face | Family | Use |
|---|---|---|
| Inter | `--font-inter` | All UI text, headings, body |
| JetBrains Mono | `--font-mono` | Financial figures, metrics, code |

### Scale

| Token | Classes | Use |
|---|---|---|
| Hero Headline | `text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight` | Landing page hero |
| Section Headline | `text-2xl sm:text-3xl font-semibold tracking-tight` | Section titles |
| Section Label | `text-sm font-medium uppercase tracking-wider` | Above section headlines |
| Body | `text-sm` or `text-base` | Paragraph text |
| Metric Display | `text-4xl sm:text-5xl font-semibold font-mono tabular-nums` | Large financial figures |
| Metric Label | `text-[11px] uppercase tracking-wide` | KPI labels |
| Table Mono | `text-sm font-medium font-mono tabular-nums` | Table financial data |

### Rules

- All financial figures use `font-mono tabular-nums` for alignment
- Headlines use `tracking-tight` for density
- Labels use `uppercase tracking-wider` for authority
- Never use more than 3 type sizes on a single screen

---

## Capital Grid Motif

The "capital grid" is a subtle ledger-line pattern used consistently across the brand:

1. **In the logo mark:** Three horizontal lines through the diamond
2. **As section backgrounds:** `<CapitalGrid />` component renders faint grid on hero/dark sections
3. **As dividers:** `.ledger-divider` / `.ledger-divider-dark` CSS classes
4. **As metric accents:** `.metric-stripe` adds a left accent line

### Usage Rules

- Always use at very low opacity (3-7% depending on context)
- Never make the grid prominent — it should be felt, not seen
- Use consistently across dark sections for brand reinforcement
- The grid is horizontal-primary (balance sheet lines), with occasional verticals

---

## Iconography

### Library

Use [Lucide React](https://lucide.dev/) exclusively. Do not mix icon libraries.

### Style Rules

- Default size: `h-5 w-5` (20px) for cards, `h-4 w-4` (16px) for inline
- Color: Match the surrounding text color
- Stroke width: Use defaults (never modify stroke-width)
- Never use filled/solid variants — outline only

---

## Chart & Data Visualization

### Colors

- **Value / positive:** `#0F766E` (Capital Green)
- **Cost / liability:** `#7F1D1D` (Risk Red)
- **Usage / volume:** `#1E40AF` (Blue)
- **Grid lines:** `#F7F8F9` (Off White)
- **Axis lines:** `#E5E7EB`
- **Tick labels:** `#9CA3AF`

### Rules

- All charts use `recharts` (composable, React-native)
- Grid lines should be very subtle (`strokeDasharray: "3 3"`)
- Always include clear axis labels
- Financial figures on axes use abbreviated format ($1.2M, not $1,200,000)
- Animations: line-draw on scroll reveal, 2s duration, ease curve
- Dark-background charts (like Capital Pressure) use white labels at 30% opacity

---

## Motion & Animation

### Principles

- **Purposeful:** Animation serves comprehension, never decoration
- **Restrained:** Enterprise software should feel calm, not bouncy
- **Fast:** Micro-interactions at 150ms, transitions at 300ms, entrances at 500ms

### Curves

- Default: `cubic-bezier(0.4, 0, 0.2, 1)` — smooth deceleration
- Entry: `cubic-bezier(0, 0, 0.2, 1)` — fast start, gentle stop
- Exit: `cubic-bezier(0.4, 0, 1, 1)` — gentle start, fast finish

### Available Utilities

| Class | Effect |
|---|---|
| `.fade-in-up` + `.visible` | Scroll reveal (16px translate + opacity) |
| `.stagger-children` | Auto-stagger children by 100ms each |
| `.animate-line-draw` | SVG stroke animation for charts |
| `.btn-interactive` | Button hover lift + shadow |
| `.card-elevate` | Card hover elevation |
| `.animate-count-up` | Metric entrance animation |

---

## Spacing

### Grid

8-point grid system: `4, 8, 16, 24, 32, 48, 64, 96` px.

### Page Layout

- Max content width: `max-w-6xl` (1152px) for marketing, `max-w-[1440px]` for app
- Section padding: `py-24` (96px) for marketing sections
- Content padding: `px-6` (24px) responsive
- Card padding: `p-6` (24px) standard, `p-8` or `p-10` for feature cards
