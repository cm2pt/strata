# Strata — Visual System Reference

Technical reference for the Strata visual identity implementation. For brand philosophy and rules, see [BRAND_GUIDELINES.md](./BRAND_GUIDELINES.md).

---

## Logo System

### Assets

All logo SVGs live in `apps/web/public/brand/`:

| File | Variant | Background | Usage |
|------|---------|------------|-------|
| `strata-logo-mark.svg` | Diamond mark only | Light | Sidebar (collapsed), favicon fallback |
| `strata-logo.svg` | Full lockup (mark + wordmark) | Light | Marketing hero (light sections), documentation |
| `strata-logo-dark.svg` | Full lockup | Dark | Hero sections, footer, dark surfaces |
| `strata-logo-light.svg` | Full lockup | Light | Default light-background usage |
| `favicon.svg` | Minimal diamond | N/A | Browser tab icon |

### React Component

Use `<StrataLogo>` from `@/components/shared/strata-logo` for all in-app logo rendering. Never use `<img>` tags or Unicode glyphs.

```tsx
import { StrataLogo } from "@/components/shared/strata-logo";

// Sidebar (collapsed)
<StrataLogo variant="mark" theme="light" size="md" />

// Marketing hero (dark bg)
<StrataLogo variant="full" theme="dark" size="lg" />

// Footer (dark bg)
<StrataLogo variant="full" theme="dark" size="sm" />

// Login page
<StrataLogo variant="mark" theme="light" size="lg" />
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"mark" \| "full"` | `"mark"` | Diamond only vs. mark + "Strata" wordmark |
| `theme` | `"light" \| "dark"` | `"light"` | Light: Deep Navy bg, white diamond. Dark: translucent bg, white all |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | sm=28px, md=32px, lg=36px |
| `className` | `string` | — | Additional CSS classes |

### Rules

- Always use `<StrataLogo>` — never Unicode `◆` or `<img>` referencing SVG files
- Logo mark background is always Deep Navy (`#0E1A2B`) on light surfaces
- Logo mark background is `rgba(255,255,255,0.1)` on dark surfaces
- Pair with "Strata" text label when space allows (use `variant="full"`)
- Minimum clear space: 8px on all sides

---

## Design Tokens

All tokens are defined in `apps/web/src/lib/tokens.ts`. Import by name:

```tsx
import { card, typography, brand, marketingTypography } from "@/lib/tokens";
```

### Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `brand.deepNavy` | `#0E1A2B` | Primary brand, hero, footer, logo bg |
| `brand.offWhite` | `#F7F8F9` | Page backgrounds, card backgrounds |
| `brand.graphite` | `#1F2937` | Primary text foreground |
| `brand.accentGreen` | `#0F766E` | Positive metrics, CTAs, teal-700 |
| `brand.accentGreenDark` | `#115E59` | Hover states for teal CTAs |
| `brand.alertAmber` | `#B45309` | Warnings, decline lifecycle |
| `brand.riskRed` | `#7F1D1D` | Destructive actions, critical metrics |

### Typography Tokens

**Dashboard:**

| Token | Spec |
|-------|------|
| `typography.sectionTitle` | `text-sm font-semibold text-gray-900 tracking-tight` |
| `typography.displayMono` | `text-3xl font-semibold font-mono tabular-nums tracking-tight` |
| `typography.metricLabel` | `text-[11px] font-medium text-gray-500 uppercase tracking-wide` |

**Marketing:**

| Token | Spec |
|-------|------|
| `marketingTypography.heroHeadline` | `text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.08]` |
| `marketingTypography.heroSubheadline` | `text-lg sm:text-xl leading-relaxed` |
| `marketingTypography.sectionLabel` | `text-sm font-medium uppercase tracking-wider` |
| `marketingTypography.sectionHeadline` | `text-2xl sm:text-3xl font-semibold tracking-tight` |
| `marketingTypography.metricDisplay` | `text-4xl sm:text-5xl font-semibold font-mono tabular-nums tracking-tight` |
| `marketingTypography.metricCaption` | `text-sm font-medium uppercase tracking-wider` |

