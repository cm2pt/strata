"use client";

import { KPICard } from "@/components/shared/kpi-card";
import { formatCurrency, formatROI } from "@/lib/format";

export interface AllocationKPIsProps {
  totalCost: number;
  totalValue: number;
  domainCount: number;
  currentPortfolioROI: number;
  declineSpend: number;
  declinePct: number;
  noValueSpend: number;
  noValuePct: number;
}

export function AllocationKPIs({
  totalCost,
  totalValue,
  domainCount,
  currentPortfolioROI,
  declineSpend,
  declinePct,
  noValueSpend,
  noValuePct,
}: AllocationKPIsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KPICard
        label="Total Monthly Spend"
        value={formatCurrency(totalCost, true)}
        trend={{ value: `${domainCount} domains`, direction: "neutral" }}
      />
      <KPICard
        label="Total Composite Value"
        value={formatCurrency(totalValue, true)}
        trend={{ value: formatROI(currentPortfolioROI) + " portfolio ROI", direction: "up" }}
        variant="positive"
      />
      <KPICard
        label="Decline-Stage Spend"
        value={formatCurrency(declineSpend, true)}
        trend={{ value: `${Math.round(declinePct * 100)}% of total`, direction: "down" }}
        variant="warning"
        info="Monthly spend on products in decline or retired stages. Candidates for reallocation."
      />
      <KPICard
        label="Unvalued Spend"
        value={formatCurrency(noValueSpend, true)}
        trend={{ value: `${Math.round(noValuePct * 100)}% of total`, direction: "neutral" }}
        variant="negative"
        info="Monthly spend on products with no declared value. ROI cannot be measured."
      />
    </div>
  );
}
