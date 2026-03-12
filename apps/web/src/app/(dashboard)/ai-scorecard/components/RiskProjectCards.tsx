import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { formatCurrency } from "@/lib/format";
import { canMutate } from "@/lib/api/client";
import type { AIProjectScorecard, AIProjectRiskLevel } from "@/lib/types";
import { ShieldAlert, Flag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const RISK_CONFIG: Record<AIProjectRiskLevel, { label: string; color: string; bgColor: string; borderColor: string }> = {
  low: { label: "Low", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
  medium: { label: "Medium", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  high: { label: "High", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  critical: { label: "Critical", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-200" },
};

interface RiskProjectCardsProps {
  atRisk: AIProjectScorecard[];
  canFlag: boolean;
  canKill: boolean;
  actionLoading: boolean;
  onFlag: (scorecard: AIProjectScorecard) => void;
  onKill: (scorecard: AIProjectScorecard) => void;
}

export function RiskProjectCards({ atRisk, canFlag, canKill, actionLoading, onFlag, onKill }: RiskProjectCardsProps) {
  if (atRisk.length === 0) return null;

  return (
    <Card>
      <SectionHeader
        title="High/Critical Risk Projects"
        subtitle="These projects should be reviewed for potential retirement"
        icon={ShieldAlert}
        iconColor="text-red-600"
        iconBg="bg-red-50"
      />
      <div className="space-y-2">
        {atRisk.map((sc) => {
          const risk = RISK_CONFIG[sc.riskLevel];
          return (
            <div key={sc.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${risk.borderColor} ${risk.bgColor}`}>
              <div className="flex items-center gap-3">
                {sc.flaggedForReview && <Flag className="h-4 w-4 text-red-500" />}
                <div>
                  <p className="text-sm font-medium text-gray-900">{sc.productName}</p>
                  <p className="text-xs text-gray-500">
                    Composite: {sc.compositeScore.toFixed(0)} · Cost: {formatCurrency(sc.monthlyCost, true)}/mo
                    {sc.roi !== null && ` · ROI: ${sc.roi.toFixed(1)}x`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${risk.color} ${risk.bgColor} ${risk.borderColor}`}>
                  {risk.label}
                </span>
                {canKill && sc.flaggedForReview ? (
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-red-600 hover:bg-red-700"
                    onClick={() => onKill(sc)}
                    disabled={actionLoading || !canMutate}
                    title={!canMutate ? "API unavailable in offline demo mode" : ""}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Kill Project
                  </Button>
                ) : canFlag && !sc.flaggedForReview ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-amber-600 border-amber-300 hover:bg-amber-50"
                    onClick={() => onFlag(sc)}
                    disabled={actionLoading || !canMutate}
                    title={!canMutate ? "API unavailable in offline demo mode" : ""}
                  >
                    <Flag className="h-3 w-3 mr-1" />
                    Flag for Review
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
