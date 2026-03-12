import { KPICard } from "@/components/shared/kpi-card";
import { CoverageBar } from "@/components/shared/coverage-bar";
import { SourceTooltip } from "@/components/shared/source-tooltip";
import { useExplainability } from "@/lib/contexts/explainability-context";
import { useAssetProvenance } from "@/lib/api/hooks";
import {
  formatCurrency,
  formatROI,
  formatNumber,
  formatPercent,
  formatTrend,
} from "@/lib/format";
import type { DataProduct, ValueMethod, DisplayConfig } from "@/lib/types";

const methodLabels: Record<ValueMethod, string> = {
  revenue_attribution: "Revenue Attribution",
  cost_avoidance: "Cost Avoidance",
  efficiency_gain: "Efficiency Gain",
  compliance: "Compliance Requirement",
  strategic: "Strategic Enabler",
};

export interface AssetKPICardsProps {
  product: DataProduct;
  cfg: DisplayConfig | null | undefined;
}

export function AssetKPICards({ product, cfg }: AssetKPICardsProps) {
  const vd = product.valueDeclaration;
  const { showDataSources } = useExplainability();
  const { data: provenance } = useAssetProvenance(product.id);

  // Helper to find provenance for a field
  const getFieldProv = (fieldName: string) => {
    if (!showDataSources || !provenance) return undefined;
    return provenance.fields.find(f => f.fieldName === fieldName) ?? undefined;
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <KPICard
          label="Monthly Cost"
          value={formatCurrency(product.monthlyCost, true)}
          trend={{
            value: product.hasCostSpike ? "Cost spike" : formatTrend(product.costTrend),
            direction:
              product.hasCostSpike || product.costTrend > 10
                ? "up"
                : product.costTrend < -5
                  ? "down"
                  : "neutral",
            label: product.hasCostSpike ? "" : "MoM",
          }}
          info={`Total cost of ownership: compute + storage + pipeline + human effort estimate. Coverage: ${formatPercent(product.costCoverage)}${product.hasCostSpike ? ". Cost spike detected — recent increase exceeds normal variance." : ""}`}
          variant={product.hasCostSpike ? "negative" : "default"}
        />
        <KPICard
          label="Declared Value"
          value={
            product.declaredValue
              ? formatCurrency(product.declaredValue, true)
              : "\u2014"
          }
          trend={
            vd?.isExpiring
              ? {
                  value: `Review ${vd.nextReview}`,
                  direction: "down" as const,
                  label: "Expiring",
                }
              : undefined
          }
          info={
            product.declaredValue
              ? `Declared by ${vd?.declaredBy} via ${vd ? methodLabels[vd.method] : "unknown"}${vd?.isExpiring ? ". Declaration expiring soon — please revalidate." : ""}`
              : "No value declaration yet. ROI cannot be calculated without a value declaration."
          }
          variant={vd?.isExpiring ? "warning" : product.declaredValue ? "default" : "warning"}
        />
        {product.inferredValue && (
          <KPICard
            label="Inferred Value"
            value={formatCurrency(product.inferredValue.monthlyMid, true)}
            trend={{
              value: `${formatPercent(product.inferredValue.confidence)} conf`,
              direction: product.inferredValue.confidence >= 0.6 ? "up" : "neutral",
            }}
            info={`Engine-inferred monthly value (mid estimate). Range: ${formatCurrency(product.inferredValue.annualBand.low / 12, true)} – ${formatCurrency(product.inferredValue.annualBand.high / 12, true)}/mo. Source: ${product.valueSource}.`}
            variant={product.inferredValue.confidence >= 0.7 ? "positive" : "default"}
          />
        )}
        <KPICard
          label="ROI"
          value={formatROI(product.roi)}
          trend={
            product.roi
              ? {
                  value:
                    product.roi >= (cfg?.roiBands.high ?? 3)
                      ? "High performer"
                      : product.roi >= (cfg?.roiBands.healthy ?? 1)
                        ? "Healthy"
                        : "Underperforming",
                  direction:
                    product.roi >= (cfg?.roiBands.healthy ?? 1) ? "up" : "down",
                }
              : undefined
          }
          variant={
            product.roi === null
              ? "default"
              : product.roi >= (cfg?.roiBands.high ?? 3)
                ? "positive"
                : product.roi >= (cfg?.roiBands.healthy ?? 1)
                  ? "default"
                  : "negative"
          }
          info="ROI = Composite Value / Total Cost. Composite Value = 70% Declared Value + 30% Usage-Implied Value."
        />
        <KPICard
          label="Consumers"
          value={formatNumber(product.monthlyConsumers)}
          trend={{
            value: formatTrend(product.usageTrend),
            direction:
              product.usageTrend > 0
                ? "up"
                : product.usageTrend < 0
                  ? "down"
                  : "neutral",
            label: "MoM",
          }}
          info={`${(product.consumerTeams ?? []).length} teams actively consuming this product.`}
        />
        <KPICard
          label="Trust Score"
          value={formatPercent(product.trustScore)}
          info={`Freshness: ${product.freshnessHours}h (SLA: ${product.freshnessSLA}h) · Completeness: ${formatPercent(product.completeness)} · Accuracy: ${formatPercent(product.accuracy)}`}
          variant={
            product.trustScore >= (cfg?.trustScoreBands.high ?? 0.9)
              ? "positive"
              : product.trustScore >= (cfg?.trustScoreBands.medium ?? 0.7)
                ? "default"
                : "negative"
          }
        />
      </div>

      <CoverageBar value={product.costCoverage} label="Cost data coverage" />

      {/* Data source annotations — visible only when explainability mode is on */}
      {showDataSources && provenance && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-indigo-500 font-medium mb-2">Data Source Annotations</p>
          <div className="flex flex-wrap gap-3">
            {[
              { field: "monthly_cost", label: "Monthly Cost" },
              { field: "composite_value", label: "Value" },
              { field: "monthly_consumers", label: "Consumers" },
              { field: "trust_score", label: "Trust Score" },
              { field: "cost_trend", label: "Cost Trend" },
            ].map(({ field, label }) => {
              const fp = getFieldProv(field);
              if (!fp) return null;
              return (
                <SourceTooltip key={field} fieldName={field} provenance={fp}>
                  <span className="inline-flex items-center gap-1 text-[11px] text-indigo-700">
                    <span className="font-medium">{label}</span>
                    <span className="text-indigo-400">&middot;</span>
                    <span className="text-indigo-500">{fp.sourcePlatform}</span>
                  </span>
                </SourceTooltip>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
