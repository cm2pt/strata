import { KPICard } from "@/components/shared/kpi-card";
import type { CandidateDetail } from "@/lib/types";

export interface CandidateKPICardsProps {
  candidate: CandidateDetail;
}

export function CandidateKPICards({ candidate }: CandidateKPICardsProps) {
  const costDisplay =
    candidate.monthlyCostEstimate > 0
      ? `$${candidate.monthlyCostEstimate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo`
      : "N/A";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <KPICard
        label="Confidence Score"
        value={`${candidate.confidenceScore}%`}
      />
      <KPICard label="Est. Monthly Cost" value={costDisplay} />
      <KPICard
        label="Source Assets"
        value={String(candidate.sourceCount)}
      />
      <KPICard
        label="Monthly Consumers"
        value={String(candidate.monthlyConsumers)}
      />
      <KPICard
        label="Cost Coverage"
        value={`${Math.round(candidate.costCoveragePct * 100)}%`}
      />
    </div>
  );
}
