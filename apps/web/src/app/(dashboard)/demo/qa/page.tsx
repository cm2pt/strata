"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { KPICard } from "@/components/shared/kpi-card";
import {
  runReconciliation,
  computeCompositeValue,
  computeProductROI,
  computePortfolioROI,
  computeCapitalFreed,
  computePortfolioMonthlySpend,
  computeTotalConsumers,
  countRetirementCandidates,
  computeCapitalMisallocated,
  computeCEI,
  activeProducts,
  classifyROI,
  type ReconciliationResult,
  type CapitalEvent,
} from "@/lib/metrics/canonical";
import {
  dataProducts,
  decisions,
  portfolioSummary,
  capitalImpactSummary,
  boardCapitalSummary,
  capitalEfficiency,
  savingsSummary,
  portfolioRebalance,
} from "@/lib/mock-data/seed";
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  Database,
  FlaskConical,
  BarChart3,
  GitBranch,
} from "lucide-react";

// Build canonical capital events from seed
const capitalEvents: CapitalEvent[] = capitalImpactSummary.recentEvents.map((e) => ({
  ...e,
  validationStatus:
    decisions.find((d) => d.id === e.decisionId)?.impactValidationStatus ?? undefined,
}));

function StatusBadge({ passed }: { passed: boolean }) {
  return passed ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
      <CheckCircle2 className="h-3 w-3" />
      PASS
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
      <XCircle className="h-3 w-3" />
      FAIL
    </span>
  );
}

function formatValue(v: number | string): string {
  if (typeof v === "string") return v;
  if (Number.isInteger(v)) return v.toLocaleString();
  return v.toFixed(4);
}

