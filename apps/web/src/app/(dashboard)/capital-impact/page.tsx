"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { KPISkeleton, CardSkeleton } from "@/components/shared/skeleton";
import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { KPICard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { MetricProvenanceDrawer } from "@/components/shared/metric-provenance-drawer";
import { useCapitalImpact, useOpportunityCost } from "@/lib/api/hooks";
import { getMetricProvenance } from "@/lib/metrics/provenance";
import { formatCurrency, formatROI, formatPercent } from "@/lib/format";
import { exportToCSV, formatCurrencyCSV } from "@/lib/utils/csv-export";
import { useToast } from "@/components/shared/toast";
import { NextStepCard } from "@/components/shared/next-step-card";
import { PersonaWelcomeBanner } from "@/components/shared/persona-welcome-banner";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  Clock,
  Tag,
  BarChart3,
  Activity,
  Download,
} from "lucide-react";
import dynamic from "next/dynamic";

const CumulativeCapitalChart = dynamic(
  () => import("@/components/charts/cumulative-capital-chart").then(m => ({ default: m.CumulativeCapitalChart })),
  { ssr: false, loading: () => <div className="h-[260px] animate-pulse bg-gray-100 rounded-lg" /> }
);
const CapitalByTypeChart = dynamic(
  () => import("@/components/charts/capital-by-type-chart").then(m => ({ default: m.CapitalByTypeChart })),
  { ssr: false, loading: () => <div className="h-[260px] animate-pulse bg-gray-100 rounded-lg" /> }
);
const ValueGapWaterfall = dynamic(
  () => import("@/components/charts/value-gap-waterfall").then(m => ({ default: m.ValueGapWaterfall })),
  { ssr: false, loading: () => <div className="h-[260px] animate-pulse bg-gray-100 rounded-lg" /> }
);

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  retirement_freed: { label: "Retirement Freed", color: "#10B981" },
  cost_optimization: { label: "Cost Optimization", color: "#3B82F6" },
  reallocation: { label: "Reallocation", color: "#8B5CF6" },
  pricing_revenue: { label: "Pricing Revenue", color: "#F59E0B" },
  ai_spend_reduced: { label: "AI Spend Reduced", color: "#EF4444" },
};

