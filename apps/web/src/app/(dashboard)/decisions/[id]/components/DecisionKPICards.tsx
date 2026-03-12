import { KPICard } from "@/components/shared/kpi-card";
import { formatCurrency } from "./decision-helpers";
import type { Decision, ImpactReport } from "@/lib/types";

export interface DecisionKPICardsProps {
  decision: Decision;
  impactReport: ImpactReport | null | undefined;
}

export function DecisionKPICards({ decision, impactReport }: DecisionKPICardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <KPICard
        label="Estimated Impact"
        value={`${formatCurrency(decision.estimatedImpact)}/mo`}
      />
      <KPICard
        label="Actual Impact"
        value={
          decision.actualImpact !== null
            ? `${formatCurrency(decision.actualImpact)}/mo`
            : "Pending"
        }
      />
      <KPICard
        label="Capital Freed"
        value={`${formatCurrency(decision.capitalFreed)}/mo`}
      />
      <KPICard
        label="Annual Savings"
        value={`${formatCurrency(decision.projectedSavingsAnnual)}/yr`}
      />
      <KPICard
        label="Impact Confidence"
        value={
          impactReport?.confidenceScore != null
            ? `${impactReport.confidenceScore}%`
            : "N/A"
        }
      />
    </div>
  );
}
