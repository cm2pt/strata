import { formatCurrency, formatPercent, formatROI } from "@/lib/format";
import type { CapitalImpactSummary } from "@/lib/types";

interface CapitalImpactSectionProps {
  capitalImpact: CapitalImpactSummary | null | undefined;
}

export function CapitalImpactSection({ capitalImpact }: CapitalImpactSectionProps) {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">6 · Capital Impact</h2>
      {capitalImpact ? (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-emerald-500">Total Capital Freed</p>
              <p className="text-xl font-bold text-emerald-700 font-mono mt-1">{formatCurrency(capitalImpact.totalCapitalFreed, true)}<span className="text-xs font-normal">/mo</span></p>
              <p className="text-[10px] text-emerald-500 mt-0.5">{formatCurrency(capitalImpact.totalCapitalFreedAnnual, true)} annualized</p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-blue-500">Budget Reallocated</p>
              <p className="text-xl font-bold text-blue-700 font-mono mt-1">{formatCurrency(capitalImpact.budgetReallocated, true)}</p>
              <p className="text-[10px] text-blue-400 mt-0.5">Redirected to high-ROI products</p>
            </div>
            <div className="rounded-lg border border-purple-200 bg-purple-50/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-purple-500">ROI Delta</p>
              <p className="text-xl font-bold text-purple-700 font-mono mt-1">+{formatPercent(capitalImpact.portfolioRoiDelta)}</p>
              <p className="text-[10px] text-purple-400 mt-0.5">{formatROI(capitalImpact.portfolioRoiPrevious)} → {formatROI(capitalImpact.portfolioRoiCurrent)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400">Decisions Executed</p>
              <p className="text-xl font-bold text-gray-900 font-mono mt-1">{capitalImpact.decisionsExecuted}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{capitalImpact.decisionsUnderReview} under review</p>
            </div>
          </div>

          {/* Capital by Type */}
          {capitalImpact.capitalByType && capitalImpact.capitalByType.length > 0 && (
            <CapitalByTypeChart capitalByType={capitalImpact.capitalByType} />
          )}

          {/* Recent Capital Events */}
          {capitalImpact.recentEvents && capitalImpact.recentEvents.length > 0 && (
            <RecentCapitalEvents events={capitalImpact.recentEvents} />
          )}
        </>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-6 text-center">
          <p className="text-sm text-gray-500">No capital impact data available yet. Execute decisions to see financial effects.</p>
        </div>
      )}
    </section>
  );
}

function CapitalByTypeChart({ capitalByType }: { capitalByType: { type: string; amount: number }[] }) {
  const maxAmount = Math.max(...capitalByType.map(c => c.amount));
  const typeColors: Record<string, string> = {
    retirement_freed: "bg-emerald-500",
    cost_optimization: "bg-blue-500",
    reallocation: "bg-violet-500",
    pricing_revenue: "bg-amber-500",
    ai_spend_reduced: "bg-red-500",
  };

  return (
    <div className="mb-6">
      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-3">Capital Freed by Type</p>
      <div className="space-y-2">
        {capitalByType.map((item) => {
          const pct = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
          const color = typeColors[item.type] ?? "bg-gray-400";
          return (
            <div key={item.type} className="flex items-center gap-3">
              <span className="text-[10px] text-gray-500 w-28 text-right truncate">{item.type.replace(/_/g, " ")}</span>
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-mono font-semibold text-gray-700 w-20 text-right">{formatCurrency(item.amount, true)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecentCapitalEvents({ events }: { events: { id: string; description: string; eventType: string; amount: number; effectiveDate: string }[] }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-3">Recent Capital Events</p>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400">Event</th>
              <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400">Type</th>
              <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-gray-400">Amount</th>
              <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-gray-400">Date</th>
            </tr>
          </thead>
          <tbody>
            {events.slice(0, 5).map((event) => (
              <tr key={event.id} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-1.5 text-xs text-gray-700 max-w-[300px] truncate">{event.description}</td>
                <td className="px-3 py-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{event.eventType.replace(/_/g, " ")}</span>
                </td>
                <td className="px-3 py-1.5 text-xs font-mono font-semibold text-emerald-600 text-right">+{formatCurrency(event.amount, true)}</td>
                <td className="px-3 py-1.5 text-[10px] text-gray-400 text-right">{event.effectiveDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
