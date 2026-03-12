"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { NextStepCard } from "@/components/shared/next-step-card";
import { PersonaWelcomeBanner } from "@/components/shared/persona-welcome-banner";
import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { KPISkeleton, CardSkeleton } from "@/components/shared/skeleton";
import { useAllocationSummary, usePortfolioSummary, useEconomicSignals, usePortfolioFrontier } from "@/lib/api/hooks";
import dynamic from "next/dynamic";

const FrontierScatterChart = dynamic(
  () => import("@/components/charts/frontier-scatter-chart").then(m => ({ default: m.FrontierScatterChart })),
  { ssr: false, loading: () => <div className="h-[340px] animate-pulse bg-gray-100 rounded-lg" /> }
);
const DomainHeatmap = dynamic(
  () => import("@/components/charts/domain-heatmap").then(m => ({ default: m.DomainHeatmap })),
  { ssr: false, loading: () => <div className="h-[200px] animate-pulse bg-gray-100 rounded-lg" /> }
);
import { useToast } from "@/components/shared/toast";
import { useAuth } from "@/lib/auth/context";
import { PERM } from "@/lib/auth/permissions";
import {
  AllocationKPIs,
  DomainDistributionCharts,
  ROIByDomainChart,
  ReallocationSimulator,
  IndustryBenchmarks,
  ApproveReallocationDialog,
} from "./components";
import type { DomainData } from "./components";
import {
  computePortfolioMonthlySpend,
  computeDomainAllocation,
  computeDeclineStageSpend,
  computeUndeclaredSpend,
} from "@/lib/metrics/canonical";

const DOMAIN_COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#14B8A6", "#6B7280"];

