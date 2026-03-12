// ============================================================
// Strata — Formatting Utilities
// Financial-first display formatting
// ============================================================

/**
 * Format a number as USD currency.
 * @param value - The numeric value to format
 * @param compact - Use compact notation (e.g., $1.5M, $12.3K)
 * @returns Formatted currency string, or "\u2014" for null/undefined
 * @example
 * formatCurrency(1234567)        // "$1,234,567"
 * formatCurrency(1500000, true)  // "$1.5M"
 * formatCurrency(null)           // "\u2014"
 */
export function formatCurrency(value: number | null | undefined, compact = false): string {
  if (value == null) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (compact) {
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
    return `${sign}$${abs.toFixed(0)}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number as ROI multiplier (e.g., "2.1x").
 * @param roi - The ROI value
 * @returns Formatted ROI string, or "\u2014" for null/undefined
 * @example
 * formatROI(2.14)  // "2.1x"
 * formatROI(null)  // "\u2014"
 */
export function formatROI(roi: number | null | undefined): string {
  if (roi == null) return "—";
  return `${roi.toFixed(1)}x`;
}

/**
 * Format a number as a percentage (e.g., "85%").
 * @param value - The fractional value (0.85 = 85%)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string, or "\u2014" for null/undefined
 * @example
 * formatPercent(0.85)     // "85%"
 * formatPercent(0.856, 1) // "85.6%"
 * formatPercent(null)     // "\u2014"
 */
export function formatPercent(value: number | null | undefined, decimals = 0): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a number with sign prefix (e.g., "+12%", "-5%").
 * @param value - The trend value (already in percentage points)
 * @returns Formatted trend string with sign
 * @example
 * formatTrend(12)  // "+12%"
 * formatTrend(-5)  // "-5%"
 * formatTrend(0)   // "0%"
 */
export function formatTrend(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}%`;
}

/**
 * Format a number with locale-aware thousand separators.
 * @param value - The numeric value
 * @returns Formatted number string with thousand separators
 * @example
 * formatNumber(1234567)  // "1,234,567"
 * formatNumber(42)       // "42"
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/**
 * Format an ISO date string as relative time (e.g., "2h ago", "3d ago").
 * @param dateString - ISO 8601 date string
 * @returns Human-readable relative time, or "\u2014" for invalid dates
 * @example
 * formatRelativeTime("2026-02-25T10:00:00Z") // "2h ago" (if now is noon)
 * formatRelativeTime("2026-02-20T00:00:00Z") // "5d ago"
 * formatRelativeTime("invalid")              // "\u2014"
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "\u2014";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Format an ISO date string as a localized short date (e.g., "Feb 25, 2026").
 * @param dateString - ISO 8601 date string
 * @returns Formatted date string, or "\u2014" for invalid dates
 * @example
 * formatDate("2026-02-25T00:00:00Z") // "Feb 25, 2026"
 * formatDate("invalid")              // "\u2014"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "\u2014";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Map platform identifiers to human-readable display names.
 * Falls back to capitalizing the raw value for unknown platforms.
 */
const PLATFORM_LABELS: Record<string, string> = {
  snowflake: "Snowflake",
  databricks: "Databricks",
  s3: "Amazon S3",
  power_bi: "Power BI",
  bigquery: "BigQuery",
  redshift: "Redshift",
  fabric: "Fabric",
};

export function formatPlatform(platform: string | null | undefined): string {
  if (!platform) return "\u2014";
  return PLATFORM_LABELS[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1).replace(/_/g, " ");
}
