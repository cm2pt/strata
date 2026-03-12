/**
 * Capital Grid — Subtle ledger-line background motif.
 *
 * Renders a faint grid of horizontal and vertical lines that evoke
 * a balance sheet / financial ledger. Used as a background layer
 * in hero and dark sections for visual identity reinforcement.
 */
export function CapitalGrid({
  className = "",
  variant = "dark",
}: {
  className?: string;
  /** "dark" = white lines on dark bg, "light" = dark lines on light bg */
  variant?: "dark" | "light";
}) {
  const stroke = variant === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
  const accentStroke = variant === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="capital-grid" width="64" height="64" patternUnits="userSpaceOnUse">
            {/* Fine grid */}
            <line x1="0" y1="32" x2="64" y2="32" stroke={stroke} strokeWidth="0.5" />
            <line x1="32" y1="0" x2="32" y2="64" stroke={stroke} strokeWidth="0.5" />
          </pattern>
          <pattern id="capital-grid-major" width="256" height="256" patternUnits="userSpaceOnUse">
            {/* Major grid lines (every 4th) */}
            <line x1="0" y1="0" x2="256" y2="0" stroke={accentStroke} strokeWidth="0.5" />
            <line x1="0" y1="0" x2="0" y2="256" stroke={accentStroke} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#capital-grid)" />
        <rect width="100%" height="100%" fill="url(#capital-grid-major)" />
      </svg>
    </div>
  );
}
