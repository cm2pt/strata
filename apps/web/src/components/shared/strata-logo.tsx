import { cn } from "@/lib/utils";

interface StrataLogoProps {
  /** "mark" = diamond only, "full" = mark + wordmark */
  variant?: "mark" | "full";
  /** "light" = navy mark on light bg, "dark" = translucent mark on dark bg */
  theme?: "light" | "dark";
  /** sm = 28px, md = 32px, lg = 36px (mark dimensions) */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: { mark: 28, rx: 6, vb: 28 },
  md: { mark: 32, rx: 7, vb: 32 },
  lg: { mark: 36, rx: 7, vb: 36 },
} as const;

/**
 * Strata — Inline SVG Logo
 *
 * Double-diamond mark with capital grid (ledger) lines.
 * Outer diamond outline + inner solid diamond = "ascending capital" motif.
 * Three horizontal grid lines evoke a balance sheet / ledger.
 */
export function StrataLogo({
  variant = "mark",
  theme = "light",
  size = "md",
  className,
}: StrataLogoProps) {
  const s = SIZE_MAP[size];
  const vb = s.vb;
  const cx = vb / 2;
  const cy = vb / 2;

  // Proportional sizing based on viewbox
  const outerR = vb * 0.325; // outer diamond half-diagonal
  const innerR = vb * 0.2;   // inner diamond half-diagonal
  const gridInset = vb * 0.2;

  const markBg = theme === "dark" ? "rgba(255,255,255,0.08)" : "#0B1220";
  const gridStroke = theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.07)";
  const outerStroke = theme === "dark" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.25)";
  const textFill = theme === "dark" ? "white" : "#1A2332";

  // Diamond path helper
  const diamond = (r: number) =>
    `M${cx} ${cy - r}L${cx + r} ${cy}L${cx} ${cy + r}L${cx - r} ${cy}Z`;

  // Grid line y positions (3 lines, evenly spaced in middle 60%)
  const gridY1 = cy - vb * 0.175;
  const gridY2 = cy;
  const gridY3 = cy + vb * 0.175;

  const markSvg = (
    <>
      <rect width={vb} height={vb} rx={s.rx} fill={markBg} />
      {/* Capital grid lines */}
      <line x1={gridInset} y1={gridY1} x2={vb - gridInset} y2={gridY1} stroke={gridStroke} strokeWidth="0.5" />
      <line x1={gridInset} y1={gridY2} x2={vb - gridInset} y2={gridY2} stroke={gridStroke} strokeWidth="0.5" />
      <line x1={gridInset} y1={gridY3} x2={vb - gridInset} y2={gridY3} stroke={gridStroke} strokeWidth="0.5" />
      {/* Outer diamond (outline) */}
      <path d={diamond(outerR)} fill="none" stroke={outerStroke} strokeWidth="1" />
      {/* Inner diamond (solid) */}
      <path d={diamond(innerR)} fill="white" />
    </>
  );

  if (variant === "mark") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${vb} ${vb}`}
        fill="none"
        className={cn("flex-shrink-0", className)}
        style={{ width: s.mark, height: s.mark }}
        aria-label="Strata"
        role="img"
      >
        {markSvg}
      </svg>
    );
  }

  // Full lockup: mark + wordmark
  const wordmarkX = vb + 10;
  const totalW = wordmarkX + 62;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${totalW} ${vb}`}
      fill="none"
      className={cn("flex-shrink-0", className)}
      style={{ height: s.mark }}
      aria-label="Strata"
      role="img"
    >
      {markSvg}
      <text
        x={wordmarkX}
        y={vb * 0.66}
        fontFamily="Inter, -apple-system, system-ui, sans-serif"
        fontSize={vb * 0.5}
        fontWeight="600"
        letterSpacing="-0.025em"
        fill={textFill}
      >
        Strata
      </text>
    </svg>
  );
}
