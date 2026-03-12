import { KPICard } from "@/components/shared/kpi-card";
import { formatCurrency, formatROI } from "@/lib/format";
import type { CurrentSnapshot, LiabilityEstimate } from "@/lib/types";

interface ProjectionKPICardsProps {
  currentSnapshot: CurrentSnapshot;
  liabilityEstimate: LiabilityEstimate;
}

export function ProjectionKPICards({ currentSnapshot, liabilityEstimate }: ProjectionKPICardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KPICard
        label="Portfolio ROI"
        value={formatROI(currentSnapshot.averageRoi)}
        trend={{ value: "current blended", direction: "neutral" }}
      />
      <KPICard
        label="Monthly Data Spend"
        value={formatCurrency(currentSnapshot.totalCost, true)}
        trend={{ value: `${formatCurrency(currentSnapshot.totalCost * 12, true)}/yr`, direction: "neutral" }}
      />
      <KPICard
        label="AI Spend Exposure"
        value={formatCurrency(currentSnapshot.aiSpend, true)}
        trend={{ value: `${((currentSnapshot.aiSpend / currentSnapshot.totalCost) * 100).toFixed(1)}% of spend`, direction: "neutral" }}
        variant="warning"
      />
      <KPICard
        label="36M Passive Liability"
        value={formatCurrency(liabilityEstimate.totalPassiveLiability36m, true)}
        trend={{ value: "projected cost of inaction", direction: "down" }}
        variant="negative"
      />
    </div>
  );
}
