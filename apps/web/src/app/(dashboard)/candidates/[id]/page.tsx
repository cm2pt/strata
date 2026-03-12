"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { KPISkeleton, CardSkeleton } from "@/components/shared/skeleton";
import { useCandidateDetail } from "@/lib/api/hooks";
import { useAuth } from "@/lib/auth/context";
import { PERM } from "@/lib/auth/permissions";
import { apiPost } from "@/lib/api/client";
import { useToast } from "@/components/shared/toast";
import { ArrowLeft } from "lucide-react";
import {
  CandidateActionBar,
  CandidateKPICards,
  CandidateConfidenceCard,
  CandidateAdoptionCard,
  CandidateSourceAssetsTable,
  PromoteDialog,
  IgnoreDialog,
  RetireDialog,
} from "./components";

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params.id as string;
  const { data: candidate, loading, refetch } = useCandidateDetail(candidateId);
  const { user, hasPermission } = useAuth();
  const { toastError, toastSuccess } = useToast();
  const canPromote = hasPermission(PERM.CANDIDATES_PROMOTE);
  const canIgnore = hasPermission(PERM.CANDIDATES_IGNORE);
  const canCreateDecision = hasPermission(PERM.DECISIONS_CREATE);

  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [showIgnoreDialog, setShowIgnoreDialog] = useState(false);
  const [showRetireDialog, setShowRetireDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Promote form state
  const [promoteName, setPromoteName] = useState("");
  const [promoteDomain, setPromoteDomain] = useState("");
  const [promoteBU, setPromoteBU] = useState("Data Platform");
  const [promotePlatform, setPromotePlatform] = useState("snowflake");
  const [ignoreReason, setIgnoreReason] = useState("");

  if (loading) {
    return (
      <>
        <PageHeader
          title="..."
          breadcrumbs={[{ label: "Candidates", href: "/candidates" }, { label: "..." }]}
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

  if (!candidate) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-muted-foreground">Candidate not found</div>
      </div>
    );
  }

  // ── Action Handlers ──────────────────────────────────────────────────────

  const handlePromote = async () => {
    setActionLoading(true);
    try {
      const res = await apiPost<{ productId: string; message: string }>(
        `/candidates/${candidateId}/promote`,
        {
          name: promoteName || candidate.nameSuggested,
          domain: promoteDomain || candidate.domainSuggested || "General",
          businessUnit: promoteBU,
          platform: promotePlatform,
          ownerId: user?.id ?? "00000000-0000-0000-0000-000000000001",
        },
      );
      setShowPromoteDialog(false);
      toastSuccess(`${promoteName || candidate.nameSuggested} promoted to Data Product`);
      router.push(`/assets/${res.productId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to promote candidate";
      toastError(msg);
      setShowPromoteDialog(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFlagRetirement = async () => {
    setActionLoading(true);
    try {
      await apiPost<{ decisionId: string; message: string }>(
        `/candidates/${candidateId}/flag-retirement`,
        {},
      );
      setShowRetireDialog(false);
      toastSuccess("Retirement decision created");
      router.push("/decisions");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to flag for retirement";
      toastError(msg);
      setShowRetireDialog(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleIgnore = async () => {
    setActionLoading(true);
    try {
      await apiPost(`/candidates/${candidateId}/ignore`, { reason: ignoreReason });
      toastSuccess("Candidate ignored");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to ignore candidate";
      toastError(msg);
    } finally {
      setActionLoading(false);
      setShowIgnoreDialog(false);
      refetch();
    }
  };

  return (
    <>
      <PageHeader
        title={candidate.nameSuggested}
        subtitle={`${candidate.candidateType.replace(/_/g, " ")} candidate`}
        breadcrumbs={[{ label: "Candidates", href: "/candidates" }, { label: candidate.nameSuggested }]}
      />
      <PageShell>
        {/* Back link */}
        <Link
          href="/candidates"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors -mt-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Candidates
        </Link>

        {/* Action bars */}
        <CandidateActionBar
          candidate={candidate}
          canPromote={canPromote}
          canIgnore={canIgnore}
          canCreateDecision={canCreateDecision}
          onPromote={() => {
            setPromoteName(candidate.nameSuggested);
            setPromoteDomain(candidate.domainSuggested ?? "General");
            setShowPromoteDialog(true);
          }}
          onIgnore={() => setShowIgnoreDialog(true)}
          onRetire={() => setShowRetireDialog(true)}
        />

        {/* KPI Row */}
        <CandidateKPICards candidate={candidate} />

        {/* Confidence + Adoption */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CandidateConfidenceCard candidate={candidate} />
          <CandidateAdoptionCard candidate={candidate} />
        </div>

        {/* Source Assets Table */}
        <CandidateSourceAssetsTable members={candidate.members} />

        {/* Dialogs */}
        <PromoteDialog
          open={showPromoteDialog}
          onOpenChange={setShowPromoteDialog}
          candidate={candidate}
          actionLoading={actionLoading}
          promoteName={promoteName}
          promoteDomain={promoteDomain}
          promoteBU={promoteBU}
          promotePlatform={promotePlatform}
          onPromoteNameChange={setPromoteName}
          onPromoteDomainChange={setPromoteDomain}
          onPromoteBUChange={setPromoteBU}
          onPromotePlatformChange={setPromotePlatform}
          onConfirm={handlePromote}
        />
        <IgnoreDialog
          open={showIgnoreDialog}
          onOpenChange={setShowIgnoreDialog}
          actionLoading={actionLoading}
          ignoreReason={ignoreReason}
          onIgnoreReasonChange={setIgnoreReason}
          onConfirm={handleIgnore}
        />
        <RetireDialog
          open={showRetireDialog}
          onOpenChange={setShowRetireDialog}
          candidate={candidate}
          actionLoading={actionLoading}
          onConfirm={handleFlagRetirement}
        />
      </PageShell>
    </>
  );
}
