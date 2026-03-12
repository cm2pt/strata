"use client";

import { cn } from "@/lib/utils";
import { card, typography, brand } from "@/lib/tokens";
import { formatCurrency } from "@/lib/format";
import type { CapitalModel } from "@/lib/types";
import { AlertTriangle, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface InactionCostProps {
  model: CapitalModel;
  className?: string;
}

export function InactionCost({ model, className }: InactionCostProps) {
  return (
    <div
      className={cn(
        card.base,
        "border-amber-200 bg-amber-50/50 p-5",
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Left: title */}
        <div className="flex items-center gap-2 sm:min-w-[180px]">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Inaction compounding
            </p>
            <p className="text-[10px] text-amber-600">
              {model.boardSnapshotMonths}-month projection
            </p>
          </div>
        </div>

        {/* Center: two big numbers */}
        <div className="flex items-center gap-6 flex-1">
          <div>
            <p className={cn(typography.metricLabel, "text-amber-500 mb-0.5")}>
              Projected Spend Increase
            </p>
            <p className="text-xl font-semibold font-mono tabular-nums text-amber-700">
              +{formatCurrency(model.inactionProjectedSpend, true)}
            </p>
          </div>
          <div
            className="h-8 w-px"
            style={{ backgroundColor: "rgba(180, 83, 9, 0.15)" }}
          />
          <div>
            <p className={cn(typography.metricLabel, "text-amber-500 mb-0.5")}>
              Projected Liability
            </p>
            <p className="text-xl font-semibold font-mono tabular-nums text-amber-700">
              +{formatCurrency(model.inactionProjectedLiability, true)}
            </p>
          </div>
        </div>

        {/* Timeline dots */}
        <div className="hidden sm:flex items-center gap-1 flex-shrink-0 mx-2">
          <div className="flex flex-col items-center">
            <div className="h-2 w-2 rounded-full bg-gray-400" />
            <span className="text-[9px] text-gray-400 mt-1">Today</span>
          </div>
          <div className="h-px w-6 bg-amber-200" />
          <div className="flex flex-col items-center">
            <div className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-[9px] text-amber-500 mt-1">3 mo</span>
          </div>
          <div className="h-px w-6 bg-amber-300" />
          <div className="flex flex-col items-center">
            <div className="h-2 w-2 rounded-full bg-amber-600" />
            <span className="text-[9px] text-amber-600 mt-1">6 mo</span>
          </div>
        </div>

        {/* Right: driver + CTA */}
        <div className="flex flex-col items-start sm:items-end gap-2 sm:min-w-[200px]">
          <Link
            href="/lifecycle"
            className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 transition-colors group"
          >
            <Clock className="h-3 w-3" />
            <span>
              Primary driver: {model.inactionPrimaryDriver} (
              {model.inactionPrimaryDriverValue})
            </span>
            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link href="/decisions">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1 border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
            >
              Reduce latency
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
