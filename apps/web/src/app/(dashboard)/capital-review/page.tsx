"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { NextStepCard } from "@/components/shared/next-step-card";
import { KPISkeleton, CardSkeleton } from "@/components/shared/skeleton";
import { MetricProvenanceDrawer } from "@/components/shared/metric-provenance-drawer";
import {
  useCapitalEfficiency,
  useCapitalBehavior,
  usePortfolioRebalance,
  useBoardCapitalSummary,
  useSavingsSummary,
} from "@/lib/api/hooks";
import { getMetricProvenance } from "@/lib/metrics/provenance";
import {
  CapitalOverviewKPIs,
  CapitalEfficiencySection,
  DecisionPerformanceSection,
  PortfolioRebalanceSection,
  GovernanceBehaviorSection,
} from "./components";

export default function CapitalReviewPage() {
  const { data: board, loading: boardLoading } = useBoardCapitalSummary();
  const { data: cei, loading: ceiLoading } = useCapitalEfficiency();
  const { data: savings } = useSavingsSummary();
  const { data: rebalance } = usePortfolioRebalance();
  const { data: behavior } = useCapitalBehavior();
  const [provenanceKey, setProvenanceKey] = useState<string | null>(null);
  const handleProvenanceClick = useCallback((key: string) => setProvenanceKey(key), []);

  const loading = boardLoading || ceiLoading;

  if (loading) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Capital Performance Review" subtitle="Capital efficiency, governance, and decision performance" />
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
          <CardSkeleton />
        </PageShell>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Capital Performance Review"
        subtitle="Capital efficiency, governance, and decision performance"
      />

      <PageShell>
        {/* Section 1: Capital Overview */}
        <CapitalOverviewKPIs board={board} cei={cei} onProvenanceClick={handleProvenanceClick} />

        {/* Section 2: Capital Efficiency Index */}
        <CapitalEfficiencySection cei={cei} />

        {/* Section 3: Decision Performance */}
        <DecisionPerformanceSection board={board} savings={savings} />

        {/* Section 4: Portfolio Rebalance */}
        <PortfolioRebalanceSection rebalance={rebalance} />

        {/* Section 5: Governance Behavior */}
        <GovernanceBehaviorSection behavior={behavior} />

        {/* Metric Provenance Drawer */}
        <MetricProvenanceDrawer
          open={provenanceKey !== null}
          onOpenChange={(open) => !open && setProvenanceKey(null)}
          provenance={provenanceKey ? getMetricProvenance(provenanceKey) ?? null : null}
          lastComputed={new Date().toISOString()}
        />

        {/* Narrative Flow → Board View */}
        <NextStepCard
          title="Export governance maturity as a board report"
          description="Generate a polished, institutional-grade capital summary with CEI scores, savings, and portfolio health for your board."
          href="/portfolio/board-view"
          ctaLabel="Board View"
        />
      </PageShell>
    </div>
  );
}
