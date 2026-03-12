"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { KPISkeleton, CardSkeleton } from "@/components/shared/skeleton";
import { PageShell } from "@/components/shared/page-shell";
import { NextStepCard } from "@/components/shared/next-step-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataProduct, useProductCostTrend, useProductUsageTrend, useDisplayConfig } from "@/lib/api/hooks";
import {
  AssetHeaderBar,
  AssetKPICards,
  AssetOverviewTab,
  AssetConsumersTab,
  AssetEconomicsTab,
  AssetLifecycleTab,
  AssetProvenanceTab,
  AssetLineageTab,
} from "./components";

export default function AssetProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: product, loading, refetch } = useDataProduct(id);
  const { data: costTrend } = useProductCostTrend(id);
  const { data: usageTrend } = useProductUsageTrend(id);
  const { data: cfg } = useDisplayConfig();

  if (loading) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="..."
          breadcrumbs={[{ label: "Assets", href: "/assets" }, { label: "..." }]}
        />
        <PageShell>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <KPISkeleton key={i} />
            ))}
          </div>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </PageShell>
      </div>
    );
  }

  if (!product) return notFound();

  return (
    <div className="min-h-screen">
      <PageHeader
        title={product.name}
        subtitle={`${product.domain} · ${product.businessUnit}`}
        breadcrumbs={[{ label: "Assets", href: "/assets" }, { label: product.name }]}
      />

      <PageShell>
        {/* Header bar with back button, badges, owner */}
        <AssetHeaderBar product={product} />

        {/* KPI Row + Coverage Bar */}
        <AssetKPICards product={product} cfg={cfg} />

        {/* Tabs: Overview | Consumers | Economics | Lifecycle */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-gray-100/60 p-0.5">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="consumers" className="text-xs">Consumers</TabsTrigger>
            <TabsTrigger value="economics" className="text-xs">Economics</TabsTrigger>
            <TabsTrigger value="lifecycle" className="text-xs">Lifecycle</TabsTrigger>
            <TabsTrigger value="provenance" className="text-xs">Data Sources</TabsTrigger>
            <TabsTrigger value="lineage" className="text-xs">Lineage</TabsTrigger>
          </TabsList>

          <AssetOverviewTab product={product} productId={id} onRefresh={refetch} />
          <AssetConsumersTab product={product} usageTrend={usageTrend} />
          <AssetEconomicsTab product={product} costTrend={costTrend} onValueUpdated={refetch} />
          <AssetLifecycleTab product={product} productId={id} />
          <AssetProvenanceTab productId={id} />
          <AssetLineageTab productId={id} productName={product.name} />
        </Tabs>

        {/* Narrative Flow → Create Decision */}
        <NextStepCard
          title="Take action on what you have found"
          description="Create a capital decision to act on cost optimization, retirement, or value revalidation for this product."
          href="/decisions"
          ctaLabel="Decision Log"
        />
      </PageShell>
    </div>
  );
}
