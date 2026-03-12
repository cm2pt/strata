"use client";

import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatROI } from "@/lib/format";
import { Shuffle, CheckCircle2 } from "lucide-react";
import { canMutate } from "@/lib/api/client";
import type { DataProduct } from "@/lib/types";

export interface ReallocationSimulatorProps {
  showReallocation: boolean;
  onToggleReallocation: () => void;
  reallocationAmount: number;
  bottomCost: number;
  currentPortfolioROI: number;
  projectedROI: number;
  avgTopROI: number;
  bottomQuartile: DataProduct[];
  topQuartile: DataProduct[];
  canApprove: boolean;
  approveSuccess: boolean;
  onShowApproveDialog: () => void;
}

export function ReallocationSimulator({
  showReallocation,
  onToggleReallocation,
  reallocationAmount,
  bottomCost,
  currentPortfolioROI,
  projectedROI,
  avgTopROI,
  bottomQuartile,
  topQuartile,
  canApprove,
  approveSuccess,
  onShowApproveDialog,
}: ReallocationSimulatorProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <SectionHeader
          title="What If We Reallocate?"
          subtitle="Simulated impact of moving 10% from lowest ROI quartile to highest"
          icon={Shuffle}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
          className="mb-0"
        />
        <Button
          size="sm"
          variant={showReallocation ? "default" : "outline"}
          className="text-xs h-8"
          onClick={onToggleReallocation}
        >
          {showReallocation ? "Hide Simulation" : "Run Simulation"}
        </Button>
      </div>

      {showReallocation && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4">
              <p className="text-[10px] uppercase tracking-wider text-purple-400">Amount Moved</p>
              <p className="text-lg font-semibold text-purple-700 font-mono mt-1">{formatCurrency(reallocationAmount, true)}<span className="text-xs font-normal">/mo</span></p>
              <p className="text-[10px] text-purple-400 mt-0.5">10% of bottom quartile ({formatCurrency(bottomCost, true)} total)</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-400">Current Portfolio ROI</p>
              <p className="text-lg font-semibold text-gray-900 font-mono mt-1">{formatROI(currentPortfolioROI)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Weighted across all products</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
              <p className="text-[10px] uppercase tracking-wider text-emerald-500">Projected Portfolio ROI</p>
              <p className="text-lg font-semibold text-emerald-700 font-mono mt-1">{formatROI(projectedROI)}</p>
              <p className="text-[10px] text-emerald-500 mt-0.5">+{((projectedROI - currentPortfolioROI) / currentPortfolioROI * 100).toFixed(0)}% improvement</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Reduce Investment (Bottom Quartile)</p>
              <div className="space-y-1.5">
                {bottomQuartile.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{p.name}</span>
                    <span className="text-red-500 font-mono">{formatROI(p.roi)} ROI</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Increase Investment (Top Quartile)</p>
              <div className="space-y-1.5">
                {topQuartile.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{p.name}</span>
                    <span className="text-emerald-600 font-mono">{formatROI(p.roi)} ROI</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between">
            <p className="text-[10px] text-gray-400 flex-1 mr-4">
              <strong>How this is calculated:</strong> 10% of the monthly spend on the bottom ROI quartile ({formatCurrency(reallocationAmount, true)}) is notionally moved to the top quartile. The projected value gain assumes the top quartile&apos;s average ROI ({avgTopROI.toFixed(1)}x) applies to the reallocated amount. This is a simplified model — actual returns depend on capacity constraints, adoption dynamics, and marginal utility.
            </p>
            {approveSuccess ? (
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium flex-shrink-0">
                <CheckCircle2 className="h-4 w-4" />
                Reallocation approved
              </div>
            ) : canApprove ? (
              <Button
                size="sm"
                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 flex-shrink-0"
                onClick={onShowApproveDialog}
                disabled={!canMutate}
                title={!canMutate ? "API unavailable in offline demo mode" : ""}
              >
                Approve Reallocation
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </Card>
  );
}
