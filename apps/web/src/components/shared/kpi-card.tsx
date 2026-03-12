"use client";

import { cn } from "@/lib/utils";
import { card as cardTokens } from "@/lib/tokens";
import { Info, ArrowUpRight, ArrowDownRight, Minus, FlaskConical } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useExplainability } from "@/lib/contexts/explainability-context";

interface KPICardProps {
  label: string;
  value: string;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  info?: string;
  action?: { label: string; onClick: () => void };
  variant?: "default" | "positive" | "negative" | "warning";
  /** Size variant: hero for primary page metric, standard (default), compact for grids */
  size?: "hero" | "standard" | "compact";
  /** Sparkline data: array of 4-8 numeric values for a tiny inline trend line */
  sparklineData?: number[];
  /** Optional target/benchmark annotation below the value */
  target?: string;
  className?: string;
  /** Metric key for provenance lookup (when set, the card shows a provenance icon in explainability mode) */
  metricKey?: string;
  /** Called when provenance icon is clicked */
  onProvenanceClick?: (metricKey: string) => void;
}

export function KPICard({
  label,
  value,
  trend,
  info,
  action,
  variant = "default",
  size = "standard",
  sparklineData,
  target,
  className,
  metricKey,
  onProvenanceClick,
}: KPICardProps) {
  const { showDataSources } = useExplainability();

  const borderColor = {
    default: "border-border",
    positive: "border-l-teal-600 border-l-2",
    negative: "border-l-red-800 border-l-2",
    warning: "border-l-amber-600 border-l-2",
  }[variant];

  // Semantic background wash for non-default variants
  const bgWash = {
    default: "",
    positive: "bg-teal-50/30",
    negative: "bg-red-50/20",
    warning: "bg-amber-50/25",
  }[variant];

  const valueSizeClass = {
    hero: "text-4xl sm:text-5xl",
    standard: "text-3xl",
    compact: "text-2xl",
  }[size];

  const paddingClass = size === "compact" ? "p-4" : cardTokens.padding;

  const TrendIcon = trend?.direction === "up" ? ArrowUpRight : trend?.direction === "down" ? ArrowDownRight : Minus;
  const trendColor = trend?.direction === "up" ? "text-teal-700" : trend?.direction === "down" ? "text-red-800" : "text-gray-400";

  const showProvenance = showDataSources && metricKey && onProvenanceClick;

  return (
    <div
      className={cn(
        cardTokens.base, cardTokens.hover, paddingClass,
        borderColor,
        bgWash,
        showProvenance && "ring-1 ring-teal-200 ring-offset-1",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
          {label}
        </span>
        <div className="flex items-center gap-1">
          {showProvenance && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onProvenanceClick(metricKey)}
                  className="text-teal-400 hover:text-teal-600 transition-colors"
                  aria-label={`View provenance for ${label}`}
                >
                  <FlaskConical className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                View data provenance
              </TooltipContent>
            </Tooltip>
          )}
          {info && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-gray-300 hover:text-gray-500 transition-colors" aria-label="More info">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {info}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      <div className={cn("mt-2 font-semibold tracking-tight text-gray-900 font-mono tabular-nums", valueSizeClass)}>
        {value}
      </div>
      {target && (
        <p className="mt-1 text-[10px] text-gray-400 font-mono tabular-nums">
          Target: {target}
        </p>
      )}
      {sparklineData && sparklineData.length >= 3 && (
        <Sparkline data={sparklineData} variant={variant} className="mt-2" />
      )}
      {trend && (
        <div className={cn("mt-1.5 flex items-center gap-1 text-xs font-medium", trendColor)}>
          <TrendIcon className="h-3.5 w-3.5" />
          <span>{trend.value}</span>
          {trend.label && <span className="text-gray-400 font-normal">{trend.label}</span>}
        </div>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 text-xs font-medium text-teal-700 hover:text-teal-900 transition-colors"
        >
          {action.label} →
        </button>
      )}
    </div>
  );
}

// ─── Inline Sparkline ─────────────────────────────────────────────────────────

function Sparkline({
  data,
  variant = "default",
  className,
}: {
  data: number[];
  variant?: "default" | "positive" | "negative" | "warning";
  className?: string;
}) {
  const width = 48;
  const height = 24;
  const padding = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const strokeColor = {
    default: "#9CA3AF",
    positive: "#0F766E",
    negative: "#991B1B",
    warning: "#B45309",
  }[variant];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
