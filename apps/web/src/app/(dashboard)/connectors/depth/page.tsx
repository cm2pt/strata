"use client";

import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { KPISkeleton, CardSkeleton } from "@/components/shared/skeleton";
import { KPICard } from "@/components/shared/kpi-card";
import { useConnectorDepth, useAutomationSummary } from "@/lib/api/hooks";
import {
  PlatformOverviewCards,
  ExtractionMatrixTable,
  AutomationCoverageChart,
  SyncHistoryPanel,
} from "./components";

export default function ConnectorDepthPage() {
  const { data: overview, loading: overviewLoading } = useConnectorDepth();
  const { data: automation, loading: autoLoading } = useAutomationSummary();

  const isLoading = overviewLoading || autoLoading;

  if (isLoading || !overview || !automation) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="Connector Depth"
          subtitle="Platform extraction capabilities, sync history & automation attribution"
        />
        <PageShell>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <KPISkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
          <CardSkeleton />
          <CardSkeleton />
        </PageShell>
      </div>
    );
  }

  const connectorCount = overview.connectors.length;
  const avgCoverage = connectorCount > 0
    ? Math.round(overview.connectors.reduce((sum, c) => sum + c.coveragePct, 0) / connectorCount * 100)
    : 0;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Connector Depth"
        subtitle="Platform extraction capabilities, sync history & automation attribution"
      />

      <PageShell>
        {/* Hero KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            label="Connectors"
            value={String(connectorCount)}
            info="Total platform connectors configured"
          />
          <KPICard
            label="Avg Capability Coverage"
            value={`${avgCoverage}%`}
            info="Average extraction capability coverage across connectors"
          />
          <KPICard
            label="Fields Tracked"
            value={overview.totalFieldsTracked.toLocaleString()}
            info="Total field-level provenance entries tracked"
          />
          <KPICard
            label="Automation Coverage"
            value={`${Math.round(overview.portfolioAutomationCoverage * 100)}%`}
            variant="positive"
            info="Percentage of fields with fully automated extraction"
          />
        </div>

        {/* Platform Overview Cards */}
        <PlatformOverviewCards connectors={overview.connectors} />

        {/* Automation Coverage Chart */}
        <AutomationCoverageChart summary={automation} />

        {/* Extraction Matrix + Sync History side by side on larger screens */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-7">
          <ExtractionMatrixTable connectors={overview.connectors} />
          <SyncHistoryPanel connectors={overview.connectors} />
        </div>
      </PageShell>
    </div>
  );
}
