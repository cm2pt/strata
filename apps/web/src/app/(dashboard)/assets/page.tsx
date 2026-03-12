"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { LifecyclePill } from "@/components/shared/lifecycle-pill";
import { PageShell } from "@/components/shared/page-shell";
import { NextStepCard } from "@/components/shared/next-step-card";
import { PersonaWelcomeBanner } from "@/components/shared/persona-welcome-banner";
import { SkeletonBar, TableSkeleton } from "@/components/shared/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination, usePagination } from "@/components/shared/pagination";
import { Database as DatabaseIcon } from "lucide-react";
import { useDataProducts, useDisplayConfig, useEconomicSignals } from "@/lib/api/hooks";
import { formatCurrency, formatROI, formatPercent, formatPlatform } from "@/lib/format";
import { exportToCSV, formatCurrencyCSV, formatPercentCSV } from "@/lib/utils/csv-export";
import { card } from "@/lib/tokens";
import { Search, SlidersHorizontal, ArrowUpDown, TrendingUp, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/shared/toast";
import type { LifecycleStage } from "@/lib/types";

export default function AssetsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<LifecycleStage | "all">("all");
  const [sortBy, setSortBy] = useState<"cost" | "roi" | "consumers" | "name" | "ese">("cost");
  const [page, setPage] = useState(1);
  const { toastSuccess } = useToast();

  const productsResult = useDataProducts();
  const { data: cfg } = useDisplayConfig();
  const { data: eseData } = useEconomicSignals();

  // All hooks MUST be called before any conditional return (React rules of hooks)
  const dataProducts = productsResult.data?.items ?? [];
  const eseMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of eseData ?? []) m.set(e.productId, e.economicSignalScore);
    return m;
  }, [eseData]);

  const filtered = useMemo(
    () =>
      dataProducts
        .filter((p) => {
          if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.domain.toLowerCase().includes(search.toLowerCase())) return false;
          if (stageFilter !== "all" && p.lifecycleStage !== stageFilter) return false;
          return true;
        })
        .sort((a, b) => {
          switch (sortBy) {
            case "cost": return b.monthlyCost - a.monthlyCost;
            case "roi": return (b.roi ?? 0) - (a.roi ?? 0);
            case "consumers": return b.monthlyConsumers - a.monthlyConsumers;
            case "ese": return (eseMap.get(b.id) ?? 0) - (eseMap.get(a.id) ?? 0);
            case "name": return a.name.localeCompare(b.name);
          }
        }),
    [dataProducts, search, stageFilter, sortBy, eseMap],
  );

  const { paginate, totalPages } = usePagination(filtered, 20);
  const paginatedItems = useMemo(() => paginate(page), [paginate, page]);

  // Reset page when filters change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => setPage(1), [search, stageFilter, sortBy]);

  if (productsResult.loading) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Assets" subtitle="All registered data products" />
        <PageShell className="space-y-4">
          <SkeletonBar className="h-9 w-full max-w-md" />
          <TableSkeleton rows={8} columns={10} />
        </PageShell>
      </div>
    );
  }

  const stages: (LifecycleStage | "all")[] = ["all", "draft", "active", "growth", "mature", "decline", "retired"];

  return (
    <div className="min-h-screen">
      <PageHeader title="Assets" subtitle="All registered data products" />

      <PageShell className="space-y-4">
        <PersonaWelcomeBanner page="/assets" data={{ productCount: dataProducts.length }} />

        {/* Search + Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {stages.map((stage) => (
              <button
                key={stage}
                onClick={() => setStageFilter(stage)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  stageFilter === stage
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {stage === "all" ? "All" : stage.charAt(0).toUpperCase() + stage.slice(1)}
              </button>
            ))}
          </div>
          <div className="h-5 w-px bg-border" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-xs bg-gray-100 border-0 rounded-md px-2.5 py-1.5 text-gray-600 font-medium cursor-pointer"
          >
            <option value="cost">Sort: Cost ↓</option>
            <option value="roi">Sort: ROI ↓</option>
            <option value="consumers">Sort: Consumers ↓</option>
            <option value="ese">Sort: ESE Score ↓</option>
            <option value="name">Sort: Name A→Z</option>
          </select>
          <div className="h-5 w-px bg-border" />
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8"
            onClick={() => {
              exportToCSV(
                filtered,
                [
                  { header: "Product", accessor: (p) => p.name },
                  { header: "Domain", accessor: (p) => p.domain },
                  { header: "Owner", accessor: (p) => p.owner?.name ?? "Unassigned" },
                  { header: "Stage", accessor: (p) => p.lifecycleStage },
                  { header: "Monthly Cost", accessor: (p) => formatCurrencyCSV(p.monthlyCost) },
                  { header: "Declared Value", accessor: (p) => p.declaredValue ? formatCurrencyCSV(p.declaredValue) : "" },
                  { header: "Composite Value", accessor: (p) => p.compositeValue > 0 ? formatCurrencyCSV(p.compositeValue) : "" },
                  { header: "ROI", accessor: (p) => p.roi !== null ? p.roi.toFixed(2) : "" },
                  { header: "ESE Score", accessor: (p) => { const ese = eseMap.get(p.id); return ese != null ? Math.round(ese).toString() : ""; } },
                  { header: "Consumers", accessor: (p) => p.monthlyConsumers.toString() },
                  { header: "Coverage", accessor: (p) => formatPercentCSV(p.costCoverage) },
                  { header: "Platform", accessor: (p) => p.platform },
                ],
                `data-products-${new Date().toISOString().slice(0, 10)}.csv`,
              );
              toastSuccess("Products exported to CSV");
            }}
          >
            <Download className="h-3 w-3 mr-1" />
            Export CSV
          </Button>
        </div>

        {/* Table */}
        <div className={`${card.base} overflow-hidden`}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50/60">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-gray-400">Product</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-gray-400">Stage</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Monthly Cost</th>
                <th className="hidden lg:table-cell px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Declared Value</th>
                <th className="hidden lg:table-cell px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Composite Value</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">ROI</th>
                <th className="hidden md:table-cell px-4 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-gray-400">ESE Score</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Consumers</th>
                <th className="hidden lg:table-cell px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-gray-400">Coverage</th>
                <th className="hidden md:table-cell px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-gray-400">Platform</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/assets/${p.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter") router.push(`/assets/${p.id}`); }}
                  tabIndex={0}
                  role="link"
                  className="border-b border-border last:border-0 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.domain} · {p.owner?.name ?? "Unassigned"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <LifecyclePill stage={p.lifecycleStage} size="xs" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-gray-900 font-mono inline-flex items-center gap-1">
                      {formatCurrency(p.monthlyCost, true)}
                      {p.hasCostSpike && <span title="Cost spike detected"><TrendingUp className="h-3 w-3 text-red-500" /></span>}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3 text-right">
                    <span className={`text-sm font-mono ${p.declaredValue ? "text-gray-900" : "text-gray-400"}`}>
                      {p.declaredValue ? formatCurrency(p.declaredValue, true) : "—"}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3 text-right">
                    <span className={`text-sm font-mono ${p.compositeValue > 0 ? "text-gray-900" : "text-gray-400"}`}>
                      {p.compositeValue > 0 ? formatCurrency(p.compositeValue, true) : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`text-sm font-semibold font-mono ${
                        p.roi === null
                          ? "text-gray-400"
                          : p.roi >= (cfg?.roiBands.high ?? 3)
                            ? "text-emerald-600"
                            : p.roi >= (cfg?.roiBands.healthy ?? 1)
                              ? "text-gray-900"
                              : "text-red-600"
                      }`}
                    >
                      {formatROI(p.roi)}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-center">
                    {(() => {
                      const ese = eseMap.get(p.id);
                      if (ese == null) return <span className="text-xs text-gray-400">—</span>;
                      const color = ese >= 70 ? "text-emerald-600 bg-emerald-50" : ese >= 40 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";
                      return <span className={`inline-block text-xs font-semibold font-mono px-1.5 py-0.5 rounded ${color}`}>{Math.round(ese)}</span>;
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-gray-700 font-mono">{p.monthlyConsumers}</span>
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3 text-right">
                    <span className={`text-xs font-mono ${p.costCoverage >= 0.9 ? "text-emerald-600" : p.costCoverage >= 0.7 ? "text-amber-600" : "text-red-600"}`}>
                      {formatPercent(p.costCoverage)}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-4 py-3">
                    <Badge variant="outline" className="text-[10px]">{formatPlatform(p.platform)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-6 px-4">
              <EmptyState
                icon={DatabaseIcon}
                title="No products match your filters"
                description="Try adjusting your search or filter criteria."
                action={
                  <button
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    onClick={() => { setSearch(""); setStageFilter("all"); }}
                  >
                    Clear filters
                  </button>
                }
              />
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, filtered.length)} of {filtered.length} products
            </p>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}

        {/* Narrative Flow → Lifecycle Health */}
        <NextStepCard
          title="Monitor cost trends and retirement signals"
          description="Review lifecycle health across your products — identify cost spikes, usage declines, and retirement candidates."
          href="/lifecycle"
          ctaLabel="Lifecycle Health"
        />
      </PageShell>
    </div>
  );
}
