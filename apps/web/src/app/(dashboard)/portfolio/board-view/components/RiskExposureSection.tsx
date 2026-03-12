import { formatCurrency } from "@/lib/format";
import type { DataProduct, ExecutiveInsight, DoNothingProjection } from "@/lib/types";

interface RiskExposureSectionProps {
  projection: DoNothingProjection;
  expiringDeclarations: DataProduct[];
  costSpikes: DataProduct[];
  riskInsights: ExecutiveInsight[];
}

export function RiskExposureSection({ projection, expiringDeclarations, costSpikes, riskInsights }: RiskExposureSectionProps) {
  return (
    <section className="mb-10">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">3 · Risk Exposure</h2>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-red-400">Value at Risk</p>
          <p className="text-xl font-bold text-red-700 font-mono mt-1">{formatCurrency(projection.projectedValueAtRisk, true)}<span className="text-xs font-normal">/mo</span></p>
          <p className="text-[10px] text-red-400 mt-0.5">{expiringDeclarations.length} declarations expiring within 30 days</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-amber-500">Wasted Spend (6-mo projection)</p>
          <p className="text-xl font-bold text-amber-700 font-mono mt-1">{formatCurrency(projection.projectedWastedSpend, true)}</p>
          <p className="text-[10px] text-amber-400 mt-0.5">If decline-stage products are not retired</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-blue-400">Cost Spikes Active</p>
          <p className="text-xl font-bold text-blue-700 font-mono mt-1">{costSpikes.length}</p>
          <p className="text-[10px] text-blue-400 mt-0.5">{costSpikes.map(p => `${p.name} (+${p.costTrend}%)`).join(", ")}</p>
        </div>
      </div>
      <div className="space-y-2">
        {expiringDeclarations.map(dp => (
          <div key={dp.id} className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/30 px-3 py-2">
            <div>
              <p className="text-xs font-medium text-gray-900">{dp.name}</p>
              <p className="text-[10px] text-red-500">Value declaration expires {dp.valueDeclaration?.nextReview}</p>
            </div>
            <p className="text-xs font-semibold text-red-600 font-mono">{formatCurrency(dp.declaredValue ?? 0, true)}/mo at risk</p>
          </div>
        ))}
      </div>
      {/* Risk insight from executive intelligence */}
      {riskInsights.map(insight => (
        <div key={insight.id} className="rounded-lg border border-red-200 bg-red-50/50 p-3 mt-3">
          <p className="text-xs font-semibold text-red-800">{insight.title}</p>
          <p className="text-[11px] text-red-700 mt-1">{insight.description}</p>
        </div>
      ))}
    </section>
  );
}
