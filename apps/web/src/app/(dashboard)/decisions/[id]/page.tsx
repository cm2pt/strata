"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { KPISkeleton, CardSkeleton } from "@/components/shared/skeleton";
import { DecisionStatusBadge } from "@/components/shared/decision-status-badge";
import {
  useDecision,
  useDecisionImpactReport,
  useDecisionComments,
  useDecisionActions,
  useDecisionEconomicEffects,
} from "@/lib/api/hooks";
import { useAuth } from "@/lib/auth/context";
import { PERM } from "@/lib/auth/permissions";
import { apiPost, apiPatch } from "@/lib/api/client";
import { useToast } from "@/components/shared/toast";
import { ArrowLeft, ShieldCheck, FileText } from "lucide-react";
import {
  DecisionKPICards,
  DecisionActionBar,
  DecisionImpactReportCard,
  DecisionInfoCard,
  DecisionEconomicEffects,
  DecisionActivityTimeline,
  DecisionCommentsSection,
  ApproveDialog,
  RejectDialog,
  DelayDialog,
  DecisionLineageEvidence,
  TYPE_LABELS,
  TYPE_ICONS,
  impactStatusStyles,
} from "./components";

// ── Page Component ───────────────────────────────────────────────────────────

export default function DecisionDetailPage() {
  const params = useParams();
  const decisionId = params.id as string;

  const { data: decision, loading, refetch } = useDecision(decisionId);
  const { data: impactReport } = useDecisionImpactReport(decisionId);
  const { data: comments, refetch: refetchComments } = useDecisionComments(decisionId);
  const { data: actions } = useDecisionActions(decisionId);
  const { data: effects } = useDecisionEconomicEffects(decisionId);
  const { hasPermission } = useAuth();
  const { toastError, toastSuccess } = useToast();
  const canApprove = hasPermission(PERM.DECISIONS_APPROVE);

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDelayDialog, setShowDelayDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [delayReason, setDelayReason] = useState("");
  const [delayDate, setDelayDate] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  if (loading) {
    return (
      <>
        <PageHeader
          title="..."
          breadcrumbs={[{ label: "Decisions", href: "/decisions" }, { label: "..." }]}
        />
        <PageShell>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <KPISkeleton key={i} />
            ))}
          </div>
          <CardSkeleton />
          <CardSkeleton />
        </PageShell>
      </>
    );
  }

  if (!decision) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-muted-foreground">Decision not found</div>
      </div>
    );
  }

  const TypeIcon = TYPE_ICONS[decision.type] ?? FileText;
  const typeLabel = TYPE_LABELS[decision.type] ?? decision.type;
  const isApproved = decision.status === "approved";
  const impactStyle = impactStatusStyles[decision.impactValidationStatus ?? "pending"];

  // ── Action Handlers ──────────────────────────────────────────────────────

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      if (decision.type === "retirement") {
        await apiPost(`/decisions/${decisionId}/approve-retirement`, {});
      } else {
        await apiPatch(`/decisions/${decisionId}`, { status: "approved" });
      }
      toastSuccess("Decision approved");
      setShowApproveDialog(false);
      refetch();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to approve");
      setShowApproveDialog(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await apiPatch(`/decisions/${decisionId}`, { status: "rejected" });
      toastSuccess("Decision rejected");
      setShowRejectDialog(false);
      refetch();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to reject");
      setShowRejectDialog(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelay = async () => {
    setActionLoading(true);
    try {
      await apiPost(`/decisions/${decisionId}/delay-retirement`, {
        delayReason,
        delayedUntil: delayDate,
      });
      toastSuccess("Decision delayed");
      setShowDelayDialog(false);
      refetch();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to delay");
      setShowDelayDialog(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      await apiPost(`/decisions/${decisionId}/comments`, { comment: commentText });
      toastSuccess("Comment added");
      setCommentText("");
      refetchComments();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title={decision.title}
        subtitle={typeLabel}
        breadcrumbs={[{ label: "Decisions", href: "/decisions" }, { label: decision.title }]}
      />
      <PageShell>
        {/* ── Back Link ─────────────────────────────────────────── */}
        <Link
          href="/decisions"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors -mt-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Decisions
        </Link>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          <TypeIcon className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">{decision.title}</h2>
          <DecisionStatusBadge status={decision.status} />
          {decision.impactValidationStatus && isApproved && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${impactStyle.bg} ${impactStyle.text}`}
            >
              <ShieldCheck className="h-3 w-3" />
              {impactStyle.label}
            </span>
          )}
        </div>

        {/* ── Action Bar (under_review only) ─────────────────────── */}
        <DecisionActionBar
          decision={decision}
          canApprove={canApprove}
          onApprove={() => setShowApproveDialog(true)}
          onReject={() => setShowRejectDialog(true)}
          onDelay={() => setShowDelayDialog(true)}
        />

        {/* ── KPI Row ────────────────────────────────────────────── */}
        <DecisionKPICards decision={decision} impactReport={impactReport} />

        {/* ── Impact Report (approved only) ──────────────────────── */}
        {isApproved && impactReport && (
          <DecisionImpactReportCard decision={decision} impactReport={impactReport} />
        )}

        {/* ── Decision Info ──────────────────────────────────────── */}
        <DecisionInfoCard decision={decision} />

        {/* ── Lineage Evidence ─────────────────────────────────────── */}
        <DecisionLineageEvidence decision={decision} />

        {/* ── Economic Effects Table ──────────────────────────────── */}
        <DecisionEconomicEffects effects={effects ?? []} />

        {/* ── Activity Timeline ──────────────────────────────────── */}
        <DecisionActivityTimeline actions={actions ?? []} />

        {/* ── Comments Section ───────────────────────────────────── */}
        <DecisionCommentsSection
          comments={comments ?? []}
          canApprove={canApprove}
          commentText={commentText}
          commentLoading={commentLoading}
          onCommentTextChange={setCommentText}
          onAddComment={handleAddComment}
        />

        {/* ── Dialogs ────────────────────────────────────────────── */}
        <ApproveDialog
          open={showApproveDialog}
          onOpenChange={setShowApproveDialog}
          decision={decision}
          typeLabel={typeLabel}
          actionLoading={actionLoading}
          onConfirm={handleApprove}
        />
        <RejectDialog
          open={showRejectDialog}
          onOpenChange={setShowRejectDialog}
          actionLoading={actionLoading}
          onConfirm={handleReject}
        />
        <DelayDialog
          open={showDelayDialog}
          onOpenChange={setShowDelayDialog}
          actionLoading={actionLoading}
          delayReason={delayReason}
          delayDate={delayDate}
          onDelayReasonChange={setDelayReason}
          onDelayDateChange={setDelayDate}
          onConfirm={handleDelay}
        />
      </PageShell>
    </>
  );
}
