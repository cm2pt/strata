"use client";

import { cn } from "@/lib/utils";

interface ChartTooltipEntry {
  label: string;
  value: string;
  color?: string;
}

interface ChartTooltipProps {
  /** Whether the tooltip is active (from Recharts) */
  active?: boolean;
  /** Title/header of the tooltip (e.g., month name) */
  title?: string;
  /** Array of label/value pairs to display */
  entries?: ChartTooltipEntry[];
  className?: string;
}

/**
 * Shared chart tooltip with institutional styling.
 * Use this as the `content` prop for Recharts `<Tooltip>`.
 *
 * For simple usage, wrap your data transformation in a component:
 * ```tsx
 * <Tooltip content={(props) => (
 *   <ChartTooltip
 *     active={props.active}
 *     title={props.label}
 *     entries={props.payload?.map(p => ({
 *       label: p.name,
 *       value: formatCurrency(p.value),
 *       color: p.color,
 *     }))}
 *   />
 * )} />
 * ```
 */
export function ChartTooltip({ active, title, entries, className }: ChartTooltipProps) {
  if (!active || !entries?.length) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-white px-3 py-2.5 shadow-lg text-xs",
        "animate-in fade-in-0 zoom-in-95 duration-150",
        className,
      )}
    >
      {title && (
        <p className="font-medium text-gray-500 mb-1.5 text-[10px] uppercase tracking-wider">
          {title}
        </p>
      )}
      <div className="space-y-1">
        {entries.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-gray-600">
              {entry.color && (
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
              )}
              {entry.label}
            </span>
            <span className="font-semibold font-mono tabular-nums text-gray-900">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
