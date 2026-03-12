// ============================================================
// Strata — Design Tokens
// Single source of truth for visual consistency
// ============================================================

// --- Card Styles ---
export const card = {
  base: "rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(20,15,10,0.04)]",
  hover: "transition-shadow hover:shadow-[0_4px_12px_rgba(20,15,10,0.06)]",
  interactive: "rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(20,15,10,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(20,15,10,0.06)] cursor-pointer",
  padding: "p-6",
  /** Card with standard padding */
  get container() { return `${this.base} ${this.padding}`; },
  /** Interactive card with hover + standard padding */
  get clickable() { return `${this.interactive} ${this.padding}`; },
  // ── Hierarchy variants ──
  /** Primary — hero metrics, capital header: heavier shadow, accent top border */
  primary: "rounded-2xl border border-border bg-card shadow-[0_2px_8px_rgba(20,15,10,0.06)] card-border-accent",
  /** Standard — section containers: default styling */
  standard: "rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(20,15,10,0.04)]",
  /** Inset — nested lists, sub-sections: no border, no shadow, tinted bg */
  inset: "rounded-lg bg-gray-50/80",
} as const;

// --- Chart Colors ---
export const chartColors = {
  // Lifecycle stage colors (hex for Recharts)
  lifecycle: {
    draft: "#9CA3AF",
    active: "#2563EB",
    growth: "#0F766E",
    mature: "#115E59",
    decline: "#B45309",
    retired: "#6B7280",
  },
  // Cost breakdown donut
  costBreakdown: ["#1E40AF", "#6D28D9", "#B45309", "#6B7280"],
  // Trend lines
  cost: "#7F1D1D",
  value: "#0F766E",
  usage: "#1E40AF",
  // Grid & axis
  grid: "#F7F8F9",
  axis: "#E5E7EB",
  tick: "#9CA3AF",
} as const;

// --- ROI Band Colors ---
export const roiBandColors = {
  high: "text-teal-700",
  healthy: "text-gray-900",
  underperforming: "text-amber-700",
  critical: "text-red-900",
  none: "text-gray-300",
} as const;

// --- Status Accent Colors ---
export const statusColors = {
  positive: {
    bg: "bg-teal-50",
    border: "border-teal-200",
    text: "text-teal-800",
    icon: "text-teal-600",
    badge: "bg-teal-50 text-teal-800 border-teal-200",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    icon: "text-amber-500",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
  },
  negative: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-900",
    icon: "text-red-800",
    badge: "bg-red-50 text-red-900 border-red-200",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    icon: "text-blue-500",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    icon: "text-purple-500",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
  },
  neutral: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    icon: "text-gray-500",
    badge: "bg-gray-100 text-gray-600 border-gray-200",
  },
} as const;

// --- Typography tokens (as Tailwind classes) ---
export const typography = {
  /** Page-level section heading */
  sectionTitle: "text-sm font-semibold text-gray-900 tracking-tight",
  /** Section subtitle / description */
  sectionSubtitle: "text-xs text-gray-400 mt-0.5",
  /** Uppercase micro label for KPI/metric headers */
  metricLabel: "text-[11px] uppercase tracking-wide text-gray-500",
  /** Table header */
  tableHeader: "text-[11px] font-medium uppercase tracking-wider text-gray-400",
  /** Large financial figure */
  displayMono: "text-3xl font-semibold tracking-tight text-gray-900 font-mono tabular-nums",
  /** Medium financial figure */
  valueMono: "text-lg font-semibold text-gray-900 font-mono tabular-nums",
  /** Small financial figure in tables/lists */
  tableMono: "text-sm font-medium text-gray-900 font-mono tabular-nums",
} as const;

// --- Spacing tokens ---
export const spacing = {
  /** Standard gap between section header and content */
  sectionGap: "mb-5",
  /** Page-level vertical spacing between sections */
  pageGap: "space-y-7",
  /** Standard page padding + max width */
  pageShell: "px-8 py-8 space-y-7 max-w-[1440px] mx-auto",
} as const;