### Spacing Scale

```ts
spacingScale = [4, 8, 16, 24, 32, 48, 64, 96] // px
```

- Page shell: `px-8 py-8 space-y-7`
- Card padding: `p-6`
- Section gap: `mb-5`
- Marketing sections: `py-24`

### Elevation Scale

| Level | Token | Shadow | Usage |
|-------|-------|--------|-------|
| 0 | `elevationScale[0]` | `shadow-none` | Flat surfaces |
| 1 | `elevationScale[1]` | `shadow-[0_1px_3px_rgba(0,0,0,0.04)]` | Resting cards |
| 2 | `elevationScale[2]` | `shadow-[0_4px_12px_rgba(0,0,0,0.06)]` | Hover / raised |

### Card Tokens

```tsx
import { card } from "@/lib/tokens";

<div className={cn(card.base, card.hover, card.padding)}>
  {/* card.base: rounded-xl border border-gray-200 shadow-sm bg-white */}
  {/* card.hover: hover:shadow-md transition-shadow duration-150 */}
  {/* card.padding: p-6 */}
</div>
```

---

## Animation System

### Principles

- **Enterprise calm** — controlled, never flashy
- No parallax, no bouncing, no spring physics
- Motion serves comprehension, not decoration
- All animations use CSS only (no framer-motion)

### Durations

| Token | Value | Usage |
|-------|-------|-------|
| `animationDurations.fast` | 150ms | Hover, focus, micro-interactions |
| `animationDurations.normal` | 300ms | Toggle, reveal |
| `animationDurations.slow` | 500ms | Entrance, scroll reveal |

### Curves

| Token | Value | Usage |
|-------|-------|-------|
| `animationCurves.default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard transitions |
| `animationCurves.enter` | `cubic-bezier(0, 0, 0.2, 1)` | Entry animations |
| `animationCurves.exit` | `cubic-bezier(0.4, 0, 1, 1)` | Exit animations |

### CSS Classes

Defined in `apps/web/src/app/globals.css`:

| Class | Effect | Duration |
|-------|--------|----------|
| `.fade-in-up` + `.visible` | Opacity 0→1, translateY 16px→0 | 500ms |
| `.stagger-children` | Nth-child delay (0, 100, 200, 300ms) | — |
| `.animate-line-draw` | SVG stroke-dasharray animation | 2s |
| `.btn-interactive` | Hover lift (-1px) + shadow | 150ms |
| `.card-elevate` | Hover shadow + lift (-1px) | 150ms |
| `.animate-count-up` | Metric entrance (opacity + scale) | 600ms |

### Scroll-Triggered Fade-In

Use the `FadeInSection` component for scroll-triggered reveals:

```tsx
import { FadeInSection } from "@/components/shared/fade-in-section";

<FadeInSection className="py-24">
  <h2>Section content</h2>
</FadeInSection>
```

Or use the hook directly:

```tsx
import { useFadeInOnScroll } from "@/lib/hooks/use-fade-in-on-scroll";

