"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { SkeletonBar, CardSkeleton } from "@/components/shared/skeleton";
import { LifecyclePill } from "@/components/shared/lifecycle-pill";
import { PageShell } from "@/components/shared/page-shell";
import { NextStepCard } from "@/components/shared/next-step-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination, usePagination } from "@/components/shared/pagination";
import { useMarketplaceProducts, useDisplayConfig } from "@/lib/api/hooks";
import { apiPost, canMutate } from "@/lib/api/client";
import { useToast } from "@/components/shared/toast";
import { formatCurrency, formatROI, formatPercent } from "@/lib/format";
import { card } from "@/lib/tokens";
import { Search, CheckCircle2, Users, ShieldCheck, Star, Store, TrendingUp, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LifecycleStage } from "@/lib/types";

type SortOption = "popular" | "roi" | "newest" | "cost";

export default function MarketplacePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<LifecycleStage | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [page, setPage] = useState(1);
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
  const [subscribeLoading, setSubscribeLoading] = useState<string | null>(null);
  const { toastError, toastSuccess } = useToast();

  const { data, loading } = useMarketplaceProducts();
  const { data: cfg } = useDisplayConfig();

  // Initialize subscription state from API response
  useEffect(() => {
    if (data) {
      setSubscribedIds(new Set(data.filter((p) => p.isSubscribed).map((p) => p.id)));
    }
  }, [data]);

  // All hooks MUST be called before any conditional return (React rules of hooks)
  const dataProducts = data ?? [];

  // Compute popularity threshold (top 25% by consumers)
  const popularThreshold = useMemo(() => {
    if (dataProducts.length === 0) return 0;
    const sorted = [...dataProducts].sort((a, b) => b.monthlyConsumers - a.monthlyConsumers);
    return sorted[Math.floor(sorted.length * 0.25)]?.monthlyConsumers ?? 0;
  }, [dataProducts]);

  const published = useMemo(
    () =>
      dataProducts
        .filter((p) => {
          if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.domain.toLowerCase().includes(search.toLowerCase())) return false;
          if (stageFilter !== "all" && p.lifecycleStage !== stageFilter) return false;
          return true;
        })
        .sort((a, b) => {
          switch (sortBy) {
            case "popular": return b.monthlyConsumers - a.monthlyConsumers;
            case "roi": return (b.roi ?? 0) - (a.roi ?? 0);
            case "newest": return b.id.localeCompare(a.id); // proxy for newest
            case "cost": return a.monthlyCost - b.monthlyCost;
          }
        }),
    [dataProducts, search, stageFilter, sortBy],
  );

  const { paginate, totalPages } = usePagination(published, 18);
  const paginatedItems = useMemo(() => paginate(page), [paginate, page]);

  // Reset page when filters change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => setPage(1), [search, stageFilter, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Marketplace" subtitle="Discover and subscribe to data products" />
        <PageShell>
          <SkeletonBar className="h-10 w-full max-w-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </PageShell>
      </div>
    );
  }

  const toggleSubscribe = async (id: string) => {
    if (!canMutate) return;
    setSubscribeLoading(id);
    try {
      const res = await apiPost<{ subscribed: boolean; subscriptionCount: number }>("/marketplace/subscribe", { productId: id });
      setSubscribedIds((prev) => {
        const next = new Set(prev);
        if (res.subscribed) {
          next.add(id);
          toastSuccess("Subscribed to product");
        } else {
          next.delete(id);
          toastSuccess("Unsubscribed from product");
        }
        return next;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update subscription";
      toastError(msg);
    } finally {
      setSubscribeLoading(null);
    }
  };

  const stages: (LifecycleStage | "all")[] = ["all", "active", "growth", "mature", "decline"];

  return (
    <div className="min-h-screen">
      <PageHeader title="Marketplace" subtitle="Discover and subscribe to data products" />

      <PageShell>
        {/* Search + Filters + Sort */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products by name, domain, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-sm"
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
          <div className="h-5 w-px bg-border hidden sm:block" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-xs bg-gray-100 border-0 rounded-md px-2.5 py-1.5 text-gray-600 font-medium cursor-pointer"
          >
            <option value="popular">Most Used</option>
            <option value="roi">Best ROI</option>
            <option value="cost">Lowest Cost</option>
            <option value="newest">Newest</option>
          </select>
          <span className="text-xs text-gray-400 ml-auto">{published.length} products</span>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedItems.map((p) => {
            const isSubscribed = subscribedIds.has(p.id);
            const isPopular = p.monthlyConsumers >= popularThreshold && popularThreshold > 0;
            const isRising = p.lifecycleStage === "growth";
            return (
              <div
                key={p.id}
                className={`${card.interactive} ${card.padding}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => router.push(`/assets/${p.id}`)}
                      className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate block text-left"
                    >
                      {p.name}
                    </button>
                    <p className="text-xs text-gray-400 mt-0.5">{p.domain} · {p.owner?.name ?? "Unassigned"}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {isPopular && (
                      <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 gap-0.5">
                        <Flame className="h-3 w-3" />
                        Popular
                      </Badge>
                    )}
                    {isRising && !isPopular && (
                      <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 gap-0.5">
                        <TrendingUp className="h-3 w-3" />
                        Rising
                      </Badge>
                    )}
                    {p.isCertified && (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 gap-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                        Certified
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400">Cost Range</p>
                    <p className="text-sm font-medium text-gray-900 font-mono">
                      ~{formatCurrency(p.monthlyCost, true)}/mo
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400">ROI</p>
                    <p className={`text-sm font-semibold font-mono ${
                      p.roi === null ? "text-gray-400" : p.roi >= (cfg?.roiBands.high ?? 3) ? "text-emerald-600" : "text-gray-900"
                    }`}>
                      {formatROI(p.roi)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400">Consumers</p>
                    <p className="text-sm text-gray-700">{p.monthlyConsumers} active</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400">Trust</p>
                    <p className={`text-sm font-medium ${
                      p.trustScore >= (cfg?.trustScoreBands.high ?? 0.9) ? "text-emerald-600" : p.trustScore >= (cfg?.trustScoreBands.medium ?? 0.7) ? "text-gray-900" : "text-amber-600"
                    }`}>
                      {formatPercent(p.trustScore)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <LifecyclePill stage={p.lifecycleStage} size="xs" />
                  <Button
                    variant={isSubscribed ? "outline" : "default"}
                    size="sm"
                    className={`text-xs h-8 ${isSubscribed ? "text-gray-500" : ""}`}
                    onClick={() => toggleSubscribe(p.id)}
                    disabled={!canMutate || subscribeLoading === p.id}
                    title={!canMutate ? "API unavailable in offline demo mode" : ""}
                  >
                    {subscribeLoading === p.id ? "..." : isSubscribed ? "Subscribed" : "Subscribe"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {published.length === 0 && (
          <EmptyState
            icon={Store}
            title="No products match your search"
            action={
              <button
                className="text-xs text-blue-600 hover:text-blue-800"
                onClick={() => { setSearch(""); setStageFilter("all"); }}
              >
                Clear filters
              </button>
            }
          />
        )}

        {published.length > 0 && (
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        )}

        {/* Narrative Flow → Product Portfolio */}
        <NextStepCard
          title="View the full portfolio behind these products"
          description="Explore cost, value, and ROI details for every product in the managed portfolio — the data behind what you consume."
          href="/assets"
          ctaLabel="Product Portfolio"
        />
      </PageShell>
    </div>
  );
}
