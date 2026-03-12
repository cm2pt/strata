"use client";

import { useFadeInOnScroll } from "@/lib/hooks/use-fade-in-on-scroll";
import { cn } from "@/lib/utils";

/**
 * Capital Pressure chart — shows escalating cost curve over 36 months
 * when governance is not applied. Line-draw animation on scroll.
 */
export function CapitalPressureChart() {
  const { ref, isVisible } = useFadeInOnScroll({ threshold: 0.2 });

  return (
    <div ref={ref} className="relative w-full max-w-2xl mx-auto">
      <svg
        viewBox="0 0 560 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        role="img"
        aria-label="Capital liability accumulation curve"
      >
        {/* Grid */}
        {[60, 100, 140, 180, 220].map((y) => (
          <line
            key={y}
            x1="50"
            y1={y}
            x2="530"
            y2={y}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        ))}

        {/* Y-axis labels */}
        <text x="42" y="224" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="Inter, sans-serif" textAnchor="end">$0</text>
        <text x="42" y="180" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="Inter, sans-serif" textAnchor="end">$2M</text>
        <text x="42" y="140" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="Inter, sans-serif" textAnchor="end">$5M</text>
        <text x="42" y="100" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="Inter, sans-serif" textAnchor="end">$8M</text>
        <text x="42" y="60" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="Inter, sans-serif" textAnchor="end">$12M</text>

        {/* X-axis labels */}
        <text x="50" y="248" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="Inter, sans-serif">Mo 0</text>
        <text x="170" y="248" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="Inter, sans-serif">Mo 12</text>
        <text x="290" y="248" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="Inter, sans-serif">Mo 24</text>
        <text x="410" y="248" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="Inter, sans-serif">Mo 36</text>

        {/* Escalating liability curve (exponential feel) */}
        <path
          d="M50,220 C130,218 170,200 230,170 C290,140 350,100 410,72 C450,56 490,46 530,40"
          stroke="#7F1D1D"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          className={cn(isVisible && "animate-line-draw")}
          style={{ "--line-length": "700" } as React.CSSProperties}
        />

        {/* Gradient area under curve */}
        <path
          d="M50,220 C130,218 170,200 230,170 C290,140 350,100 410,72 C450,56 490,46 530,40 L530,220 Z"
          fill="url(#pressureGrad)"
          className={cn("transition-opacity duration-1000", isVisible ? "opacity-100" : "opacity-0")}
          style={{ transitionDelay: "1000ms" }}
        />

        {/* Flat line (active governance) */}
        <line
          x1="50"
          y1="210"
          x2="530"
          y2="195"
          stroke="#0F766E"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="6 4"
          className={cn(isVisible && "animate-line-draw")}
          style={{ "--line-length": "500" } as React.CSSProperties}
        />

        {/* Annotation — gap arrow */}
        <line
          x1="500"
          y1="45"
          x2="500"
          y2="197"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
          strokeDasharray="3 3"
          className={cn("transition-opacity duration-500", isVisible ? "opacity-100" : "opacity-0")}
          style={{ transitionDelay: "1800ms" }}
        />
        <text
          x="510"
          y="125"
          fill="rgba(255,255,255,0.5)"
          fontSize="11"
          fontFamily="Inter, sans-serif"
          fontWeight="500"
          className={cn("transition-opacity duration-500", isVisible ? "opacity-100" : "opacity-0")}
          style={{ transitionDelay: "2000ms" }}
        >
          Liability
        </text>
        <text
          x="510"
          y="140"
          fill="rgba(255,255,255,0.5)"
          fontSize="11"
          fontFamily="Inter, sans-serif"
          fontWeight="500"
          className={cn("transition-opacity duration-500", isVisible ? "opacity-100" : "opacity-0")}
          style={{ transitionDelay: "2000ms" }}
        >
          Gap
        </text>

        <defs>
          <linearGradient id="pressureGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7F1D1D" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7F1D1D" stopOpacity="0.02" />
          </linearGradient>
        </defs>
      </svg>

      {/* Legend */}
      <div className={cn(
        "flex items-center justify-center gap-8 mt-4 transition-opacity duration-500",
        isVisible ? "opacity-100" : "opacity-0",
      )} style={{ transitionDelay: "2200ms" }}>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-5 bg-[#7F1D1D] rounded-full" />
          <span className="text-xs text-gray-400">Passive Liability</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-5 bg-[#0F766E] rounded-full" style={{ backgroundImage: "repeating-linear-gradient(90deg, #0F766E 0, #0F766E 4px, transparent 4px, transparent 8px)" }} />
          <span className="text-xs text-gray-400">Active Governance</span>
        </div>
      </div>
    </div>
  );
}
