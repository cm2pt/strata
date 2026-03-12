import { formatCurrency, formatROI } from "@/lib/format";
import type { ExecutiveInsight } from "@/lib/types";

interface DomainAllocation {
  name: string;
  cost: number;
  value: number;
  roi: number;
}

interface CapitalAllocationTableProps {
  domainAllocation: DomainAllocation[];
  totalCost: number;
  averageROI: number;
  opportunityInsights: ExecutiveInsight[];
}

export function CapitalAllocationTable({ domainAllocation, totalCost, averageROI, opportunityInsights }: CapitalAllocationTableProps) {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">5 · Capital Allocation Summary</h2>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400">Domain</th>
              <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-gray-400">Monthly Cost</th>
              <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-gray-400">% of Total</th>
              <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-gray-400">Composite Value</th>
              <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-gray-400">ROI</th>
            </tr>
          </thead>
          <tbody>
            {domainAllocation.map((d) => (
              <tr key={d.name} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2 text-xs font-medium text-gray-900">{d.name}</td>
                <td className="px-4 py-2 text-xs text-gray-700 text-right font-mono">{formatCurrency(d.cost, true)}</td>
                <td className="px-4 py-2 text-xs text-gray-500 text-right">{Math.round((d.cost / totalCost) * 100)}%</td>
                <td className="px-4 py-2 text-xs text-gray-700 text-right font-mono">{formatCurrency(d.value, true)}</td>
                <td className={`px-4 py-2 text-xs font-semibold text-right font-mono ${d.roi >= 2 ? "text-emerald-600" : d.roi >= 1 ? "text-gray-900" : "text-red-600"}`}>
                  {d.roi > 0 ? `${d.roi.toFixed(1)}x` : "\u2014"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-200">
              <td className="px-4 py-2 text-xs font-semibold text-gray-900">Total</td>
              <td className="px-4 py-2 text-xs font-semibold text-gray-900 text-right font-mono">{formatCurrency(totalCost, true)}</td>
              <td className="px-4 py-2 text-xs font-semibold text-gray-900 text-right">100%</td>
              <td className="px-4 py-2 text-xs font-semibold text-gray-900 text-right font-mono">
                {formatCurrency(domainAllocation.reduce((s, d) => s + d.value, 0), true)}
              </td>
              <td className="px-4 py-2 text-xs font-semibold text-emerald-600 text-right font-mono">{formatROI(averageROI)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {/* Opportunity insight */}
      {opportunityInsights.map(insight => (
        <div key={insight.id} className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 mt-3">
          <p className="text-xs font-semibold text-emerald-800">{insight.title}</p>
          <p className="text-[11px] text-emerald-700 mt-1">{insight.description}</p>
        </div>
      ))}
    </section>
  );
}
