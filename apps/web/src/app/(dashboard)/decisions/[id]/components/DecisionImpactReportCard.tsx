import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { ShieldCheck } from "lucide-react";
import dynamic from "next/dynamic";
import { impactStatusStyles, formatCurrency } from "./decision-helpers";
import type { Decision, ImpactReport } from "@/lib/types";

const DecisionCostTrendChart = dynamic(
  () =>
    import("@/components/charts/decision-cost-trend-chart").then((m) => ({
      default: m.DecisionCostTrendChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 animate-pulse bg-gray-100 rounded-lg" />
    ),
  }
);

export interface DecisionImpactReportCardProps {
  decision: Decision;
  impactReport: ImpactReport;
}

export function DecisionImpactReportCard({
  decision,
  impactReport,
}: DecisionImpactReportCardProps) {
  const impactStyle =
    impactStatusStyles[decision.impactValidationStatus ?? "pending"];

  return (
    <Card>
      <SectionHeader title="Impact Verification Report" icon={ShieldCheck} />

      {/* Validation status banner */}
      <div
        className={`mt-4 flex items-center gap-2 rounded-lg border p-3 ${impactStyle.border} ${impactStyle.bg}`}
      >
        <ShieldCheck className={`h-4 w-4 ${impactStyle.text}`} />
        <span className={`text-sm font-medium ${impactStyle.text}`}>
          Impact {impactStyle.label.toLowerCase()}
          {impactReport.windowComplete
            ? " — validation window complete"
            : " — validation in progress"}
        </span>
      </div>

      {/* Projected vs Actual */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-gray-50 p-4">
          <p className="text-xs text-gray-500 mb-1">Projected Savings</p>
          <p className="text-lg font-bold text-gray-900">
            {formatCurrency(impactReport.projectedSavingsMonthly)}/mo
          </p>
        </div>
        <div className="rounded-lg border bg-gray-50 p-4">
          <p className="text-xs text-gray-500 mb-1">Actual Savings</p>
          <p className="text-lg font-bold text-gray-900">
            {formatCurrency(impactReport.actualSavingsMeasured)}/mo
          </p>
        </div>
        <div className="rounded-lg border bg-gray-50 p-4">
          <p className="text-xs text-gray-500 mb-1">Variance</p>
          <p
            className={`text-lg font-bold ${
              impactReport.varianceFromProjection >= 0
                ? "text-emerald-600"
                : "text-amber-600"
            }`}
          >
            {impactReport.varianceFromProjection >= 0 ? "+" : ""}
            {Math.round(impactReport.varianceFromProjection * 100)}%
          </p>
        </div>
      </div>

      {/* Cost Trend Chart */}
      {impactReport.costTrend.length > 0 && (
        <div className="mt-4 h-48">
          <DecisionCostTrendChart
            data={impactReport.costTrend}
            resolvedAt={decision.resolvedAt}
          />
        </div>
      )}

      {/* Narrative */}
      {impactReport.narrativeSummary && (
        <div className="mt-4 rounded-lg border bg-white p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">
            Analysis Summary
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            {impactReport.narrativeSummary}
          </p>
        </div>
      )}
    </Card>
  );
}
