"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { typography } from "@/lib/tokens";
import { PageHeader } from "@/components/layout/page-header";
import { CoverageBar } from "@/components/shared/coverage-bar";
import { LifecyclePill } from "@/components/shared/lifecycle-pill";
import { PageShell } from "@/components/shared/page-shell";
import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { ErrorState } from "@/components/shared/error-state";
import { NextStepCard } from "@/components/shared/next-step-card";
import { KPISkeleton, CardSkeleton } from "@/components/shared/skeleton";
import { MetricProvenanceDrawer } from "@/components/shared/metric-provenance-drawer";
import { getMetricProvenance } from "@/lib/metrics/provenance";
import dynamic from "next/dynamic";

const BCGMatrix = dynamic(
  () => import("@/components/charts/bcg-matrix").then(m => ({ default: m.BCGMatrix })),
  { ssr: false, loading: () => <div className="h-[380px] animate-pulse bg-gray-100 rounded-lg" /> }
);
const CostValueTrend = dynamic(
  () => import("@/components/charts/cost-value-trend").then(m => ({ default: m.CostValueTrend })),
  { ssr: false, loading: () => <div className="h-[220px] animate-pulse bg-gray-100 rounded-lg" /> }
);
const CapitalFlowChart = dynamic(
  () => import("@/components/charts/capital-flow-chart").then(m => ({ default: m.CapitalFlowChart })),
  { ssr: false, loading: () => <div className="h-[280px] animate-pulse bg-gray-100 rounded-lg" /> }
);
const ESEDistributionChart = dynamic(
  () => import("@/components/charts/ese-distribution-chart").then(m => ({ default: m.ESEDistributionChart })),
  { ssr: false, loading: () => <div className="h-[220px] animate-pulse bg-gray-100 rounded-lg" /> }
);
import { CapitalHeader } from "@/components/portfolio/capital-header";
import { CapitalActions, CapitalActionCardItem } from "@/components/portfolio/capital-actions";
import { DecisionCockpit } from "@/components/portfolio/decision-cockpit";
import { InactionCost } from "@/components/portfolio/inaction-cost";
import { WelcomeBanner } from "@/components/portfolio/welcome-banner";
import { PersonaWelcomeBanner } from "@/components/shared/persona-welcome-banner";
import { useCapitalModel } from "@/lib/hooks/use-capital-model";
import { useDataProducts, usePortfolioCostTrend, useEconomicSignals } from "@/lib/api/hooks";
import { formatCurrency, formatROI } from "@/lib/format";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  TrendingDown,
  Trophy,
  FileText,
  BookOpen,
  PieChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PortfolioPage() {
  const router = useRouter();
  const [provenanceKey, setProvenanceKey] = useState<string | null>(null);
  const handleProvenanceClick = useCallback((key: string) => setProvenanceKey(key), []);

  const productsResult = useDataProducts();
  const costTrendResult = usePortfolioCostTrend();
  const capitalModel = useCapitalModel();
  const { data: eseData } = useEconomicSignals();

  const isLoading = productsResult.loading || costTrendResult.loading || capitalModel.loading;

  // Skeleton loading state
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="Portfolio"
          subtitle="Capital performance across your data portfolio"
        />
        <PageShell>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <KPISkeleton key={i} />
            ))}
          </div>
          <CardSkeleton lines={6} />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <CardSkeleton className="lg:col-span-3" lines={8} />
            <CardSkeleton className="lg:col-span-2" lines={8} />
          </div>
          <CardSkeleton lines={6} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CardSkeleton lines={5} />
            <CardSkeleton lines={5} />
          </div>
        </PageShell>
      </div>
    );
  }

  const dataProducts = productsResult.data?.items ?? [];
  const portfolioCostTrend = costTrendResult.data ?? [];
  const model = capitalModel.data;

  // Error state
  if (!model) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="Portfolio"
          subtitle="Capital performance across your data portfolio"
        />
        <PageShell>
          <ErrorState
            title="Failed to load portfolio data"
            description="We couldn't load the capital model. This may be a temporary issue."
            onRetry={() => window.location.reload()}
          />
        </PageShell>
      </div>
    );
  }

  const retirementCandidates = dataProducts.filter((p) => p.isRetirementCandidate);
  const topPerformers = dataProducts
    .filter((p) => p.roi !== null && p.roi > 0)
    .sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))
    .slice(0, 5);

  // Products with low value confidence for BCG matrix
  const lowConfidenceIds = dataProducts
    .filter((p) =>
      p.inferredValue
        ? p.inferredValue.confidence < 0.5
        : p.declaredValue === null
    )
    .map((p) => p.id);

  // Promoted actions (top 3) vs. remaining
  const promotedActions = model.capitalActions.slice(0, 3);
  const remainingActions = model.capitalActions.slice(3);
  const promotedTotal = promotedActions.reduce((sum, a) => sum + a.capitalImpactMonthly, 0);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Portfolio"
        subtitle="Capital performance across your data portfolio"
        primaryAction={
          <Link href="/portfolio/board-view">
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5 text-gray-500 hover:text-gray-700">
              <FileText className="h-3.5 w-3.5" />
              Board Mode
            </Button>
          </Link>
        }
        secondaryActions={
          <>
            <Link href="/allocation">
              <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5 text-gray-500 hover:text-gray-700">
                <PieChart className="h-3.5 w-3.5" />
                Capital Allocation
              </Button>
            </Link>
            <Link href="/decisions">
              <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5 text-gray-500 hover:text-gray-700">
                <BookOpen className="h-3.5 w-3.5" />
                Decision Log
              </Button>
            </Link>
          </>
        }
      />

      <PageShell>
        {/* Welcome Banner — persona-specific on first visit */}
        <PersonaWelcomeBanner page="/portfolio" data={{ productCount: dataProducts.length }} />

        {/* Capital Header — hero metrics (spend vs. waste diagnosis) */}
        <CapitalHeader model={model} onProvenanceClick={handleProvenanceClick} />

        {/* Promoted Capital Actions — top 3 in grid */}
        {promotedActions.length > 0 && (
          <div className="space-y-3">
            <p className={cn(typography.metricLabel, "px-1")}>Priority Capital Actions</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {promotedActions.map((action) => (
                <CapitalActionCardItem key={action.id} action={action} />
              ))}
            </div>
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs text-gray-400">
                These actions would recover
              </span>
              <span className="text-sm font-semibold font-mono tabular-nums text-teal-700">
                {formatCurrency(promotedTotal, true)}/mo
              </span>
            </div>
          </div>
        )}

        {/* Remaining Capital Actions — scrollable strip */}
        {remainingActions.length > 0 && (
          <CapitalActions actions={remainingActions} />
        )}

        {/* Decision Cockpit */}
        <DecisionCockpit model={model} />

        {/* Inaction Cost — warning module */}
        <InactionCost model={model} />

        {/* Charts Grid: Capital Flow + BCG Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3">
            <SectionHeader title="Capital Flow" subtitle="Monthly spend, misallocation, and capital freed" />
            <div role="img" aria-label="Chart showing monthly capital flow including spend, misallocation, and capital freed">
              <CapitalFlowChart data={model.capitalFlowData} height={340} />
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Portfolio Matrix</h2>
                <p className="text-xs text-gray-400 mt-0.5">Usage vs. cost — dashed ring = no value declaration</p>
              </div>
              <div className="flex items-center gap-3">
                {(["growth", "mature", "decline", "active"] as const).map((stage) => (
                  <div key={stage} className="flex items-center gap-1">
                    <LifecyclePill stage={stage} size="xs" />
                  </div>
                ))}
              </div>
            </div>
            <div role="img" aria-label="Portfolio matrix scatter plot showing products by usage vs cost, colored by lifecycle stage">
              <BCGMatrix
                products={dataProducts.filter(p => p.lifecycleStage !== "retired")}
                showFinancialLabels
                lowConfidenceIds={lowConfidenceIds}
              />
            </div>
          </Card>
        </div>

        {/* Cost/Value Trend — full width */}
        <Card>
          <SectionHeader title="Cost vs. Value Trend" subtitle="6-month portfolio economics" />
          <CostValueTrend data={portfolioCostTrend} height={280} />
          <div className="flex items-center gap-4 mt-2 px-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Total Cost
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Composite Value
            </div>
          </div>
        </Card>

        {/* ESE Score Distribution */}
        {eseData && eseData.length > 0 && (
          <Card>
            <SectionHeader title="Economic Signal Score Distribution" subtitle="Spread of ESE scores across the active portfolio" />
            <div role="img" aria-label="Bar chart showing the distribution of Economic Signal Scores across the portfolio">
              <ESEDistributionChart scores={eseData.map((e) => e.economicSignalScore)} height={220} />
            </div>
          </Card>
        )}

        {/* Bottom Grid: Retirement + Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <SectionHeader
              title="Retirement Candidates"
              subtitle="Products with declining usage and potential savings"
              icon={TrendingDown}
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
            />
            <div className="space-y-3">
              {retirementCandidates.map((p) => (
                <button
                  key={p.id}
                  onClick={() => router.push(`/assets/${p.id}`)}
                  className="w-full flex items-center justify-between rounded-lg border border-border p-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.monthlyConsumers} consumers (was {p.peakConsumers})</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-sm font-semibold text-amber-600 font-mono">{formatCurrency(p.monthlyCost, true)}</p>
                    <p className="text-[10px] text-gray-400">potential savings</p>
                  </div>
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              onClick={() => router.push("/lifecycle")}
            >
              Review all {retirementCandidates.length} candidates
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Card>

          <Card>
            <SectionHeader
              title="Top Performers by ROI"
              subtitle="Highest return on investment"
              icon={Trophy}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
            />
            <div className="space-y-3">
              {topPerformers.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => router.push(`/assets/${p.id}`)}
                  className="w-full flex items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500 flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(p.monthlyCost, true)} cost · {p.monthlyConsumers} consumers</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 font-mono flex-shrink-0">
                    {formatROI(p.roi)}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Narrative Flow — next step */}
        <NextStepCard
          title="Review your data product lifecycle"
          description="Identify retirement candidates, cost spikes, and stalled drafts across the portfolio."
          href="/lifecycle"
          ctaLabel="Lifecycle Health"
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