function MyComponent() {
  const { ref, isVisible } = useFadeInOnScroll({ threshold: 0.1 });
  return (
    <div ref={ref} className={`fade-in-up ${isVisible ? "visible" : ""}`}>
      Content
    </div>
  );
}
```

---

## Landing Page Architecture

The landing page (`apps/web/src/app/page.tsx`) has 6 sections:

| # | Section | Background | Key Elements |
|---|---------|------------|--------------|
| 1 | Hero | Deep Navy | StrataLogo, headline, dual CTAs, HeroChartMockup |
| 2 | The Problem | Off White | 3 problem cards with icons, stagger animation |
| 3 | The Platform | White | 3 pillar cards, card-elevate hover |
| 4 | Capital Pressure | Deep Navy | CapitalPressureChart SVG, 3 metrics |
| 5 | Executive Proof | Off White | 4 metric cards with teal left border |
| 6 | Footer | Deep Navy | StrataLogo, copyright, tagline |

### Marketing Sub-Components

| Component | File | Purpose |
|-----------|------|---------|
| `HeroChartMockup` | `components/marketing/hero-chart-mockup.tsx` | Decorative SVG with two animated polylines (value ↑, cost ↓) |
| `CapitalPressureChart` | `components/marketing/capital-pressure-chart.tsx` | Escalating cost curve vs. governance flat line |

Both use `.animate-line-draw` for SVG stroke animation on scroll.

### CTA Behavior

- **Unauthenticated:** "Request Executive Briefing" (mailto) + "Sign In" (→ /login)
- **Authenticated:** "Request Executive Briefing" (mailto) + "Go to Dashboard" (→ focus route)

---

## Favicon & Meta System

### Favicon Files

| File | Location | Size |
|------|----------|------|
| `favicon.svg` | `/public/brand/` | Scalable |
| `favicon-32.png` | `/public/brand/` | 32x32 |
| `favicon-16.png` | `/public/brand/` | 16x16 |
| `apple-touch-icon.png` | `/public/brand/` | 180x180 |

Generated via `scripts/generate-favicons.mjs` (requires `sharp` dev dependency).

### SEO Metadata

Configured in `apps/web/src/app/layout.tsx`:

- **Title template:** `%s | Strata` (default: "Strata — Data Capital Management")
- **Open Graph:** type website, 1200x630 dynamic image
- **Twitter Card:** summary_large_image
- **JSON-LD:** Organization structured data

### Dynamic OG Image

`apps/web/src/app/opengraph-image.tsx` generates a 1200x630 image at the edge using Next.js `ImageResponse` (satori). Deep Navy background, centered diamond mark, "Strata" wordmark, tagline.

---

## Color Usage Rules

| Context | Color | Token/Class |
|---------|-------|-------------|
| Positive values, success | Teal 700 | `text-teal-700`, `brand.accentGreen` |
| Negative values, critical | Red 900 | `text-red-900`, `brand.riskRed` |
| Warnings, decline | Amber 700 | `text-amber-700`, `brand.alertAmber` |
| Primary text | Gray 900 | `text-gray-900`, `brand.graphite` |
| Secondary text | Gray 500 | `text-gray-500` |
| Tertiary/muted text | Gray 400 | `text-gray-400` |
| Page backgrounds | Off White | `bg-[#F7F8F9]`, `brand.offWhite` |
| Hero/footer | Deep Navy | `bg-[#0E1A2B]`, `brand.deepNavy` |
| Chart grid | Off White | `#F7F8F9` |
| Chart axis | Gray 200 | `#E5E7EB` |
| Chart tick labels | Gray 400 | `#9CA3AF` |

### Never

- Neon or saturated accent colors
- Bright red for negative (use deep red `#7F1D1D`)
- Emerald/green for positive (use teal `#0F766E`)
- Black (`#000`) for brand elements (use Deep Navy or Graphite)
- Gradients on cards

---

## Typography Rules

- **Font family:** Inter (Google Fonts) for all text
- **Mono font:** JetBrains Mono for financial figures
- **Weight range:** 400 (body), 500 (labels), 600 (headings) — never 700+
- **`tracking-tight`** on all section titles and headings
- **`tabular-nums`** on all financial figures (enforced in tokens)
- No decorative or serif fonts

---

## Do / Don't

| Do | Don't |
|----|-------|
| Use `<StrataLogo>` component for all logos | Use Unicode `◆` or `<img>` for logo |
| Use Deep Navy for primary brand surfaces | Use black (`#000`) for brand elements |
| Use teal for positive indicators | Use emerald/green for positive |
| Use `tabular-nums` on financial figures | Use proportional figures for numbers |
| Use `tracking-tight` on headings | Use loose letter spacing |
| Use Inter for all text | Mix in other font families |
| Use CSS-only animations (150ms hover) | Use bouncy or spring animations |
| Use `FadeInSection` for scroll reveals | Use parallax or gratuitous motion |
| Keep marketing sections `py-24` | Use tight spacing on marketing surfaces |
| Write in calm, institutional voice | Use exclamation marks or hype language |
| Use `brand` token for hex colors | Hardcode hex values inline |
| Use `elevationScale` for shadows | Use arbitrary shadow values |
