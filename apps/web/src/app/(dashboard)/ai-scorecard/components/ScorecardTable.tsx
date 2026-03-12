import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { formatCurrency } from "@/lib/format";
import { canMutate } from "@/lib/api/client";
import type { AIProjectScorecard, AIProjectRiskLevel } from "@/lib/types";
import { Brain, Flag, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const RISK_CONFIG: Record<AIProjectRiskLevel, { label: string; color: string; bgColor: string; borderColor: string }> = {
  low: { label: "Low", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
  medium: { label: "Medium", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  high: { label: "High", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  critical: { label: "Critical", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-200" },
};

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

interface ScoreBands {
  low: number;
  medium: number;
  high: number;
}

interface ScorecardTableProps {
  items: AIProjectScorecard[];
  scoreBands: ScoreBands;
  canFlag: boolean;
  canKill: boolean;
  actionLoading: boolean;
  onFlag: (scorecard: AIProjectScorecard) => void;
  onKill: (scorecard: AIProjectScorecard) => void;
}

export function ScorecardTable({ items, scoreBands, canFlag, canKill, actionLoading, onFlag, onKill }: ScorecardTableProps) {
  return (
    <Card>
      <SectionHeader
        title="Project Scorecards"
        subtitle="All projects scored on 5 dimensions — lower composite = higher risk"
        icon={Brain}
        iconColor="text-purple-600"
        iconBg="bg-purple-50"
      />
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-border">
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-gray-400">Product</th>
              <th className="px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-gray-400">Cost</th>
              <th className="px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-gray-400">Value</th>
              <th className="px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-gray-400">Confidence</th>
              <th className="px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-gray-400">ROI</th>
              <th className="px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-gray-400">Dep. Risk</th>
              <th className="px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-gray-400">Composite</th>
              <th className="px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-gray-400">Risk</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Cost/mo</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items
              .sort((a, b) => a.compositeScore - b.compositeScore)
              .map((sc) => {
                const risk = RISK_CONFIG[sc.riskLevel];
                const scoreColor =
                  sc.compositeScore >= scoreBands.low ? "#10B981" :
                  sc.compositeScore >= scoreBands.medium ? "#3B82F6" :
                  sc.compositeScore >= scoreBands.high ? "#F59E0B" : "#EF4444";

                return (
                  <tr key={sc.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {sc.flaggedForReview && <Flag className="h-3 w-3 text-red-500 flex-shrink-0" />}
                        <div>
                          <p className="text-xs font-medium text-gray-900">{sc.productName}</p>
                          <p className="text-[10px] text-gray-400">
                            {sc.roi !== null ? `ROI: ${sc.roi.toFixed(1)}x` : "No ROI"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-gray-500 font-mono">{sc.costScore.toFixed(0)}</span>
                        <ScoreBar value={sc.costScore} color={scoreColor} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-gray-500 font-mono">{sc.valueScore.toFixed(0)}</span>
                        <ScoreBar value={sc.valueScore} color={scoreColor} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-gray-500 font-mono">{sc.confidenceScore.toFixed(0)}</span>
                        <ScoreBar value={sc.confidenceScore} color={scoreColor} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-gray-500 font-mono">{sc.roiScore.toFixed(0)}</span>
                        <ScoreBar value={sc.roiScore} color={scoreColor} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-gray-500 font-mono">{sc.dependencyRiskScore.toFixed(0)}</span>
                        <ScoreBar value={sc.dependencyRiskScore} color={scoreColor} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-sm font-bold font-mono" style={{ color: scoreColor }}>
                        {sc.compositeScore.toFixed(0)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${risk.color} ${risk.bgColor} ${risk.borderColor}`}>
                        {risk.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-700 text-right font-mono">
                      {formatCurrency(sc.monthlyCost, true)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canFlag && !sc.flaggedForReview && (sc.riskLevel === "high" || sc.riskLevel === "critical") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] px-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                            onClick={() => onFlag(sc)}
                            disabled={actionLoading || !canMutate}
                            title={!canMutate ? "API unavailable in offline demo mode" : ""}
                          >
                            <Flag className="h-3 w-3 mr-1" />
                            Flag
                          </Button>
                        )}
                        {canKill && sc.flaggedForReview && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] px-2 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => onKill(sc)}
                            disabled={actionLoading || !canMutate}
                            title={!canMutate ? "API unavailable in offline demo mode" : ""}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Kill
                          </Button>
                        )}
                        {sc.reviewedAt && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-gray-300" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-gray-400 mt-3">
        <strong>Scoring:</strong> Cost (20%) + Value (25%) + Confidence (15%) + ROI (25%) + Dependency Risk (15%). Lower composite = higher risk. Critical &lt; {scoreBands.high}, High &lt; {scoreBands.medium}, Medium &lt; {scoreBands.low}.
      </p>
    </Card>
  );
}
