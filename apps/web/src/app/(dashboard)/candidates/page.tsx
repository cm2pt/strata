"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { NextStepCard } from "@/components/shared/next-step-card";
import { KPISkeleton, TableSkeleton } from "@/components/shared/skeleton";
import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { KPICard } from "@/components/shared/kpi-card";
import { useCandidates, useDisplayConfig } from "@/lib/api/hooks";
import { apiPost, canMutate } from "@/lib/api/client";
import { useToast } from "@/components/shared/toast";
import type { CandidateListItem, CandidateType, CandidateStatusType } from "@/lib/types";
import {
  Inbox,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Database,
  BarChart3,
  ShieldCheck,
  Users,
  Layers,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TYPE_CONFIG: Record<CandidateType, { label: string; icon: typeof Database; color: string; bg: string }> = {
  semantic_product: { label: "Semantic Product", icon: BarChart3, color: "text-blue-700", bg: "bg-blue-50" },
  dbt_product: { label: "dbt Product", icon: Layers, color: "text-purple-700", bg: "bg-purple-50" },
  usage_bundle: { label: "Usage Bundle", icon: Users, color: "text-amber-700", bg: "bg-amber-50" },
  certified_asset: { label: "Certified Asset", icon: ShieldCheck, color: "text-emerald-700", bg: "bg-emerald-50" },
};

const STATUS_CONFIG: Record<CandidateStatusType, { label: string; color: string; bg: string }> = {
  new: { label: "New", color: "text-blue-700", bg: "bg-blue-50" },
  under_review: { label: "Under Review", color: "text-amber-700", bg: "bg-amber-50" },
  promoted: { label: "Promoted", color: "text-emerald-700", bg: "bg-emerald-50" },
  ignored: { label: "Ignored", color: "text-gray-500", bg: "bg-gray-100" },
};

function ConfidenceBadge({ score, bands }: { score: number; bands?: { green: number; blue: number; amber: number } }) {
  const green = bands?.green ?? 80;
  const blue = bands?.blue ?? 60;
  const amber = bands?.amber ?? 40;
  const color = score >= green ? "text-emerald-700 bg-emerald-50" :
                score >= blue ? "text-blue-700 bg-blue-50" :
                score >= amber ? "text-amber-700 bg-amber-50" :
                "text-red-700 bg-red-50";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      <Sparkles className="h-3 w-3" />
      {score}%
    </span>
  );
}

export default function CandidatesPage() {
  const { data: candidates, loading, refetch } = useCandidates();
  const { data: cfg } = useDisplayConfig();
  const { toastError, toastSuccess } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ingestLoading, setIngestLoading] = useState(false);

  const handleIngest = async () => {
    if (!canMutate) return;
    setIngestLoading(true);
    try {
      await apiPost("/candidates/ingest", {});
      refetch();
      toastSuccess("Discovery pipeline completed");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Discovery ingestion failed";
      toastError(msg);
    } finally {
      setIngestLoading(false);
    }
  };

  // All hooks MUST be called before any conditional return (React rules of hooks)
  const items = candidates ?? [];

  const filtered = useMemo(
    () => (statusFilter === "all" ? items : items.filter(c => c.status === statusFilter)),
    [items, statusFilter],
  );

  const { newCount, promotedCount, highConfidence, totalSources } = useMemo(() => {
    const greenThreshold = cfg?.confidenceScoreBands.green ?? 80;
    return {
      newCount: items.filter(c => c.status === "new").length,
      promotedCount: items.filter(c => c.status === "promoted").length,
      highConfidence: items.filter(c => c.confidenceScore >= greenThreshold).length,
      totalSources: items.reduce((s, c) => s + c.sourceCount, 0),
    };
  }, [items, cfg?.confidenceScoreBands.green]);

  if (loading) {
    return (
      <>
        <PageHeader title="Discovery Inbox" subtitle="Product candidates generated from evidence streams" />
        <PageShell>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <KPISkeleton key={i} />
            ))}
          </div>
          <TableSkeleton rows={6} columns={8} />
        </PageShell>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Discovery Inbox" subtitle="Product candidates generated from evidence streams" />
      <PageShell>
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="New Candidates" value={String(newCount)} />
          <KPICard label="High Confidence" value={String(highConfidence)} info="Score ≥ 80%" />
          <KPICard label="Promoted" value={String(promotedCount)} />
          <KPICard label="Source Assets" value={String(totalSources)} />
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filter:</span>
            {["all", "new", "under_review", "promoted", "ignored"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s === "all" ? "All" : STATUS_CONFIG[s as CandidateStatusType]?.label ?? s}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            onClick={handleIngest}
            disabled={ingestLoading || !canMutate}
            title={!canMutate ? "API unavailable in offline demo mode" : ""}
          >
            <Zap className="h-4 w-4 mr-1" />
            {ingestLoading ? "Ingesting..." : "Run Discovery"}
          </Button>
        </div>

        {/* Candidates Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 font-medium">Candidate</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium text-center">Confidence</th>
                  <th className="pb-3 font-medium text-center">Sources</th>
                  <th className="pb-3 font-medium text-center">Consumers</th>
                  <th className="pb-3 font-medium text-right">Est. Cost</th>
                  <th className="pb-3 font-medium">Domain</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p>No candidates found. Click &ldquo;Run Discovery&rdquo; to ingest demo data.</p>
                    </td>
                  </tr>
                )}
                {filtered.map((c) => {
                  const typeConfig = TYPE_CONFIG[c.candidateType];
                  const statusConfig = STATUS_CONFIG[c.status];
                  const TypeIcon = typeConfig.icon;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4">
                        <Link href={`/candidates/${c.id}`} className="group">
                          <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {c.nameSuggested}
                          </div>
                          {c.ownerSuggested && (
                            <div className="text-xs text-gray-400 mt-0.5">{c.ownerSuggested}</div>
                          )}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${typeConfig.color} ${typeConfig.bg}`}>
                          <TypeIcon className="h-3 w-3" />
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <ConfidenceBadge score={c.confidenceScore} bands={cfg?.confidenceScoreBands} />
                      </td>
                      <td className="py-3 pr-4 text-center text-gray-600">{c.sourceCount}</td>
                      <td className="py-3 pr-4 text-center text-gray-600">{c.monthlyConsumers}</td>
                      <td className="py-3 pr-4 text-right text-gray-600 font-mono text-xs">
                        {c.monthlyCostEstimate > 0 ? `$${c.monthlyCostEstimate.toLocaleString()}/mo` : "-"}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">{c.domainSuggested ?? "-"}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.color} ${statusConfig.bg}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="py-3">
                        <Link href={`/candidates/${c.id}`}>
                          <Button variant="ghost" size="sm">
                            Review <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Narrative Flow → Product Portfolio */}
        <NextStepCard
          title="View your managed product portfolio"
          description="Promoted candidates join the portfolio where you can track cost, value, and lifecycle across every data product."
          href="/assets"
          ctaLabel="Product Portfolio"
        />
      </PageShell>
    </>
  );
}
