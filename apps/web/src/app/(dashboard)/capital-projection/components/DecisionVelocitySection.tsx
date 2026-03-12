import { KPICard } from "@/components/shared/kpi-card";
import { SectionHeader } from "@/components/shared/section-header";
import { formatCurrency } from "@/lib/format";
import { Clock } from "lucide-react";

interface DecisionVelocitySectionProps {
  decisionVelocityDays: number;
  roiDelta12m: number;
  capitalFreedDelta36m: number;
}

export function DecisionVelocitySection({ decisionVelocityDays, roiDelta12m, capitalFreedDelta36m }: DecisionVelocitySectionProps) {
  return (
    <>
      <SectionHeader
        title="Decision Velocity Impact"
        subtitle="How approval latency affects portfolio outcomes"
        icon={Clock}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          label="Current Velocity"
          value={`${decisionVelocityDays} days`}
          trend={{
            value: `optimal: ${14} days`,
            direction: decisionVelocityDays <= 14 ? "up" : "down",
          }}
          variant={decisionVelocityDays <= 14 ? "positive" : "warning"}
          info="Average days from decision creation to resolution."
        />
        <KPICard
          label="12M ROI Delta"
          value={`${roiDelta12m.toFixed(2)}x`}
          trend={{ value: "active vs passive at 12 months", direction: "up" }}
          variant="positive"
          info="ROI improvement achievable with active governance at optimal decision velocity."
        />
        <KPICard
          label="36M Capital Freed Delta"
          value={formatCurrency(capitalFreedDelta36m, true)}
          trend={{ value: "active vs passive at 36 months", direction: "up" }}
          variant="positive"
          info="Additional capital freed over 36 months under active governance vs passive mode."
        />
      </div>
    </>
  );
}
