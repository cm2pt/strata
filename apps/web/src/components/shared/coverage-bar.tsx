"use client";

import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

export function CoverageBar({
  value,
  label = "Coverage",
  showDetail = true,
  className,
}: {
  value: number;
  label?: string;
  showDetail?: boolean;
  className?: string;
}) {
  const pct = Math.round(value * 100);
  const color = pct >= 90 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="text-xs text-gray-500 whitespace-nowrap">
        {label}: {formatPercent(value)}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 min-w-[60px]">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
