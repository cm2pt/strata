"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { KPISkeleton, CardSkeleton } from "@/components/shared/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination, usePagination } from "@/components/shared/pagination";
import { useDecisions, useSavingsSummary } from "@/lib/api/hooks";
import { apiPost, apiPatch, canMutate } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";
import { PERM } from "@/lib/auth/permissions";
import { useToast } from "@/components/shared/toast";
import type { DecisionType, DecisionStatus, Decision } from "@/lib/types";
import { computeRealizedSavings, computePendingEstimatedSavings } from "@/lib/metrics/canonical";
import { exportToCSV, formatCurrencyCSV } from "@/lib/utils/csv-export";
import { formatCurrency } from "@/lib/format";
import { CheckCircle2, Download } from "lucide-react";
import { NextStepCard } from "@/components/shared/next-step-card";
import { Button } from "@/components/ui/button";
import {
  DecisionsSavingsBanner,
  DecisionsKPICards,
  DecisionsFilters,
  DecisionsList,
  DecisionActionDialog,
} from "./components";

export default function DecisionsPage() {
  const [statusFilter, setStatusFilter] = useState<DecisionStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<DecisionType | "all">("all");
  const [page, setPage] = useState(1);
  const [actionDialog, setActionDialog] = useState<{ type: "approve" | "reject" | "delay"; decision: Decision } | null>(null);
  const [delayReason, setDelayReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { hasPermission } = useAuth();
  const { toastError, toastSuccess } = useToast();
  const canApprove = hasPermission(PERM.DECISIONS_APPROVE);

  const { data, loading, refetch } = useDecisions();
  const { data: savings } = useSavingsSummary();

  // All hooks MUST be called before any conditional return (React rules of hooks)
  const decisions = data ?? [];

  const filtered = useMemo(() => {
    const sorted = [...decisions].sort((a, b) => {
      if (a.status === "under_review" && b.status !== "under_review") return -1;
      if (b.status === "under_review" && a.status !== "under_review") return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return sorted.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (typeFilter !== "all" && d.type !== typeFilter) return false;
      return true;
    });
  }, [decisions, statusFilter, typeFilter]);

  const { paginate, totalPages } = usePagination(filtered, 15);
  const paginatedDecisions = useMemo(() => paginate(page), [paginate, page]);

  // Reset page when filters change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => setPage(1), [statusFilter, typeFilter]);

  const { underReview, approved, totalRealizedSavings, totalEstimatedPending, impactConfirmed } =
    useMemo(() => {
      const ur = decisions.filter((d) => d.status === "under_review");
      const ap = decisions.filter((d) => d.status === "approved");
      const confirmed = ap.filter((d) => d.impactValidationStatus === "confirmed").length;
      return {
        underReview: ur,
        approved: ap,
        totalRealizedSavings: computeRealizedSavings(decisions),
        totalEstimatedPending: computePendingEstimatedSavings(decisions),
        impactConfirmed: confirmed,
      };
    }, [decisions]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="Economic Decision Log"
          subtitle="Capital-impact decisions: approve, reject, or delay — every decision logs financial effect"
        />
        <PageShell>
          <CardSkeleton lines={3} />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <KPISkeleton key={i} />
            ))}
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} lines={4} />
          ))}
        </PageShell>
      </div>
    );
  }

  const totalCapitalFreed = savings?.totalCapitalFreedMonthly ?? totalRealizedSavings;

  async function handleApprove(decision: Decision) {
    setSubmitting(true);
    try {
      if (decision.type === "retirement") {
        await apiPost(`/decisions/${decision.id}/approve-retirement`, {});
      } else {
        await apiPatch(`/decisions/${decision.id}`, { status: "approved", actualImpact: decision.estimatedImpact });
      }
      refetch();
      toastSuccess("Decision approved successfully");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to approve";
      toastError(msg);
    } finally {
      setSubmitting(false);
      setActionDialog(null);
    }
  }

  async function handleReject(decision: Decision) {
    setSubmitting(true);
    try {
      await apiPatch(`/decisions/${decision.id}`, { status: "rejected", resolution: "Rejected by reviewer" });
      refetch();
      toastSuccess("Decision rejected");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to reject";
      toastError(msg);
    } finally {
      setSubmitting(false);
      setActionDialog(null);
    }
  }

  async function handleDelay(decision: Decision) {
    setSubmitting(true);
    try {
      const delayDate = new Date();
      delayDate.setMonth(delayDate.getMonth() + 3);
      await apiPost(`/decisions/${decision.id}/delay-retirement`, {
        delayReason: delayReason || "Needs further review",
        delayedUntil: delayDate.toISOString(),
      });
      refetch();
      toastSuccess("Retirement delayed");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delay";
      toastError(msg);
    } finally {
      setSubmitting(false);
      setActionDialog(null);
      setDelayReason("");
    }
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Economic Decision Log"
        subtitle="Capital-impact decisions: approve, reject, or delay — every decision logs financial effect"
        primaryAction={
          decisions.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => {
                exportToCSV(
                  filtered,
                  [
                    { header: "Title", accessor: (d) => d.title },
                    { header: "Type", accessor: (d) => d.type },
                    { header: "Status", accessor: (d) => d.status },
                    { header: "Assigned To", accessor: (d) => d.assignedTo ?? "" },
                    { header: "Estimated Impact", accessor: (d) => formatCurrencyCSV(d.estimatedImpact ?? 0) },
                    { header: "Actual Impact", accessor: (d) => d.actualImpact ? formatCurrencyCSV(d.actualImpact) : "" },
                    { header: "Created", accessor: (d) => d.createdAt },
                  ],
                  `decisions-${new Date().toISOString().slice(0, 10)}.csv`,
                );
                toastSuccess("Decisions exported to CSV");
              }}
            >
              <Download className="h-3 w-3 mr-1" />
              Export CSV
            </Button>
          ) : undefined
        }
      />

      <PageShell>
        <DecisionsSavingsBanner
          totalCapitalFreed={totalCapitalFreed}
          approvedCount={savings?.approvedRetirements ?? approved.length}
          pendingCount={savings?.pendingRetirements ?? underReview.length}
        />

        <DecisionsKPICards
          underReviewCount={underReview.length}
          totalCapitalFreed={totalCapitalFreed}
          approvedWithImpactCount={approved.filter(d => (d.actualImpact ?? 0) > 0).length}
          totalEstimatedPending={totalEstimatedPending}
          pendingCount={underReview.length}
          impactConfirmed={impactConfirmed}
          approvedCount={approved.length}
          totalDecisions={decisions.length}
          decisionsThisQuarter={savings?.decisionsThisQuarter ?? decisions.length}
        />

        <DecisionsFilters
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          onStatusChange={setStatusFilter}
          onTypeChange={setTypeFilter}
          filteredCount={filtered.length}
        />

        <DecisionsList
          decisions={paginatedDecisions}
          canApprove={canApprove}
          onAction={(type, decision) => setActionDialog({ type, decision })}
        />

        {filtered.length === 0 && (
          <EmptyState icon={CheckCircle2} title="No decisions match your filters" action={<Button variant="ghost" size="sm" className="text-xs" onClick={() => { setStatusFilter("all"); setTypeFilter("all"); }}>Clear filters</Button>} />
        )}

        {filtered.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, filtered.length)} of {filtered.length} decisions
            </p>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}

        <DecisionActionDialog
          actionDialog={actionDialog}
          submitting={submitting}
          delayReason={delayReason}
          onDelayReasonChange={setDelayReason}
          onClose={() => setActionDialog(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onDelay={handleDelay}
        />

        {/* Narrative Flow → Capital Impact */}
        <NextStepCard
          title={approved.length > 0
            ? "Review the financial impact of your decisions"
            : "See projected capital impact"
          }
          description={approved.length > 0
            ? `${approved.length} approved decision${approved.length > 1 ? "s" : ""} — see how they affect portfolio capital.`
            : "Track how governance decisions translate into measurable capital recovery across the portfolio."
          }
          href="/capital-impact"
          ctaLabel="Capital Impact"
        />
      </PageShell>
    </div>
  );
}
