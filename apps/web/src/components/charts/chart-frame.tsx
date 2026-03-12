"use client";

import { cn } from "@/lib/utils";

interface ChartFrameProps {
  /** Left-aligned chart title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Optional "data through [date]" footer */
  dataThrough?: string;
  /** Chart content */
  children: React.ReactNode;
  /** Height of the chart area */
  height?: number;
  className?: string;
}

/**
 * Consistent chart wrapper with inner border, left-aligned title, and data footer.
 * Wraps any Recharts chart to create institutional-quality framing.
 */
export function ChartFrame({
  title,
  subtitle,
  dataThrough,
  children,
  height = 300,
  className,
}: ChartFrameProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 tracking-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div style={{ height }}>{children}</div>
      {dataThrough && (
        <p className="mt-3 text-[10px] text-gray-400 text-right font-mono">
          Data through {dataThrough}
        </p>
      )}
    </div>
  );
}
