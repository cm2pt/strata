import { formatCurrency, formatROI } from "@/lib/format";
import type { CostTrendPoint, ROIHistoryPoint } from "@/lib/types";
import dynamic from "next/dynamic";

const CostValueTrend = dynamic(
  () => import("@/components/charts/cost-value-trend").then(m => ({ default: m.CostValueTrend })),
  { ssr: false, loading: () => <div className="h-[220px] animate-pulse bg-gray-100 rounded-lg" /> }
);

interface ROITrendSectionProps {
  costTrend: CostTrendPoint[];
  roiHistory: ROIHistoryPoint[];
}

export function ROITrendSection({ costTrend, roiHistory }: ROITrendSectionProps) {
  return (
    <section className="mb-10">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">2 · ROI Trend (6 Months)</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-3">Cost vs. Composite Value</p>
          <CostValueTrend data={costTrend} height={200} />
          <div className="flex items-center gap-4 mt-2 px-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Total Cost
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Composite Value
            </div>
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-3">Monthly ROI Progression</p>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400">Month</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-gray-400">Cost</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-gray-400">Value</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-gray-400">ROI</th>
                </tr>
              </thead>
              <tbody>
                {roiHistory.map((r) => (
                  <tr key={r.month} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-1.5 text-xs text-gray-600">{r.month}</td>
                    <td className="px-3 py-1.5 text-xs text-gray-700 text-right font-mono">{formatCurrency(r.cost, true)}</td>
                    <td className="px-3 py-1.5 text-xs text-gray-700 text-right font-mono">{formatCurrency(r.compositeValue, true)}</td>
                    <td className="px-3 py-1.5 text-xs font-semibold text-emerald-600 text-right font-mono">{formatROI(r.roi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5">
            <p className="text-xs text-emerald-700"><strong>Trend:</strong> Portfolio ROI improved from 2.4x → 2.8x (+17%) over 6 months.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