export default function CapitalImpactPage() {
  const { data, loading } = useCapitalImpact();
  const { data: oppCost } = useOpportunityCost();
  const { toastSuccess } = useToast();
  const [provenanceKey, setProvenanceKey] = useState<string | null>(null);
  const handleProvenanceClick = useCallback((key: string) => setProvenanceKey(key), []);

  if (loading) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Capital Impact" subtitle="Financial effects of capital decisions across the portfolio" />
        <PageShell>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </PageShell>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Capital Impact" subtitle="Financial effects of capital decisions across the portfolio" />
        <PageShell>
          <EmptyState
            icon={DollarSign}
            title="No capital impact data yet"
            description="Approve retirements, reallocations, or pricing policies to see financial impact tracked here."
          />
        </PageShell>
      </div>
    );
  }

  const roiDeltaDirection = data.portfolioRoiDelta >= 0 ? "up" : "down";

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Capital Impact"
        subtitle="Financial effects of capital decisions across the portfolio"
        primaryAction={
          data.recentEvents.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => {
                exportToCSV(
                  data.recentEvents,
                  [
                    { header: "Type", accessor: (e) => EVENT_TYPE_LABELS[e.eventType]?.label ?? e.eventType },
                    { header: "Description", accessor: (e) => e.description },
                    { header: "Amount", accessor: (e) => formatCurrencyCSV(e.amount) },
                    { header: "Date", accessor: (e) => e.effectiveDate },
                  ],
                  `capital-events-${new Date().toISOString().slice(0, 10)}.csv`,
                );
                toastSuccess("Capital events exported to CSV");
              }}
            >
              <Download className="h-3 w-3 mr-1" />
              Export Events
            </Button>
          ) : undefined
        }
      />

      <PageShell>
        <PersonaWelcomeBanner page="/capital-impact" data={{ totalSavings: data.totalCapitalFreed }} />

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard
            label="Capital Freed"
            value={formatCurrency(data.totalCapitalFreed, true)}
            trend={{ value: `${formatCurrency(data.totalCapitalFreedAnnual, true)}/yr`, direction: "up" }}
            info="Monthly budget recovered through retirements, optimizations, and reallocations. Annualized based on current run-rate."
            variant="positive"
            metricKey="capital_freed"
            onProvenanceClick={handleProvenanceClick}
          />
          <KPICard
            label="Budget Reallocated"
            value={formatCurrency(data.budgetReallocated, true)}
            trend={{ value: "moved to high ROI", direction: "up" }}
            info="Spend redirected from low-performing products to higher-value investments within the portfolio."
          />
          <KPICard
            label="AI Spend Reduced"
            value={formatCurrency(data.aiSpendReduced, true)}
            trend={{ value: "from kill switch", direction: "up" }}
            info="AI/ML infrastructure costs reduced through governance actions such as model consolidation or usage controls."
            variant={data.aiSpendReduced > 0 ? "positive" : undefined}
          />
          <KPICard
            label="ROI Delta"
            value={data.portfolioRoiDelta >= 0 ? `+${(data.portfolioRoiDelta * 100).toFixed(1)}%` : `${(data.portfolioRoiDelta * 100).toFixed(1)}%`}
            trend={{
              value: `${formatROI(data.portfolioRoiPrevious)} → ${formatROI(data.portfolioRoiCurrent)}`,
              direction: roiDeltaDirection,
            }}
            info="Change in portfolio-wide return on investment. Cost-weighted across all active products — not a simple average."
            variant={data.portfolioRoiDelta >= 0 ? "positive" : "warning"}
            metricKey="portfolio_average_roi"
            onProvenanceClick={handleProvenanceClick}
          />
          <KPICard
            label="Decisions Executed"
            value={data.decisionsExecuted.toString()}
            trend={{ value: `${data.decisionsUnderReview} under review`, direction: "neutral" }}
            info="Total capital decisions approved and implemented. Each decision has a tracked financial impact."
          />
          <KPICard
            label="Active Pricing"
            value={data.activePricingPolicies.toString()}
            trend={{ value: formatCurrency(data.pricingRevenueTotal, true) + "/mo", direction: "up" }}
            info="Chargeback or internal pricing policies currently active. Revenue shown is monthly internal cost recovery."
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cumulative Capital Freed */}
          <Card>
            <SectionHeader
              title="Cumulative Capital Freed"
              subtitle="Monthly capital freed and running total"
              icon={TrendingUp}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
            />
            {data.capitalFreedByMonth.length > 0 ? (
              <div className="h-[260px]">
                <CumulativeCapitalChart data={data.capitalFreedByMonth} />
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
                No capital events yet. Approve retirements or reallocations to see data here.
              </div>
            )}
          </Card>

          {/* Capital by Type */}
          <Card>
            <SectionHeader
              title="Capital by Type"
              subtitle="Breakdown of capital impact by event type"
              icon={BarChart3}
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
            />
            {data.capitalByType.length > 0 ? (
              <div className="h-[260px]">
                <CapitalByTypeChart
                  data={data.capitalByType.map((item) => ({
                    ...item,
                    label: EVENT_TYPE_LABELS[item.type]?.label ?? item.type,
                  }))}
                  typeColors={Object.fromEntries(
                    Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => [k, v.color])
                  )}
                />
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
                No capital events yet.
              </div>
            )}
          </Card>
        </div>

        {/* Value Gap Waterfall */}
        {oppCost && (
          <Card>
            <SectionHeader
              title="Value Gap Analysis"
              subtitle="Declared vs. inferred value — showing mismatches and undeclared spend"
              icon={Tag}
              iconColor="text-orange-600"
              iconBg="bg-orange-50"
            />
            <div className="h-[260px]">
              <ValueGapWaterfall
                totalDeclared={data.totalCapitalFreed * 10}
                totalInferred={data.totalCapitalFreed * 10 - oppCost.capitalMisallocated}
                mismatchGap={oppCost.capitalMisallocated}
                undeclaredSpend={oppCost.undeclaredSpend}
              />
            </div>
          </Card>
        )}

        {/* 6-Month Savings Projection */}
        <Card>
          <SectionHeader
            title="6-Month Savings Projection"
            subtitle="If current run-rate continues"
            icon={Activity}
            iconColor="text-purple-600"
            iconBg="bg-purple-50"
          />
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-emerald-500">Monthly Run Rate</p>
              <p className="text-xl font-bold text-emerald-700 font-mono mt-1">{formatCurrency(data.totalCapitalFreed, true)}</p>
              <p className="text-[10px] text-emerald-400">/month</p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-blue-500">3-Month Projection</p>
              <p className="text-xl font-bold text-blue-700 font-mono mt-1">{formatCurrency(data.totalCapitalFreed * 3, true)}</p>
              <p className="text-[10px] text-blue-400">cumulative</p>
            </div>
            <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-purple-500">6-Month Projection</p>
              <p className="text-xl font-bold text-purple-700 font-mono mt-1">{formatCurrency(data.totalCapitalFreed * 6, true)}</p>
              <p className="text-[10px] text-purple-400">cumulative</p>
            </div>
          </div>
        </Card>

        {/* Recent Capital Events */}
        <Card>
          <SectionHeader
            title="Recent Capital Events"
            subtitle="Last 10 events across all workflows"
            icon={DollarSign}
            iconColor="text-gray-600"
            iconBg="bg-gray-100"
          />
          {data.recentEvents.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-border">
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-gray-400">Type</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-gray-400">Description</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Amount</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentEvents.map((event) => {
                    const typeInfo = EVENT_TYPE_LABELS[event.eventType];
                    return (
                      <tr key={event.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-2.5">
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: `${typeInfo?.color ?? "#6B7280"}15`,
                              color: typeInfo?.color ?? "#6B7280",
                            }}
                          >
                            {typeInfo?.label ?? event.eventType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-700 max-w-[400px] truncate">{event.description}</td>
                        <td className="px-4 py-2.5 text-xs font-semibold text-emerald-600 text-right font-mono">
                          +{formatCurrency(event.amount, true)}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-400 text-right">{event.effectiveDate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-gray-50 p-8 text-center">
              <DollarSign className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No capital events yet.</p>
              <p className="text-xs text-gray-400 mt-1">
                Approve retirements, reallocations, or pricing policies to see financial impact here.
              </p>
            </div>
          )}
        </Card>
        {/* Narrative Flow → Capital Projection */}
        <NextStepCard
          title="See your 12-month capital projection"
          description="Simulate passive, governance, and active scenarios to understand your portfolio's trajectory."
          href="/capital-projection"
          ctaLabel="Capital Projection"
        />

        {/* Metric Provenance Drawer */}
        <MetricProvenanceDrawer
          open={provenanceKey !== null}
          onOpenChange={(open) => !open && setProvenanceKey(null)}
          provenance={provenanceKey ? getMetricProvenance(provenanceKey) ?? null : null}
          lastComputed={new Date().toISOString()}
        />
      </PageShell>
    </div>
  );
}