export default function DemoQAPage() {
  const results = useMemo<ReconciliationResult[]>(
    () =>
      runReconciliation(
        dataProducts,
        decisions,
        capitalEvents,
        portfolioSummary,
        capitalImpactSummary,
        boardCapitalSummary,
        capitalEfficiency,
        savingsSummary,
      ),
    [],
  );

  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.filter((r) => !r.passed).length;
  const allPassed = failCount === 0;

  // Portfolio metrics for display
  const active = activeProducts(dataProducts);
  const totalCost = computePortfolioMonthlySpend(dataProducts);
  const portfolioROI = computePortfolioROI(dataProducts);
  const totalConsumers = computeTotalConsumers(dataProducts);
  const misallocated = computeCapitalMisallocated(dataProducts);
  const retirementCount = countRetirementCandidates(dataProducts);
  const capitalFreed = computeCapitalFreed(capitalEvents);

  const ceiResult = computeCEI({
    products: dataProducts,
    decisions,
    capitalEvents,
    impactVariances: [0.85],
  });

  // Product-level audit
  const productAudit = useMemo(() => {
    return dataProducts.map((p) => {
      const expectedCV = computeCompositeValue(p.declaredValue, p.usageImpliedValue);
      const expectedROI = computeProductROI(expectedCV, p.monthlyCost);
      const expectedBand = classifyROI(expectedROI);
      const breakdown = p.costBreakdown;
      const breakdownSum =
        breakdown.compute + breakdown.storage + breakdown.pipeline + breakdown.humanEstimate;

      return {
        id: p.id,
        name: p.name,
        costMatch: Math.abs(p.monthlyCost - breakdownSum) < 1,
        cvMatch: Math.abs(p.compositeValue - expectedCV) < 1,
        roiMatch:
          p.roi === null
            ? expectedROI === null
            : expectedROI !== null && Math.abs(p.roi - expectedROI) < 0.001,
        bandMatch: p.roiBand === expectedBand,
        allOk: false, // computed below
      };
    }).map((item) => ({
      ...item,
      allOk: item.costMatch && item.cvMatch && item.roiMatch && item.bandMatch,
    }));
  }, []);

  const productsOk = productAudit.filter((p) => p.allOk).length;
  const productsFailed = productAudit.filter((p) => !p.allOk);

  // Cross-surface values
  const crossSurface = useMemo(() => [
    {
      metric: "Portfolio ROI",
      surfaces: [
        { name: "portfolioSummary", value: portfolioSummary.averageROI },
        { name: "capitalImpact", value: capitalImpactSummary.portfolioRoiCurrent },
        { name: "boardSummary", value: boardCapitalSummary.portfolioRoiCurrent },
        { name: "rebalance", value: portfolioRebalance.currentBlendedRoi },
        { name: "canonical", value: portfolioROI },
      ],
    },
    {
      metric: "Capital Freed",
      surfaces: [
        { name: "capitalImpact", value: capitalImpactSummary.totalCapitalFreed },
        { name: "savingsSummary", value: savingsSummary.totalCapitalFreedMonthly },
        { name: "boardSummary", value: boardCapitalSummary.totalCapitalFreed },
        { name: "canonical", value: capitalFreed },
      ],
    },
    {
      metric: "CEI Score",
      surfaces: [
        { name: "capitalEfficiency", value: capitalEfficiency.score },
        { name: "boardSummary", value: boardCapitalSummary.capitalEfficiencyScore },
        { name: "canonical", value: ceiResult.score },
      ],
    },
    {
      metric: "Total Products",
      surfaces: [
        { name: "portfolioSummary", value: portfolioSummary.totalProducts },
        { name: "dataProducts[]", value: dataProducts.length },
        { name: "active (non-retired)", value: active.length },
      ],
    },
    {
      metric: "Total Consumers",
      surfaces: [
        { name: "portfolioSummary", value: portfolioSummary.totalConsumers },
        { name: "canonical sum", value: totalConsumers },
      ],
    },
  ], [active.length, capitalFreed, ceiResult.score, portfolioROI, totalConsumers]);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Data Coherence QA"
        subtitle="Hidden dashboard — verifies every number reconciles across all surfaces"
        chips={
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              allPassed
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {allPassed ? (
              <ShieldCheck className="h-3.5 w-3.5" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            {allPassed ? "ALL RULES PASS" : `${failCount} RULE${failCount > 1 ? "S" : ""} FAILING`}
          </span>
        }
      />

      <PageShell>
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <KPICard
            label="Reconciliation Rules"
            value={`${passCount}/${results.length}`}
            variant={allPassed ? "positive" : "negative"}
            trend={{ value: allPassed ? "all passing" : `${failCount} failing`, direction: allPassed ? "up" : "down" }}
          />
          <KPICard
            label="Product Integrity"
            value={`${productsOk}/${dataProducts.length}`}
            variant={productsFailed.length === 0 ? "positive" : "negative"}
            trend={{ value: "cost/cv/roi/band", direction: productsFailed.length === 0 ? "up" : "down" }}
          />
          <KPICard
            label="Total Products"
            value={dataProducts.length.toString()}
            trend={{ value: `${active.length} active`, direction: "neutral" }}
          />
          <KPICard
            label="Portfolio Spend"
            value={`$${(totalCost / 1000).toFixed(0)}K`}
            trend={{ value: `$${(totalCost * 12 / 1_000_000).toFixed(1)}M/yr`, direction: "neutral" }}
          />
          <KPICard
            label="Portfolio ROI"
            value={`${portfolioROI.toFixed(2)}x`}
            trend={{ value: "cost-weighted", direction: "neutral" }}
          />
          <KPICard
            label="Capital Freed"
            value={`$${(capitalFreed / 1000).toFixed(1)}K`}
            variant="positive"
            trend={{ value: `$${(capitalFreed * 12 / 1000).toFixed(0)}K/yr`, direction: "up" }}
          />
        </div>

        {/* Reconciliation Rules */}
        <Card>
          <SectionHeader
            title="Reconciliation Rules"
            subtitle={`${passCount} of ${results.length} rules passing`}
            icon={ShieldCheck}
            iconColor={allPassed ? "text-emerald-600" : "text-red-600"}
            iconBg={allPassed ? "bg-emerald-50" : "bg-red-50"}
          />
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-gray-400">Rule</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Expected</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Actual</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Tolerance</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-gray-400">Detail</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr
                    key={i}
                    className={`border-b border-border last:border-0 ${
                      r.passed ? "" : "bg-red-50/30"
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <StatusBadge passed={r.passed} />
                    </td>
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-700">
                      {r.rule}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 text-right font-mono">
                      {formatValue(r.expected)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 text-right font-mono">
                      {formatValue(r.actual)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 text-right font-mono">
                      {r.tolerance === 0 ? "exact" : `\u00B1${r.tolerance}`}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 max-w-[300px] truncate">
                      {r.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Cross-Surface Value Comparison */}
        <Card>
          <SectionHeader
            title="Cross-Surface Value Comparison"
            subtitle="Same metric shown on multiple pages must match"
            icon={GitBranch}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <div className="space-y-4">
            {crossSurface.map((cs) => {
              const values = cs.surfaces.map((s) =>
                typeof s.value === "number" ? s.value.toFixed(4) : String(s.value),
              );
              const allMatch = new Set(values).size === 1;
              return (
                <div key={cs.metric} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">
                      {cs.metric}
                    </span>
                    <StatusBadge passed={allMatch} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {cs.surfaces.map((s) => (
                      <div
                        key={s.name}
                        className="rounded bg-gray-50 px-3 py-2 text-center"
                      >
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">
                          {s.name}
                        </p>
                        <p className="text-sm font-mono font-semibold text-gray-700">
                          {typeof s.value === "number"
                            ? Number.isInteger(s.value)
                              ? s.value.toLocaleString()
                              : s.value.toFixed(4)
                            : String(s.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* CEI Component Breakdown */}
        <Card>
          <SectionHeader
            title="CEI Component Audit"
            subtitle={`Composite score: ${ceiResult.score.toFixed(1)}/100`}
            icon={BarChart3}
            iconColor="text-purple-600"
            iconBg="bg-purple-50"
          />
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-gray-400">Component</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Score</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Max</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">%</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-gray-400 w-[200px]">Bar</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(ceiResult.components).map(([name, c]) => {
                  const pct = (c.score / c.max) * 100;
                  return (
                    <tr key={name} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 text-xs font-medium text-gray-700">
                        {name.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-gray-600 text-right">
                        {c.score.toFixed(1)}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-gray-400 text-right">
                        {c.max}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-gray-600 text-right">
                        {pct.toFixed(0)}%
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="h-2 w-full rounded-full bg-gray-100">
                          <div
                            className={`h-2 rounded-full ${
                              pct >= 80
                                ? "bg-emerald-500"
                                : pct >= 50
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Product Integrity Audit */}
        <Card>
          <SectionHeader
            title="Product Integrity Audit"
            subtitle={`${productsOk} of ${dataProducts.length} products pass all checks`}
            icon={Database}
            iconColor={productsFailed.length === 0 ? "text-emerald-600" : "text-amber-600"}
            iconBg={productsFailed.length === 0 ? "bg-emerald-50" : "bg-amber-50"}
          />
          {productsFailed.length === 0 ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-emerald-700">
                All {dataProducts.length} products pass integrity checks
              </p>
              <p className="text-xs text-emerald-500 mt-1">
                Cost breakdown sums, composite value formulas, ROI calculations, and band classifications all verified.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-border">
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-gray-400">Product</th>
                    <th className="px-4 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-gray-400">Cost</th>
                    <th className="px-4 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-gray-400">CV</th>
                    <th className="px-4 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-gray-400">ROI</th>
                    <th className="px-4 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-gray-400">Band</th>
                  </tr>
                </thead>
                <tbody>
                  {productsFailed.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0 bg-red-50/30">
                      <td className="px-4 py-2.5 text-xs font-medium text-gray-700">
                        {p.id}: {p.name}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <StatusBadge passed={p.costMatch} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <StatusBadge passed={p.cvMatch} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <StatusBadge passed={p.roiMatch} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <StatusBadge passed={p.bandMatch} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Portfolio Breakdown */}
        <Card>
          <SectionHeader
            title="Portfolio Breakdown"
            subtitle="Current canonical snapshot"
            icon={FlaskConical}
            iconColor="text-teal-600"
            iconBg="bg-teal-50"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Active Products", value: active.length.toString() },
              { label: "Retired", value: dataProducts.filter((p) => p.lifecycleStage === "retired").length.toString() },
              { label: "Monthly Spend", value: `$${(totalCost / 1000).toFixed(1)}K` },
              { label: "Annual Spend", value: `$${(totalCost * 12 / 1_000_000).toFixed(2)}M` },
              { label: "Avg ROI", value: `${portfolioROI.toFixed(2)}x` },
              { label: "Total Consumers", value: totalConsumers.toLocaleString() },
              { label: "Capital Misallocated", value: `$${(misallocated / 1000).toFixed(1)}K` },
              { label: "Retirement Candidates", value: retirementCount.toString() },
              { label: "Capital Freed/mo", value: `$${(capitalFreed / 1000).toFixed(1)}K` },
              { label: "Capital Freed/yr", value: `$${(capitalFreed * 12 / 1000).toFixed(0)}K` },
              { label: "CEI Score", value: `${ceiResult.score.toFixed(1)}/100` },
              { label: "Decisions", value: decisions.length.toString() },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border bg-gray-50/50 p-3 text-center"
              >
                <p className="text-[10px] uppercase tracking-wider text-gray-400">
                  {item.label}
                </p>
                <p className="text-lg font-bold text-gray-700 font-mono mt-0.5">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Timestamp */}
        <div className="text-center text-[10px] text-gray-300 pb-4">
          Coherence dashboard generated at {new Date().toISOString()} | Contract: DATA_COHERENCE_CONTRACT.md
        </div>
      </PageShell>
    </div>
  );
}
