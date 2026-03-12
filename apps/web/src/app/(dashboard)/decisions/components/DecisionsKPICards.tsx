import { KPICard } from "@/components/shared/kpi-card";
import { formatCurrency } from "@/lib/format";

interface DecisionsKPICardsProps {
  underReviewCount: number;
  totalCapitalFreed: number;
  approvedWithImpactCount: number;
  totalEstimatedPending: number;
  pendingCount: number;
  impactConfirmed: number;
  approvedCount: number;
  totalDecisions: number;
  decisionsThisQuarter: number;
}

export function DecisionsKPICards({
  underReviewCount,
  totalCapitalFreed,
  approvedWithImpactCount,
  totalEstimatedPending,
  pendingCount,
  impactConfirmed,
  approvedCount,
  totalDecisions,
  decisionsThisQuarter,
}: DecisionsKPICardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <KPICard label="Under Review" value={underReviewCount.toString()} trend={{ value: "Awaiting resolution", direction: "neutral" }} variant="warning" />
      <KPICard label="Capital Freed" value={formatCurrency(totalCapitalFreed, true)} trend={{ value: `${approvedWithImpactCount} decisions`, direction: "up" }} variant="positive" info="Monthly savings from approved decisions with measured capital impact." />
      <KPICard label="Pending Impact" value={formatCurrency(totalEstimatedPending, true)} trend={{ value: `${pendingCount} decisions`, direction: "neutral" }} info="Estimated monthly impact of decisions currently under review." />
      <KPICard label="Impact Accuracy" value={`${impactConfirmed}/${approvedCount}`} trend={{ value: approvedCount > 0 ? `${Math.round((impactConfirmed / approvedCount) * 100)}% confirmed` : "No approvals", direction: impactConfirmed > 0 ? "up" : "neutral" }} variant={impactConfirmed > 0 ? "positive" : "default"} info="Approved decisions with confirmed post-decision impact verification." />
      <KPICard label="Total Decisions" value={totalDecisions.toString()} trend={{ value: `${decisionsThisQuarter} this quarter`, direction: "neutral" }} />
    </div>
  );
}
