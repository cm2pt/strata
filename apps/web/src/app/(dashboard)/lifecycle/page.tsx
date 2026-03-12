"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { CardSkeleton } from "@/components/shared/skeleton";
import { useLifecycleOverview } from "@/lib/api/hooks";
import { apiPost } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";
import { PERM } from "@/lib/auth/permissions";
import { useToast } from "@/components/shared/toast";
import { formatCurrency } from "@/lib/format";
import type { LifecycleStage } from "@/lib/types";
import { computeEstimatedSavings, computeStageAllocation } from "@/lib/metrics/canonical";
import { NextStepCard } from "@/components/shared/next-step-card";
import { PersonaWelcomeBanner } from "@/components/shared/persona-welcome-banner";
import {
  StageDistribution,
  RetirementCandidates,
  CostSpikes,
  StalledDrafts,
  LifecycleTransitions,
  InvestigateDialog,
  RetirementDialog,
} from "./components";

const stageOrder: LifecycleStage[] = ["draft", "active", "growth", "mature", "decline", "retired"];

export default function LifecyclePage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { toastError, toastSuccess } = useToast();
  const canCreateDecision = hasPermission(PERM.DECISIONS_CREATE);

  const [showRetirementDialog, setShowRetirementDialog] = useState(false);
  const [showInvestigateDialog, setShowInvestigateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [investigateSubmitted, setInvestigateSubmitted] = useState(false);

  const { data, loading } = useLifecycleOverview();

  // All hooks MUST be called before any conditional return (React rules of hooks)
  const dataProducts = data?.dataProducts ?? [];
  const lifecycleTransitions = data?.lifecycleTransitions ?? [];

  const { retirementCandidates, costSpikes, stalledDrafts, stageDistribution, maxCount, totalRetirementSavings } =
    useMemo(() => {
      const retirement = dataProducts.filter((p) => p.isRetirementCandidate);
      const spikes = dataProducts.filter((p) => p.hasCostSpike);
      const stalled = dataProducts.filter(
        (p) => p.lifecycleStage === "draft" && p.monthlyConsumers === 0
      );

      // Use canonical stage allocation, then map to expected shape
      const stageMap = new Map(
        computeStageAllocation(dataProducts).map((s) => [s.stage, s]),
      );
      const distribution = stageOrder.map((stage) => ({
        stage,
        count: stageMap.get(stage)?.count ?? 0,
        totalCost: stageMap.get(stage)?.cost ?? 0,
      }));

      return {
        retirementCandidates: retirement,
        costSpikes: spikes,
        stalledDrafts: stalled,
        stageDistribution: distribution,
        maxCount: Math.max(...distribution.map((s) => s.count), 1),
        totalRetirementSavings: computeEstimatedSavings(dataProducts),
      };
    }, [dataProducts]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Lifecycle Health" subtitle="Monitor product health, detect retirement candidates, and trigger capital decisions" />
        <PageShell>
          <CardSkeleton lines={6} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <CardSkeleton lines={5} />
            <CardSkeleton lines={5} />
            <CardSkeleton lines={5} />
          </div>
          <CardSkeleton lines={4} />
        </PageShell>
      </div>
    );
  }

  async function handleStartRetirementReview() {
    setSubmitting(true);
    try {
      for (const product of retirementCandidates) {
        await apiPost("/decisions/", {
          type: "retirement",
          productId: product.id,
          title: `Retire ${product.name}`,
          description: `${product.name} is a retirement candidate: ${product.monthlyConsumers} consumers (peak: ${product.peakConsumers}), costing ${formatCurrency(product.monthlyCost, true)}/mo. Usage has declined below 20% of peak for 90+ days.`,
          assignedTo: product.owner?.name ?? "Unassigned",
          assignedToTitle: product.owner?.title ?? "",
          estimatedImpact: product.monthlyCost,
          impactBasis: "Monthly cost freed upon retirement",
          projectedSavingsMonthly: product.monthlyCost,
        });
      }
      setSubmitted(true);
      toastSuccess(`${retirementCandidates.length} retirement reviews created`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create retirement decisions";
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleInvestigateCostSpikes() {
    setSubmitting(true);
    try {
      for (const product of costSpikes) {
        await apiPost("/decisions/", {
          type: "cost_investigation",
          productId: product.id,
          title: `Investigate cost spike: ${product.name}`,
          description: `${product.name} has a ${product.costTrend}% MoM cost increase (now ${formatCurrency(product.monthlyCost, true)}/mo). Investigate cause and recommend action.`,
          assignedTo: product.owner?.name ?? "Unassigned",
          assignedToTitle: product.owner?.title ?? "",
          estimatedImpact: Math.round(product.monthlyCost * (product.costTrend / 100)),
          impactBasis: "Estimated cost reduction if spike resolved",
          projectedSavingsMonthly: Math.round(product.monthlyCost * (product.costTrend / 100)),
        });
      }
      setInvestigateSubmitted(true);
      toastSuccess(`${costSpikes.length} cost investigations created`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create cost investigation decisions";
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleNotifyOwners() {
    router.push("/setup");
    toastSuccess("Owner notifications require email integration. Configure in Setup.");
  }

  return (
    <div className="min-h-screen">
      <PageHeader title="Lifecycle Health" subtitle="Monitor product health, detect retirement candidates, and trigger capital decisions" />

      <PageShell>
        <PersonaWelcomeBanner page="/lifecycle" />

        {/* Stage Distribution */}
        <StageDistribution stageDistribution={stageDistribution} maxCount={maxCount} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Retirement Candidates */}
          <RetirementCandidates
            candidates={retirementCandidates}
            totalSavings={totalRetirementSavings}
            canCreateDecision={canCreateDecision}
            submitted={submitted}
            onStartRetirementReview={() => setShowRetirementDialog(true)}
          />

          {/* Cost Spikes */}
          <CostSpikes
            costSpikes={costSpikes}
            investigateSubmitted={investigateSubmitted}
            onInvestigate={() => setShowInvestigateDialog(true)}
          />

          {/* Stalled Drafts */}
          <StalledDrafts
            stalledDrafts={stalledDrafts}
            onNotifyOwners={handleNotifyOwners}
          />
        </div>

        {/* Lifecycle Transitions */}
        <LifecycleTransitions transitions={lifecycleTransitions} />

        {/* Cost Investigation Confirmation Dialog */}
        <InvestigateDialog
          open={showInvestigateDialog}
          onOpenChange={setShowInvestigateDialog}
          costSpikes={costSpikes}
          submitting={submitting}
          onInvestigate={handleInvestigateCostSpikes}
        />

        {/* Retirement Review Confirmation Dialog */}
        <RetirementDialog
          open={showRetirementDialog}
          onOpenChange={setShowRetirementDialog}
          candidates={retirementCandidates}
          totalSavings={totalRetirementSavings}
          submitting={submitting}
          onStartReview={handleStartRetirementReview}
        />

        {/* Narrative Flow → Decisions */}
        <NextStepCard
          title={retirementCandidates.length > 0
            ? `${retirementCandidates.length} product${retirementCandidates.length > 1 ? "s" : ""} need retirement decisions`
            : "Review your capital decisions"
          }
          description={retirementCandidates.length > 0
            ? "Review retirement candidates and create capital decisions to recover misallocated spend."
            : "Track pending approvals, rejections, and the financial impact of governance actions."
          }
          href="/decisions"
          ctaLabel="Decision Log"
        />
      </PageShell>
    </div>
  );
}
