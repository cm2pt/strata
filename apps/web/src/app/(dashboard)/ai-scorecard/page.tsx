"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { NextStepCard } from "@/components/shared/next-step-card";
import { PersonaWelcomeBanner } from "@/components/shared/persona-welcome-banner";
import { KPISkeleton, TableSkeleton } from "@/components/shared/skeleton";
import { useAIScorecards, useDisplayConfig } from "@/lib/api/hooks";
import { apiPost } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";
import { PERM } from "@/lib/auth/permissions";
import { useToast } from "@/components/shared/toast";
import type { AIProjectScorecard } from "@/lib/types";
import {
  ScorecardKPICards,
  ScorecardTable,
  RiskProjectCards,
  ScorecardDialogs,
} from "./components";

export default function AIScorecardPage() {
  const { hasPermission } = useAuth();
  const { toastError, toastSuccess } = useToast();
  const canFlag = hasPermission(PERM.AI_FLAG);
  const canKill = hasPermission(PERM.AI_KILL_EXECUTE);

  const { data: scorecards, loading, refetch } = useAIScorecards();
  const { data: cfg } = useDisplayConfig();
  const [flagTarget, setFlagTarget] = useState<AIProjectScorecard | null>(null);
  const [killTarget, setKillTarget] = useState<AIProjectScorecard | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen">
        <PageHeader title="AI Project Scorecard" subtitle="Risk scoring and capital controls for AI investments" />
        <PageShell>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
          </div>
          <TableSkeleton />
        </PageShell>
      </div>
    );
  }

  const items = scorecards ?? [];
  const atRisk = items.filter((s) => s.riskLevel === "high" || s.riskLevel === "critical");
  const potentialSavings = atRisk.reduce((s, sc) => s + sc.monthlyCost, 0);
  const avgComposite = items.length > 0 ? items.reduce((s, sc) => s + sc.compositeScore, 0) / items.length : 0;

  const scoreBands = {
    low: cfg?.aiRiskScoreBands.low ?? 70,
    medium: cfg?.aiRiskScoreBands.medium ?? 50,
    high: cfg?.aiRiskScoreBands.high ?? 30,
  };

  const handleFlag = async () => {
    if (!flagTarget) return;
    setActionLoading(true);
    try {
      await apiPost(`/ai-scorecard/${flagTarget.productId}/flag`, {});
      refetch();
      toastSuccess(`${flagTarget.productName} flagged for review`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to flag project";
      toastError(msg);
    } finally {
      setActionLoading(false);
      setFlagTarget(null);
    }
  };

  const handleKill = async () => {
    if (!killTarget) return;
    setActionLoading(true);
    try {
      await apiPost(`/ai-scorecard/${killTarget.productId}/kill`, {});
      refetch();
      toastSuccess(`${killTarget.productName} retired successfully`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to kill project";
      toastError(msg);
    } finally {
      setActionLoading(false);
      setKillTarget(null);
    }
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="AI Project Scorecard"
        subtitle="Risk scoring and capital controls for AI investments"
      />

      <PageShell>
        <PersonaWelcomeBanner
          page="/ai-scorecard"
          data={{
            aiProjectsFlagged: atRisk.length,
            aiCriticalCount: items.filter((s) => s.riskLevel === "critical").length,
          }}
        />

        <ScorecardKPICards
          totalItems={items.length}
          atRiskCount={atRisk.length}
          potentialSavings={potentialSavings}
          avgComposite={avgComposite}
        />

        <ScorecardTable
          items={items}
          scoreBands={scoreBands}
          canFlag={canFlag}
          canKill={canKill}
          actionLoading={actionLoading}
          onFlag={setFlagTarget}
          onKill={setKillTarget}
        />

        <RiskProjectCards
          atRisk={atRisk}
          canFlag={canFlag}
          canKill={canKill}
          actionLoading={actionLoading}
          onFlag={setFlagTarget}
          onKill={setKillTarget}
        />

        {/* Narrative Flow → Decision Log */}
        <NextStepCard
          title="Create governance decisions for flagged AI projects"
          description="Route flagged projects through the capital decision workflow for formal review, approval, or termination."
          href="/decisions"
          ctaLabel="Decision Log"
        />
      </PageShell>

      <ScorecardDialogs
        flagTarget={flagTarget}
        killTarget={killTarget}
        actionLoading={actionLoading}
        onFlagClose={() => setFlagTarget(null)}
        onKillClose={() => setKillTarget(null)}
        onFlag={handleFlag}
        onKill={handleKill}
      />
    </div>
  );
}
