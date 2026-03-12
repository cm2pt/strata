"use client";

import { useFadeInOnScroll } from "@/lib/hooks/use-fade-in-on-scroll";
import { cn } from "@/lib/utils";

/**
 * Decorative hero chart — two diverging trend lines (value rising, cost falling)
 * with subtle grid and line-draw animation. Purely visual storytelling.
 */
export function HeroChartMockup() {
  const { ref, isVisible } = useFadeInOnScroll({ threshold: 0.2 });

  return (
    <div ref={ref} className="relative w-full max-w-md mx-auto lg:mx-0">
      <svg
        viewBox="0 0 400 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        role="img"
        aria-label="Data capital value growth visualization"
      >
        {/* Grid lines */}
        {[60, 100, 140, 180].map((y) => (
          <line
            key={y}
            x1="40"
            y1={y}
            x2="380"
            y2={y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}
        {[40, 120, 200, 280, 360].map((x) => (
          <line
            key={x}
            x1={x}
            y1="40"
            x2={x}
            y2="200"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />
        ))}

        {/* Axis labels */}
        <text x="40" y="224" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="Inter, sans-serif">Q1</text>
        <text x="120" y="224" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="Inter, sans-serif">Q2</text>
        <text x="200" y="224" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="Inter, sans-serif">Q3</text>
        <text x="280" y="224" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="Inter, sans-serif">Q4</text>
        <text x="360" y="224" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="Inter, sans-serif">Q5</text>

        {/* Value line (rising — teal) */}
        <polyline
          points="40,170 120,145 200,115 280,85 360,55"
          stroke="#0F766E"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className={cn(isVisible && "animate-line-draw")}
          style={{ "--line-length": "500" } as React.CSSProperties}
        />
        {/* Value area fill */}
        <polygon
          points="40,170 120,145 200,115 280,85 360,55 360,200 40,200"
          fill="url(#valueGrad)"
          className={cn("transition-opacity duration-1000", isVisible ? "opacity-100" : "opacity-0")}
          style={{ transitionDelay: "800ms" }}
        />

        {/* Cost line (descending — muted red) */}
        <polyline
          points="40,80 120,100 200,120 280,145 360,165"
          stroke="rgba(127,29,29,0.6)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6 4"
          fill="none"
          className={cn(isVisible && "animate-line-draw")}
          style={{ "--line-length": "500" } as React.CSSProperties}
        />

        {/* Legend dots */}
        <circle cx="40" cy="170" r="3" fill="#0F766E" className={cn("transition-opacity duration-500", isVisible ? "opacity-100" : "opacity-0")} style={{ transitionDelay: "1600ms" }} />
        <circle cx="40" cy="80" r="3" fill="rgba(127,29,29,0.6)" className={cn("transition-opacity duration-500", isVisible ? "opacity-100" : "opacity-0")} style={{ transitionDelay: "1600ms" }} />

        {/* Gradient defs */}
        <defs>
          <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F766E" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0F766E" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Legend */}
      <div className={cn(
        "flex items-center gap-6 mt-3 transition-opacity duration-500",
        isVisible ? "opacity-100" : "opacity-0",
      )} style={{ transitionDelay: "1800ms" }}>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-4 bg-[#0F766E] rounded-full" />
          <span className="text-xs text-gray-400">Portfolio Value</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-4 bg-[#7F1D1D]/60 rounded-full" style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(127,29,29,0.6) 0, rgba(127,29,29,0.6) 4px, transparent 4px, transparent 8px)" }} />
          <span className="text-xs text-gray-400">Data Spend</span>
        </div>
      </div>
    </div>
  );
}
