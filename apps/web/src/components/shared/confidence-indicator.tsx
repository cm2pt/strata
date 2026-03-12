"use client";

import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConfidenceIndicatorProps {
  level: number; // 0-1
  basis: string;
  className?: string;
}

/**
 * Confidence indicator based on cost coverage + value declaration coverage.
 * This is what makes the system trustworthy to a CFO.
 */
export function ConfidenceIndicator({ level, basis, className }: ConfidenceIndicatorProps) {
  const pct = Math.round(level * 100);
  const label = pct >= 90 ? "High" : pct >= 70 ? "Moderate" : "Low";
  const color = pct >= 90
    ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : pct >= 70
      ? "text-amber-600 bg-amber-50 border-amber-200"
      : "text-red-600 bg-red-50 border-red-200";
  const barColor = pct >= 90
    ? "bg-emerald-500"
    : pct >= 70
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 cursor-help", color, className)}>
          <ShieldCheck className="h-3.5 w-3.5" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold">{label} Confidence</span>
            <div className="w-12 h-1.5 rounded-full bg-black/10">
              <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] font-mono opacity-70">{pct}%</span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
        <p className="font-semibold mb-1">How confidence is calculated</p>
        <p className="text-gray-500">{basis}</p>
      </TooltipContent>
    </Tooltip>
  );
}
