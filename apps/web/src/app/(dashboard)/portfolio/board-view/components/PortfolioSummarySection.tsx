import { formatCurrency, formatROI, formatNumber } from "@/lib/format";
import type { PortfolioSummary, ExecutiveInsight } from "@/lib/types";

interface PortfolioSummarySectionProps {
  summary: PortfolioSummary;
  realizedSavings: number;
  approvedCount: number;
  topInsight: ExecutiveInsight;
}

export function PortfolioSummarySection({ summary, realizedSavings, approvedCount, topInsight }: PortfolioSummarySectionProps) {
  const s = summary;

  const kpis = [
    { label: "Data Products", value: s.totalProducts.toString(), sub: `+${s.newProductsThisQuarter} this quarter` },
    { label: "Monthly Cost", value: formatCurrency(s.totalCost, true), sub: "+3.2% MoM" },
    { label: "Portfolio ROI", value: formatROI(s.averageROI), sub: `+${s.roiTrend} vs last quarter`, highlight: true },
    { label: "Active Consumers", value: formatNumber(s.totalConsumers), sub: `+${s.consumersTrend}% QoQ` },
    { label: "Realized Savings", value: formatCurrency(realizedSavings, true), sub: `${approvedCount} decisions executed`, highlight: true },
    { label: "Value Coverage", value: `${Math.round((s.productsWithValue / s.totalProducts) * 100)}%`, sub: `${s.productsWithValue}/${s.totalProducts} declared` },
  ];

  return (
    <section className="mb-10">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">1 · Portfolio Summary</h2>
      <div className="grid grid-cols-6 gap-4 mb-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`rounded-lg border p-3 ${kpi.highlight ? "border-emerald-200 bg-emerald-50/30" : "border-gray-200"}`}>
            <p className="text-[10px] uppercase tracking-wider text-gray-400">{kpi.label}</p>
            <p className="text-xl font-bold text-gray-900 font-mono mt-1">{kpi.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>
      {/* Key AI insight */}
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
        <p className="text-xs font-semibold text-gray-700">{topInsight.title}</p>
        <p className="text-[11px] text-gray-500 mt-1">{topInsight.description}</p>
      </div>
    </section>
  );
}
