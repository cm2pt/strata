/**
 * Strata — Centralized Chart Color Tokens
 *
 * Use these constants across all Recharts components for visual consistency.
 * Colors are from the Tailwind palette, chosen for accessibility (WCAG AA contrast).
 */

/** Primary series colors — use in order for multi-series charts */
export const CHART_COLORS = {
  primary: "#0ea5e9", // sky-500 — main data series
  secondary: "#8b5cf6", // violet-500 — secondary series
  tertiary: "#f59e0b", // amber-500 — third series
  quaternary: "#10b981", // emerald-500 — fourth series
  quinary: "#ec4899", // pink-500 — fifth series
  senary: "#6366f1", // indigo-500 — sixth series
} as const;

/** Semantic colors for specific data types */
export const CHART_SEMANTIC = {
  revenue: "#10b981", // emerald-500
  cost: "#ef4444", // red-500
  roi: "#0ea5e9", // sky-500
  risk: "#f59e0b", // amber-500
  positive: "#22c55e", // green-500
  negative: "#ef4444", // red-500
  neutral: "#94a3b8", // slate-400
} as const;

/** Ordered palette for pie/donut charts */
export const PIE_COLORS = [
  "#0ea5e9",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#f97316",
] as const;

/** Grid and axis styling */
export const CHART_GRID = {
  stroke: "#e2e8f0", // slate-200
  strokeDasharray: "3 3",
} as const;

/** Tooltip styling */
export const CHART_TOOLTIP = {
  contentStyle: {
    backgroundColor: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "12px",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  },
} as const;

/** Common Recharts tooltip payload type */
export interface ChartTooltipPayload {
  name: string;
  value: number;
  color: string;
  dataKey: string;
  payload: Record<string, unknown>;
}