// --- Button height standardization ---
export const buttonSize = {
  /** Small inline button (table actions, card CTAs) */
  sm: "h-8 text-xs",
  /** Default button */
  md: "h-9 text-sm",
  /** Full-width primary actions */
  lg: "h-10 text-sm",
} as const;

// --- Axis/chart tick config (reusable across all Recharts charts) ---
export const chartAxis = {
  tick: { fontSize: 11, fill: chartColors.tick },
  axisLine: { stroke: chartColors.axis },
  cartesianGrid: { strokeDasharray: "3 3", stroke: chartColors.grid },
} as const;

// ============================================================
// Extended Design Tokens — Visual Identity Sprint
// ============================================================

// --- Spacing Scale (px values for consistent 8-point grid) ---
export const spacingScale = [4, 8, 16, 24, 32, 48, 64, 96] as const;

// --- Elevation Scale ---
export const elevationScale = {
  /** Flat — no shadow */
  0: "shadow-none",
  /** Resting — subtle warm depth */
  1: "shadow-[0_1px_3px_rgba(20,15,10,0.04)]",
  /** Raised — hover / active states */
  2: "shadow-[0_4px_12px_rgba(20,15,10,0.06)]",
} as const;

// --- Animation Durations ---
export const animationDurations = {
  /** Micro-interactions: hover, focus */
  fast: "150ms",
  /** Standard transitions: reveal, toggle */
  normal: "300ms",
  /** Entrance animations: fade-in, draw */
  slow: "500ms",
} as const;

// --- Animation Curves (enterprise — never bouncy) ---
export const animationCurves = {
  /** Standard ease — smooth deceleration */
  default: "cubic-bezier(0.4, 0, 0.2, 1)",
  /** Entry — starts fast, decelerates */
  enter: "cubic-bezier(0, 0, 0.2, 1)",
  /** Exit — starts slow, accelerates */
  exit: "cubic-bezier(0.4, 0, 1, 1)",
} as const;

// --- Marketing Typography (landing page scale) ---
export const marketingTypography = {
  /** Hero main headline — Instrument Serif for boardroom gravitas */
  heroHeadline: "text-4xl sm:text-5xl lg:text-6xl font-serif font-normal tracking-tight leading-[1.08]",
  /** Hero sub-headline */
  heroSubheadline: "text-lg sm:text-xl leading-relaxed",
  /** Section label (uppercase, above headline) */
  sectionLabel: "text-sm font-medium uppercase tracking-wider",
  /** Section headline — Instrument Serif on marketing pages */
  sectionHeadline: "text-2xl sm:text-3xl font-serif font-normal tracking-tight",
  /** Large institutional metric (landing page) */
  metricDisplay: "text-4xl sm:text-5xl font-semibold font-mono tabular-nums tracking-tight",
  /** Metric descriptor label */
  metricCaption: "text-sm font-medium uppercase tracking-wider",
} as const;

// --- Brand Colors (centralized hex values — see BRAND_GUIDELINES.md) ---
export const brand = {
  /** Primary dark — hero backgrounds, deep surfaces */
  deepNavy: "#0B1220",
  /** Light surface background */
  offWhite: "#F7F8F9",
  /** Primary text on light backgrounds */
  graphite: "#1A2332",
  /** Secondary text */
  slate: "#4B5563",
  /** Primary accent — CTAs, positive indicators */
  accentGreen: "#0F766E",
  /** Darker accent variant — hover states */
  accentGreenDark: "#115E59",
  /** Warning / alert */
  alertAmber: "#B45309",
  /** Risk / critical / cost line */
  riskRed: "#7F1D1D",
  /** Muted border for cards on light bg */
  borderLight: "#E5E7EB",
  /** Subtle divider */
  borderSubtle: "#F0F1F3",
} as const;
