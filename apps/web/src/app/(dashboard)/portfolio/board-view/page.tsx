"use client";

import { useDataProducts, usePortfolioSummary, usePortfolioCostTrend, usePortfolioROIHistory, useDecisions, useExecutiveSummary, useCapitalImpact, useOrgInfo } from "@/lib/api/hooks";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { CardSkeleton } from "@/components/shared/skeleton";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BoardViewHeader,
  ExecutiveSummarySection,
  PortfolioSummarySection,
  ROITrendSection,
  RiskExposureSection,
  RetirementSavingsSection,
  CapitalAllocationTable,
  CapitalImpactSection,
  MethodologyAppendix,
} from "./components";
import {
  computePortfolioMonthlySpend,
  computeDomainAllocation,
  computeRealizedSavings,
} from "@/lib/metrics/canonical";

export default function BoardViewPage() {
  const productsResult = useDataProducts();
  const summaryResult = usePortfolioSummary();
  const costTrendResult = usePortfolioCostTrend();
  const roiHistoryResult = usePortfolioROIHistory();
  const decisionsResult = useDecisions();
  const executiveResult = useExecutiveSummary();
  const capitalResult = useCapitalImpact();
  const orgInfoResult = useOrgInfo();

  if (
    productsResult.loading || summaryResult.loading || costTrendResult.loading ||
    roiHistoryResult.loading || decisionsResult.loading || executiveResult.loading ||
    capitalResult.loading
  ) {
    return (
      <div className="min-h-screen bg-white">
        <PageHeader
          title="Board View"
          breadcrumbs={[{ label: "Portfolio", href: "/portfolio" }, { label: "Board View" }]}
        />
        <PageShell>
          <CardSkeleton lines={10} />
        </PageShell>
      </div>
    );
  }

  const dataProducts = productsResult.data?.items ?? [];
  const portfolioSummary = summaryResult.data;
  const portfolioCostTrend = costTrendResult.data ?? [];
  const portfolioROIHistory = roiHistoryResult.data ?? [];
  const decisions = decisionsResult.data ?? [];
  const executiveSummary = executiveResult.data;
  const capitalImpact = capitalResult.data;

  if (!portfolioSummary || !executiveSummary) {
    return <div className="flex items-center justify-center h-64"><div className="text-sm text-muted-foreground">Failed to load portfolio data.</div></div>;
  }

  // Compute previous ROI from history (3 months back, if available)
  const previousROI = portfolioROIHistory.length >= 4
    ? portfolioROIHistory[portfolioROIHistory.length - 4]?.roi ?? null
    : null;

  const costSpikes = dataProducts.filter((p) => p.hasCostSpike);
  const expiringDeclarations = dataProducts.filter(
    (dp) => dp.valueDeclaration?.isExpiring
  );

  // Allocation by domain (canonical)
  const domainAllocation = computeDomainAllocation(dataProducts);
  const totalCost = computePortfolioMonthlySpend(dataProducts);

  // Decision summary (canonical)
  const approvedDecisions = decisions.filter((d) => d.status === "approved");
  const realizedSavings = computeRealizedSavings(decisions);
  const pendingDecisions = decisions.filter((d) => d.status === "under_review");

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen bg-white">
      {/* Non-printable toolbar */}
      <div data-print-hide>
        <PageHeader
          title="Board View"
          subtitle="Data Capital Portfolio Review"
          breadcrumbs={[{ label: "Portfolio", href: "/portfolio" }, { label: "Board View" }]}
          primaryAction={
            <Button
              size="sm"
              className="text-xs h-8"
              onClick={() => {
                const prev = document.title;
                document.title = `Strata — Data Capital Portfolio Review — ${today}`;
                window.print();
                document.title = prev;
              }}
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print / Export PDF
            </Button>
          }
        />
      </div>

      {/* Printable content */}
      <div className="max-w-[1100px] mx-auto px-8 py-10">
        <BoardViewHeader
          orgName={orgInfoResult.data?.name ?? "Organization"}
          today={today}
          confidenceLevel={executiveSummary.confidenceLevel}
        />

        <ExecutiveSummarySection
          summary={portfolioSummary}
          insights={executiveSummary.insights}
          previousROI={previousROI}
          realizedSavings={realizedSavings}
        />

        <PortfolioSummarySection
          summary={portfolioSummary}
          realizedSavings={realizedSavings}
          approvedCount={approvedDecisions.length}
          topInsight={executiveSummary.insights[0]}
        />

        <ROITrendSection
          costTrend={portfolioCostTrend}
          roiHistory={portfolioROIHistory}
        />

        <RiskExposureSection
          projection={executiveSummary.doNothingProjection}
          expiringDeclarations={expiringDeclarations}
          costSpikes={costSpikes}
          riskInsights={executiveSummary.insights.filter(i => i.type === "risk")}
        />

        <RetirementSavingsSection
          approvedDecisions={approvedDecisions}
          pendingDecisions={pendingDecisions}
          realizedSavings={realizedSavings}
        />

        <CapitalAllocationTable
          domainAllocation={domainAllocation}
          totalCost={totalCost}
          averageROI={portfolioSummary.averageROI}
          opportunityInsights={executiveSummary.insights.filter(i => i.type === "opportunity")}
        />

        <CapitalImpactSection capitalImpact={capitalImpact} />

        <MethodologyAppendix />

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4 flex items-center justify-between text-[10px] text-gray-400">
          <span>Generated by Strata · {today}</span>
          <span>Confidential — For internal use only</span>
        </div>
      </div>
    </div>
  );
}
