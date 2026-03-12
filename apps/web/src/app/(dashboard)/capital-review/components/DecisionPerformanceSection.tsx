"use client";

import { SectionHeader } from "@/components/shared/section-header";
import { KPICard } from "@/components/shared/kpi-card";
import { Card } from "@/components/shared/card";
import { formatCurrency } from "@/lib/format";
import { Target } from "lucide-react";
import type { BoardCapitalSummary, SavingsSummary } from "@/lib/types";

const VALIDATION_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: "Confirmed", color: "text-emerald-700", bg: "bg-emerald-50" },
  validating: { label: "Validating", color: "text-blue-700", bg: "bg-blue-50" },
  underperforming: { label: "Underperforming", color: "text-amber-700", bg: "bg-amber-50" },
  pending: { label: "Pending", color: "text-gray-500", bg: "bg-gray-100" },
};

export interface DecisionPerformanceSectionProps {
  board: BoardCapitalSummary | null;
  savings: SavingsSummary | null;
}

export function DecisionPerformanceSection({ board, savings }: DecisionPerformanceSectionProps) {
  return (
    <>
      <SectionHeader title="Decision Performance" icon={Target} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Approved"
          value={(savings?.approvedRetirements ?? 0).toString()}
          trend={{ value: "decisions", direction: "neutral" }}
          variant="positive"
        />
        <KPICard
          label="Pending"
          value={(savings?.pendingRetirements ?? 0).toString()}
          trend={{ value: `${formatCurrency(savings?.pendingEstimatedSavings ?? 0, true)} est.`, direction: "neutral" }}
          variant="warning"
        />
        <KPICard
          label="Underperforming"
          value={(board?.underperformingDecisions ?? 0).toString()}
          trend={{ value: "below projection", direction: (board?.underperformingDecisions ?? 0) > 0 ? "down" : "neutral" }}
          variant={(board?.underperformingDecisions ?? 0) > 0 ? "negative" : "default"}
        />
        <KPICard
          label="This Quarter"
          value={(savings?.decisionsThisQuarter ?? 0).toString()}
          trend={{ value: "decisions created", direction: "neutral" }}
        />
      </div>

      {/* Top Capital Actions */}
      {board && board.topCapitalActions.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Top Capital Actions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 font-medium pb-2 pr-4">Product</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 font-medium pb-2 pr-4">Type</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-gray-400 font-medium pb-2 pr-4">Capital Freed</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 font-medium pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {board.topCapitalActions.map((action) => {
                  const vs = VALIDATION_STATUS[action.status] ?? VALIDATION_STATUS.pending;
                  return (
                    <tr key={action.decisionId} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-gray-900">{action.productName}</td>
                      <td className="py-2.5 pr-4 text-gray-500 capitalize">{action.decisionType.replace(/_/g, " ")}</td>
                      <td className="py-2.5 pr-4 text-right font-mono font-semibold text-emerald-600">
                        {formatCurrency(action.capitalFreed, true)}/mo
                      </td>
                      <td className="py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${vs.color} ${vs.bg}`}>
                          {vs.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