export default function AllocationPage() {
  const { hasPermission } = useAuth();
  const { toastError, toastSuccess } = useToast();
  const canApprove = hasPermission(PERM.DECISIONS_APPROVE);

  const [showReallocation, setShowReallocation] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveSuccess, setApproveSuccess] = useState(false);

  const { data, loading } = useAllocationSummary();
  const { data: portfolioSummary } = usePortfolioSummary();
  const { data: eseData } = useEconomicSignals();
  const { data: frontierData } = usePortfolioFrontier();

  const dataProducts = data?.dataProducts ?? [];
  const benchmarkData = data?.benchmarkData ?? [];

  // Aggregate by domain (canonical)
  const byDomain: DomainData[] = useMemo(
    () => computeDomainAllocation(dataProducts),
    [dataProducts],
  );

  if (loading) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Capital Allocation" subtitle="How data investment is distributed and where to reallocate" />
        <PageShell>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

  const totalCost = computePortfolioMonthlySpend(dataProducts);
  const totalValue = dataProducts.reduce((s, p) => s + p.compositeValue, 0);

  // Decline stage spend (canonical)
  const declineSpend = computeDeclineStageSpend(dataProducts);
  const declinePct = totalCost > 0 ? declineSpend / totalCost : 0;

  // No-value spend (canonical)
  const noValueSpend = computeUndeclaredSpend(dataProducts);
  const noValuePct = totalCost > 0 ? noValueSpend / totalCost : 0;

  // Reallocation simulation
  const sortedByROI = [...dataProducts].filter(p => p.roi !== null).sort((a, b) => (a.roi ?? 0) - (b.roi ?? 0));
  const bottomQuartile = sortedByROI.slice(0, Math.ceil(sortedByROI.length / 4));
  const topQuartile = sortedByROI.slice(-Math.ceil(sortedByROI.length / 4));
  const bottomCost = bottomQuartile.reduce((s, p) => s + p.monthlyCost, 0);
  const reallocationAmount = Math.round(bottomCost * 0.10);
  const currentPortfolioROI = totalValue / totalCost;
  // Simulated: removing low-ROI spend and adding to high-ROI
  const avgTopROI = topQuartile.reduce((s, p) => s + (p.roi ?? 0), 0) / topQuartile.length;
  const projectedValueGain = reallocationAmount * avgTopROI;
  const projectedROI = (totalValue + projectedValueGain) / totalCost;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Capital Allocation"
        subtitle="How data investment is distributed and where to reallocate"
      />

      <PageShell>
        <PersonaWelcomeBanner page="/allocation" data={{ portfolioCost: totalCost }} />

        {/* KPIs */}
        <AllocationKPIs
          totalCost={totalCost}
          totalValue={totalValue}
          domainCount={byDomain.length}
          currentPortfolioROI={currentPortfolioROI}
          declineSpend={declineSpend}
          declinePct={declinePct}
          noValueSpend={noValueSpend}
          noValuePct={noValuePct}
        />

        {/* Two-column: Cost by Domain + Value by Domain */}
        <DomainDistributionCharts
          byDomain={byDomain}
          totalCost={totalCost}
          totalValue={totalValue}
          domainColors={DOMAIN_COLORS}
        />

        {/* ROI by Domain */}
        <ROIByDomainChart byDomain={byDomain} />

        {/* Frontier Scatter + Domain Heatmap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {frontierData && (
            <Card>
              <SectionHeader title="Efficiency Frontier" subtitle="Cost vs. ESE score — green = Pareto-optimal products" />
              <FrontierScatterChart
                data={frontierData.points.map((p) => ({
                  productId: p.productId,
                  name: p.productName,
                  monthlyCost: p.monthlyCost,
                  eseScore: p.economicSignalScore,
                  isFrontier: p.isOnFrontier,
                }))}
              />
            </Card>
          )}

          {eseData && eseData.length > 0 && (
            <Card>
              <SectionHeader title="Domain Efficiency" subtitle="ESE, ROI, and cost trend by domain" />
              <DomainHeatmap
                data={byDomain.map((d) => {
                  const domainProducts = dataProducts.filter((p) => p.domain === d.name);
                  const domainESE = eseData.filter((e) => domainProducts.some((p) => p.id === e.productId));
                  const avgESE = domainESE.length > 0 ? domainESE.reduce((s, e) => s + e.economicSignalScore, 0) / domainESE.length : 0;
                  const avgCostTrend = domainProducts.length > 0 ? domainProducts.reduce((s, p) => s + p.costTrend, 0) / domainProducts.length : 0;
                  return { name: d.name, eseScore: avgESE, roi: d.roi, costTrend: avgCostTrend, count: d.count, cost: d.cost };
                })}
              />
            </Card>
          )}
        </div>

        {/* Reallocation Simulator */}
        <ReallocationSimulator
          showReallocation={showReallocation}
          onToggleReallocation={() => setShowReallocation(!showReallocation)}
          reallocationAmount={reallocationAmount}
          bottomCost={bottomCost}
          currentPortfolioROI={currentPortfolioROI}
          projectedROI={projectedROI}
          avgTopROI={avgTopROI}
          bottomQuartile={bottomQuartile}
          topQuartile={topQuartile}
          canApprove={canApprove}
          approveSuccess={approveSuccess}
          onShowApproveDialog={() => setShowApproveDialog(true)}
        />

        {/* Industry Benchmarks */}
        <IndustryBenchmarks
          benchmarkData={benchmarkData}
          yourROI={portfolioSummary?.averageROI ?? 0}
          currentPortfolioROI={currentPortfolioROI}
        />

        {/* Narrative Flow → Pricing Simulator */}
        <NextStepCard
          title="Model pricing scenarios to optimize allocation"
          description="Simulate usage-based, tiered, or flat-rate pricing models to recover costs and drive internal accountability."
          href="/simulate"
          ctaLabel="Pricing Simulator"
        />
      </PageShell>

      {/* Approve Reallocation Dialog */}
      <ApproveReallocationDialog
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
        reallocationAmount={reallocationAmount}
        currentPortfolioROI={currentPortfolioROI}
        projectedROI={projectedROI}
        bottomQuartile={bottomQuartile}
        topQuartile={topQuartile}
        approveLoading={approveLoading}
        setApproveLoading={setApproveLoading}
        setApproveSuccess={setApproveSuccess}
        toastSuccess={toastSuccess}
        toastError={toastError}
      />
    </div>
  );
}
