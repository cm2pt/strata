"use client";

import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { KPISkeleton, CardSkeleton } from "@/components/shared/skeleton";
import { useCapitalProjection } from "@/lib/api/hooks";
import { NextStepCard } from "@/components/shared/next-step-card";
import {
  ProjectionKPICards,
  ScenarioComparisonTable,
  ROIDriftSection,
  LiabilityAccumulationSection,
  AIExposureSection,
  DecisionVelocitySection,
  LiabilitySummaryBanner,
} from "./components";

export default function CapitalProjectionPage() {
  const { data, loading } = useCapitalProjection();

  if (loading || !data) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Capital Projection" subtitle="36-month forward simulation under three governance scenarios" />
        <PageShell>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
          </div>
          <CardSkeleton lines={8} />
          <CardSkeleton lines={8} />
        </PageShell>
      </div>
    );
  }

  const { scenarios, liabilityEstimate, currentSnapshot } = data;
  const p12 = scenarios.passive.months[11];
  const g12 = scenarios.governance.months[11];
  const a12 = scenarios.active.months[11];

  // ROI Drift chart data: merge 3 scenarios
  const roiChartData = scenarios.passive.months.map((pm, i) => ({
    month: pm.month,
    Passive: pm.projectedRoi,
    Governance: scenarios.governance.months[i].projectedRoi,
    Active: scenarios.active.months[i].projectedRoi,
  }));

  // Liability accumulation: split passive liability into 4 components proportionally
  const liabilityChartData = scenarios.passive.months.map((pm, i) => {
    const totalLiability = Math.max(pm.capitalLiability, 1);
    const aiGrowth = pm.aiSpend - scenarios.active.months[i].aiSpend;
    const declineWaste = Math.max(pm.projectedCost - pm.aiSpend - (scenarios.active.months[i].projectedCost - scenarios.active.months[i].aiSpend), 0);
    const missedRetirement = pm.missedCapitalFreed * 0.4;
    const total = Math.max(aiGrowth + declineWaste + missedRetirement, 1);
    const scale = totalLiability / total;

    return {
      month: pm.month,
      "AI Exposure": Math.round(Math.max(aiGrowth * scale, 0)),
      "Decline Waste": Math.round(Math.max(declineWaste * scale * 0.4, 0)),
      "Missed Retirement": Math.round(Math.max(missedRetirement * scale, 0)),
      "Governance Erosion": Math.round(Math.max(totalLiability - aiGrowth * scale - declineWaste * scale * 0.4 - missedRetirement * scale, 0)),
    };
  });

  // AI Exposure chart: AI spend vs governance score under passive
  const aiExposureData = scenarios.passive.months.map((pm) => ({
    month: pm.month,
    "AI Spend": pm.aiSpend,
    "Governance Score": pm.governanceScore,
  }));

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Capital Projection"
        subtitle="36-month forward simulation under three governance scenarios"
      />

      <PageShell>
        <ProjectionKPICards
          currentSnapshot={currentSnapshot}
          liabilityEstimate={liabilityEstimate}
        />

        <ScenarioComparisonTable
          passive12={p12}
          governance12={g12}
          active12={a12}
        />

        <ROIDriftSection data={roiChartData} />

        <LiabilityAccumulationSection data={liabilityChartData} />

        <AIExposureSection data={aiExposureData} />

        <DecisionVelocitySection
          decisionVelocityDays={currentSnapshot.decisionVelocityDays}
          roiDelta12m={a12.projectedRoi - p12.projectedRoi}
          capitalFreedDelta36m={scenarios.active.months[35].capitalFreedCumulative - scenarios.passive.months[35].capitalFreedCumulative}
        />

        <LiabilitySummaryBanner liabilityEstimate={liabilityEstimate} />

        {/* Narrative Flow → Board Report */}
        <NextStepCard
          title="Generate a board report"
          description="Export a polished, institutional-grade capital summary for your board or executive team."
          href="/portfolio/board-view"
          ctaLabel="Board View"
        />
      </PageShell>
    </div>
  );
}
