import { formatCurrency } from "@/lib/format";
import { DecisionStatusBadge } from "@/components/shared/decision-status-badge";
import type { Decision } from "@/lib/types";

interface RetirementSavingsSectionProps {
  approvedDecisions: Decision[];
  pendingDecisions: Decision[];
  realizedSavings: number;
}

export function RetirementSavingsSection({ approvedDecisions, pendingDecisions, realizedSavings }: RetirementSavingsSectionProps) {
  const approvedRetirements = approvedDecisions.filter(d => d.type === "retirement");
  const pendingRetirements = pendingDecisions.filter(d => d.type === "retirement");

  return (
    <section className="mb-10">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">4 · Retirement Savings</h2>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-3">Completed Retirements</p>
          <div className="space-y-2">
            {approvedRetirements.map(d => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/30 px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-gray-900">{d.productName}</p>
                  <p className="text-[10px] text-gray-500">{d.resolution?.substring(0, 80)}...</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-xs font-semibold text-emerald-600 font-mono">+{formatCurrency(d.actualImpact ?? 0, true)}/mo</p>
                  <DecisionStatusBadge status={d.status} size="xs" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-gray-500">Total realized savings</span>
            <span className="text-sm font-semibold text-emerald-600 font-mono">{formatCurrency(realizedSavings, true)}/mo</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-3">Pending Retirement Reviews</p>
          <div className="space-y-2">
            {pendingRetirements.map(d => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/30 px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-gray-900">{d.productName}</p>
                  <p className="text-[10px] text-gray-500">Assigned to {d.assignedTo}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-xs font-semibold text-amber-600 font-mono">{formatCurrency(d.estimatedImpact, true)}/mo</p>
                  <DecisionStatusBadge status={d.status} size="xs" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-gray-500">Pending estimated savings</span>
            <span className="text-sm font-semibold text-amber-600 font-mono">
              {formatCurrency(pendingRetirements.reduce((s, d) => s + d.estimatedImpact, 0), true)}/mo
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
