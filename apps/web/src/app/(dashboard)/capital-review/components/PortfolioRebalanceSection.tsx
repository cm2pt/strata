"use client";

import { SectionHeader } from "@/components/shared/section-header";
import { Card } from "@/components/shared/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatROI, formatPercent } from "@/lib/format";
import { BarChart3, ArrowRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { PortfolioRebalance } from "@/lib/types";

export interface PortfolioRebalanceSectionProps {
  rebalance: PortfolioRebalance | null;
}

export function PortfolioRebalanceSection({ rebalance }: PortfolioRebalanceSectionProps) {
  return (
    <>
      <SectionHeader title="Portfolio Rebalance Simulation" icon={BarChart3} />

      {rebalance ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ROI Comparison */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">ROI Projection</h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Current Blended ROI</p>
                <p className="text-2xl font-bold font-mono text-gray-900">{formatROI(rebalance.currentBlendedRoi)}</p>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-blue-500 mb-1">Projected ROI</p>
                  <p className="text-2xl font-bold font-mono text-blue-600">{formatROI(rebalance.projectedBlendedRoi)}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="flex items-center gap-1.5">
                  {rebalance.efficiencyDelta > 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm font-bold font-mono ${rebalance.efficiencyDelta > 0 ? "text-emerald-600" : "text-red-600"}`}>
                    +{formatROI(rebalance.efficiencyDelta)}
                  </span>
                  <span className="text-xs text-gray-500">efficiency delta</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Moving {formatCurrency(rebalance.movableAmountMonthly, true)}/mo ({formatPercent(rebalance.rebalancePct * 100)}%) from bottom to top quartile
                </p>
              </div>
            </div>
          </Card>

          {/* Bottom Quartile (Divest) */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <ArrowDownRight className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-semibold text-gray-900">Bottom Quartile — Divest</h3>
            </div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">
              {rebalance.bottomQuartile.count} products · {formatCurrency(rebalance.bottomQuartile.totalCost, true)}/mo · {formatROI(rebalance.bottomQuartile.blendedRoi)} ROI
            </p>
            <div className="space-y-2">
              {rebalance.recommendedDivest.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-xs font-medium text-gray-700">{p.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-gray-400">{formatCurrency(p.monthlyCost, true)}/mo</span>
                    <span className="text-[10px] font-mono text-red-500">{formatROI(p.trailingRoi)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Quartile (Invest) */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-gray-900">Top Quartile — Invest</h3>
            </div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">
              {rebalance.topQuartile.count} products · {formatCurrency(rebalance.topQuartile.totalCost, true)}/mo · {formatROI(rebalance.topQuartile.blendedRoi)} ROI
            </p>
            <div className="space-y-2">
              {rebalance.recommendedInvest.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-xs font-medium text-gray-700">{p.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-gray-400">{formatCurrency(p.monthlyCost, true)}/mo</span>
                    <span className="text-[10px] font-mono text-emerald-600">{formatROI(p.trailingRoi)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={BarChart3}
            title="No rebalance data"
            description="Portfolio rebalance recommendations appear once enough ROI data exists across quartiles."
          />
        </Card>
      )}
    </>
  );
}
