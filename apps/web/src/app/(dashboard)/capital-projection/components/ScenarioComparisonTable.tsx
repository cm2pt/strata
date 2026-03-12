import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { formatCurrency, formatROI } from "@/lib/format";
import type { ProjectionMonth } from "@/lib/types";
import { Target } from "lucide-react";

const SCENARIO_COLORS = {
  passive: "#7F1D1D",
  governance: "#B45309",
  active: "#0F766E",
} as const;

function DeltaCell({ value, format = "currency" }: { value: number; format?: "currency" | "roi" | "number" | "cei" }) {
  const isPositive = value > 0;
  const color = "text-red-900";
  const negColor = "text-teal-700";

  let formatted: string;
  switch (format) {
    case "roi":
      formatted = `${isPositive ? "+" : ""}${value.toFixed(2)}x`;
      break;
    case "cei":
      formatted = `${isPositive ? "+" : ""}${value.toFixed(1)}`;
      break;
    case "number":
      formatted = `${isPositive ? "+" : ""}${value}`;
      break;
    default:
      formatted = `${isPositive ? "+" : ""}${formatCurrency(value, true)}`;
  }

  return <span className={`font-mono font-semibold ${isPositive ? color : negColor}`}>{formatted}</span>;
}

interface ScenarioComparisonTableProps {
  passive12: ProjectionMonth;
  governance12: ProjectionMonth;
  active12: ProjectionMonth;
}

export function ScenarioComparisonTable({ passive12, governance12, active12 }: ScenarioComparisonTableProps) {
  const p12 = passive12;
  const g12 = governance12;
  const a12 = active12;

  return (
    <>
      <SectionHeader
        title="Capital Scenario Analysis"
        subtitle="12-month forward projection under three governance modes"
        icon={Target}
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] uppercase tracking-wide text-gray-500 font-medium pb-3 pr-4">Metric</th>
                <th className="text-right text-[11px] uppercase tracking-wide font-medium pb-3 pr-4" style={{ color: SCENARIO_COLORS.passive }}>Passive</th>
                <th className="text-right text-[11px] uppercase tracking-wide font-medium pb-3 pr-4" style={{ color: SCENARIO_COLORS.governance }}>Governance</th>
                <th className="text-right text-[11px] uppercase tracking-wide font-medium pb-3 pr-4" style={{ color: SCENARIO_COLORS.active }}>Active</th>
                <th className="text-right text-[11px] uppercase tracking-wide text-gray-500 font-medium pb-3">Delta</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-3 pr-4 font-medium text-gray-700">Portfolio ROI</td>
                <td className="py-3 pr-4 text-right font-mono">{formatROI(p12.projectedRoi)}</td>
                <td className="py-3 pr-4 text-right font-mono">{formatROI(g12.projectedRoi)}</td>
                <td className="py-3 pr-4 text-right font-mono">{formatROI(a12.projectedRoi)}</td>
                <td className="py-3 text-right"><DeltaCell value={p12.projectedRoi - a12.projectedRoi} format="roi" /></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 pr-4 font-medium text-gray-700">Monthly Spend</td>
                <td className="py-3 pr-4 text-right font-mono">{formatCurrency(p12.projectedCost, true)}</td>
                <td className="py-3 pr-4 text-right font-mono">{formatCurrency(g12.projectedCost, true)}</td>
                <td className="py-3 pr-4 text-right font-mono">{formatCurrency(a12.projectedCost, true)}</td>
                <td className="py-3 text-right"><DeltaCell value={p12.projectedCost - a12.projectedCost} /></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 pr-4 font-medium text-gray-700">CEI Score</td>
                <td className="py-3 pr-4 text-right font-mono">{p12.projectedCei.toFixed(1)}</td>
                <td className="py-3 pr-4 text-right font-mono">{g12.projectedCei.toFixed(1)}</td>
                <td className="py-3 pr-4 text-right font-mono">{a12.projectedCei.toFixed(1)}</td>
                <td className="py-3 text-right"><DeltaCell value={p12.projectedCei - a12.projectedCei} format="cei" /></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 pr-4 font-medium text-gray-700">AI Spend</td>
                <td className="py-3 pr-4 text-right font-mono">{formatCurrency(p12.aiSpend, true)}</td>
                <td className="py-3 pr-4 text-right font-mono">{formatCurrency(g12.aiSpend, true)}</td>
                <td className="py-3 pr-4 text-right font-mono">{formatCurrency(a12.aiSpend, true)}</td>
                <td className="py-3 text-right"><DeltaCell value={p12.aiSpend - a12.aiSpend} /></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 pr-4 font-medium text-gray-700">Retirement Backlog</td>
                <td className="py-3 pr-4 text-right font-mono">{p12.retirementBacklog}</td>
                <td className="py-3 pr-4 text-right font-mono">{g12.retirementBacklog}</td>
                <td className="py-3 pr-4 text-right font-mono">{a12.retirementBacklog}</td>
                <td className="py-3 text-right"><DeltaCell value={p12.retirementBacklog - a12.retirementBacklog} format="number" /></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 pr-4 font-medium text-gray-700">Capital Freed</td>
                <td className="py-3 pr-4 text-right font-mono">{formatCurrency(p12.capitalFreedCumulative, true)}</td>
                <td className="py-3 pr-4 text-right font-mono">{formatCurrency(g12.capitalFreedCumulative, true)}</td>
                <td className="py-3 pr-4 text-right font-mono">{formatCurrency(a12.capitalFreedCumulative, true)}</td>
                <td className="py-3 text-right"><DeltaCell value={p12.capitalFreedCumulative - a12.capitalFreedCumulative} /></td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-gray-700">Capital Liability</td>
                <td className="py-3 pr-4 text-right font-mono text-red-900">{formatCurrency(p12.capitalLiability, true)}</td>
                <td className="py-3 pr-4 text-right font-mono text-amber-700">{formatCurrency(g12.capitalLiability, true)}</td>
                <td className="py-3 pr-4 text-right font-mono text-teal-700">$0</td>
                <td className="py-3 text-right"><DeltaCell value={p12.capitalLiability} /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-gray-400 mt-4">
          Deterministic projection based on current portfolio metrics. Passive assumes zero governance activity; Governance applies retirements and cost optimizations at current decision velocity; Active adds AI project kills, pricing revenue, and capital reallocation.
        </p>
      </Card>
    </>
  );
}
