import { KPICard } from "@/components/shared/kpi-card";
import { formatCurrency } from "@/lib/format";

interface ScorecardKPICardsProps {
  totalItems: number;
  atRiskCount: number;
  potentialSavings: number;
  avgComposite: number;
}

export function ScorecardKPICards({ totalItems, atRiskCount, potentialSavings, avgComposite }: ScorecardKPICardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KPICard
        label="Products Scored"
        value={totalItems.toString()}
        trend={{ value: "across all domains", direction: "neutral" }}
      />
      <KPICard
        label="At Risk (High/Critical)"
        value={atRiskCount.toString()}
        trend={{ value: `${totalItems > 0 ? Math.round((atRiskCount / totalItems) * 100) : 0}% of portfolio`, direction: "down" }}
        variant={atRiskCount > 0 ? "warning" : undefined}
      />
      <KPICard
        label="Potential Savings"
        value={formatCurrency(potentialSavings, true)}
        trend={{ value: "/mo if killed", direction: "up" }}
        variant="positive"
      />
      <KPICard
        label="Avg Composite Score"
        value={avgComposite.toFixed(1)}
        trend={{ value: "out of 100", direction: avgComposite >= 50 ? "up" : "down" }}
        variant={avgComposite >= 50 ? "positive" : "warning"}
      />
    </div>
  );
}
