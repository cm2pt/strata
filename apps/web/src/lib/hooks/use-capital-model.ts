"use client";

import { useMemo } from "react";
import {
  useDataProducts,
  usePortfolioSummary,
  useDecisions,
  useCapitalImpact,
  useCapitalBehavior,
  usePortfolioRebalance,
  useActivePricingPolicies,
  useAIScorecards,
  useExecutiveSummary,
  usePortfolioCostTrend,
} from "@/lib/api/hooks";
import type {
  CapitalModel,
  CapitalActionCard,
  DecisionQueueRow,
  CapitalFlowDataPoint,
  Decision,
} from "@/lib/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24),
  );
}

function daysSince(dateStr: string): number {
  return Math.max(
    0,
    Math.round(
      (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24),
    ),
  );
}

function slaStatus(days: number): "on_track" | "at_risk" | "overdue" {
  if (days > 14) return "overdue";
  if (days > 10) return "at_risk";
  return "on_track";
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useCapitalModel(): {
  data: CapitalModel | null;
  loading: boolean;
} {
  const products = useDataProducts();
  const summary = usePortfolioSummary();
  const decisions = useDecisions();
  const capitalImpact = useCapitalImpact();
  const behavior = useCapitalBehavior();
  const rebalance = usePortfolioRebalance();
  const pricing = useActivePricingPolicies();
  const scorecards = useAIScorecards();
  const executive = useExecutiveSummary();
  const costTrend = usePortfolioCostTrend();

  const loading =
    products.loading ||
    summary.loading ||
    decisions.loading ||
    capitalImpact.loading ||
    behavior.loading ||
    rebalance.loading ||
    pricing.loading ||
    scorecards.loading ||
    executive.loading ||
    costTrend.loading;

  const data = useMemo((): CapitalModel | null => {
    const p = products.data?.items;
    const s = summary.data;
    const d = decisions.data;
    const ci = capitalImpact.data;
    const bh = behavior.data;
    const rb = rebalance.data;
    const pr = pricing.data;
    const sc = scorecards.data;
    const ex = executive.data;
    const ct = costTrend.data;

    if (!p || !s || !d || !ci || !bh || !rb || !ex || !ct) return null;

    // ── Header metrics ──────────────────────────────────────────────────

    const monthlyCapitalSpend = s.totalCost;

    // Misallocated = critical ROI + unvalidated low-ROI products
    const misallocatedProducts = p.filter(
      (prod) =>
        prod.roiBand === "critical" ||
        (prod.declaredValue === null &&
          prod.roi !== null &&
          prod.roi < 1.0),
    );
    const capitalMisallocated = misallocatedProducts.reduce(
      (sum, prod) => sum + prod.monthlyCost,
      0,
    );

    // Capital freed (last 90 days) — from resolved decisions
    const now = Date.now();
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
    const recentResolved = d.filter(
      (dec) =>
        dec.resolvedAt && new Date(dec.resolvedAt).getTime() >= ninetyDaysAgo,
    );
    const capitalFreedLast90d = recentResolved.reduce(
      (sum, dec) => sum + dec.capitalFreed,
      0,
    );
    // Run-rate = monthly savings from recent resolved decisions
    const capitalFreedRunRate = recentResolved.reduce(
      (sum, dec) => sum + dec.projectedSavingsMonthly,
      0,
    );
    // One-time = capital freed minus run-rate (e.g. if some is a one-off)
    const capitalFreedOneTime = Math.max(
      0,
      capitalFreedLast90d - capitalFreedRunRate,
    );

    // Decision latency — median days for all resolved decisions
    const resolvedDecisions = d.filter(
      (dec) => dec.resolvedAt && dec.createdAt,
    );
    const latencies = resolvedDecisions.map((dec) =>
      daysBetween(dec.createdAt, dec.resolvedAt!),
    );
    const decisionLatencyMedianDays =
      latencies.length > 0 ? median(latencies) : bh.avgDecisionVelocityDays;

    // ── Board snapshot ──────────────────────────────────────────────────

    const proj = ex.doNothingProjection;
    const boardSnapshotCostDelta =
      proj.projectedMonthlyCost - proj.currentMonthlyCost;
    const boardSnapshotRoiDelta = proj.projectedROI - proj.currentROI;
    const boardSnapshotMonths = proj.months;

    // ── Capital actions (4 cards) ───────────────────────────────────────

    const actions: CapitalActionCard[] = [];

    // 1. Retire pending candidates
    const pendingRetirements = d.filter(
      (dec) => dec.type === "retirement" && dec.status === "under_review",
    );
    if (pendingRetirements.length > 0) {
      const totalSavings = pendingRetirements.reduce(
        (sum, dec) => sum + dec.projectedSavingsMonthly,
        0,
      );
      const names = pendingRetirements.map((dec) => dec.productName);
      actions.push({
        id: "ca-retire",
        type: "retire",
        title: `Retire ${names.join(" + ")}`,
        description: `${pendingRetirements.length} products with near-zero ROI. Combined savings of ${formatCompact(totalSavings)}/mo.`,
        capitalImpactMonthly: totalSavings,
        confidence: 0.85,
        requiredApprover: pendingRetirements[0].assignedTo,
        approverTitle: pendingRetirements[0].assignedToTitle,
        relatedProductIds: pendingRetirements.map((dec) => dec.productId),
        relatedDecisionIds: pendingRetirements.map((dec) => dec.id),
        reviewHref: "/decisions?type=retirement",
        status: "actionable",
      });
    }

    // 2. Reallocate bottom quartile
    if (rb && rb.bottomQuartile && rb.topQuartile) {
      const reallocationDecision = d.find(
        (dec) =>
          dec.type === "capital_reallocation" &&
          dec.status === "under_review",
      );
      actions.push({
        id: "ca-reallocate",
        type: "reallocate",
        title: `Reallocate ${formatCompact(rb.totalMonthlyCost * rb.rebalancePct)}/mo from bottom quartile`,
        description: `Move capital from ${rb.bottomQuartile.count} low-ROI products (${rb.bottomQuartile.blendedRoi.toFixed(1)}x) to top performers (${rb.topQuartile.blendedRoi.toFixed(1)}x). Projected +${rb.efficiencyDelta.toFixed(1)}x portfolio ROI.`,
        capitalImpactMonthly: Math.round(
          rb.totalMonthlyCost * rb.rebalancePct,
        ),
        confidence: 0.72,
        requiredApprover: reallocationDecision?.assignedTo ?? "CFO",
        approverTitle:
          reallocationDecision?.assignedToTitle ?? "Chief Financial Officer",
        relatedProductIds: rb.bottomQuartile.products.map((prod) => prod.id),
        relatedDecisionIds: reallocationDecision
          ? [reallocationDecision.id]
          : [],
        reviewHref: "/allocation",
        status: reallocationDecision ? "in_progress" : "actionable",
      });
    }

    // 3. Price unpriced products
    const draftPolicies = pr ?? [];
    if (draftPolicies.length > 0) {
      const totalRecovery = draftPolicies.reduce(
        (sum, pol) => sum + pol.projectedRevenue,
        0,
      );
      const pricingDecision = d.find(
        (dec) =>
          dec.type === "pricing_activation" &&
          dec.status === "under_review",
      );
      actions.push({
        id: "ca-price",
        type: "price",
        title: `Activate pricing for ${draftPolicies.length} product${draftPolicies.length > 1 ? "s" : ""}`,
        description: `Draft pricing policies ready. Projected internal recovery of ${formatCompact(totalRecovery)}/mo via usage-based chargeback.`,
        capitalImpactMonthly: totalRecovery,
        confidence: 0.68,
        requiredApprover: pricingDecision?.assignedTo ?? "CDO",
        approverTitle:
          pricingDecision?.assignedToTitle ?? "Chief Data Officer",
        relatedProductIds: draftPolicies.map((pol) => pol.productId),
        relatedDecisionIds: pricingDecision ? [pricingDecision.id] : [],
        reviewHref: "/simulate",
        status: pricingDecision ? "in_progress" : "actionable",
      });
    }

    // 4. Review flagged AI projects
    const flagged = (sc ?? []).filter((s) => s.flaggedForReview);
    if (flagged.length > 0) {
      const totalCost = flagged.reduce(
        (sum, s) => sum + s.monthlyCost,
        0,
      );
      const aiDecision = d.find(
        (dec) =>
          dec.type === "ai_project_review" &&
          dec.status === "under_review",
      );
      actions.push({
        id: "ca-ai",
        type: "review_ai",
        title: `Review ${flagged.length} flagged AI project${flagged.length > 1 ? "s" : ""}`,
        description: `${formatCompact(totalCost)}/mo in spend across projects with critical or high risk scores. No confirmed value for ${flagged.filter((s) => s.roi === null || s.roi === 0).length}.`,
        capitalImpactMonthly: totalCost,
        confidence: 0.6,
        requiredApprover: aiDecision?.assignedTo ?? "Head of AI",
        approverTitle: aiDecision?.assignedToTitle ?? "Head of AI",
        relatedProductIds: flagged.map((s) => s.productId),
        relatedDecisionIds: aiDecision ? [aiDecision.id] : [],
        reviewHref: "/ai-scorecard",
        status: aiDecision ? "in_progress" : "actionable",
      });
    }

    // ── Capital at risk / freed ─────────────────────────────────────────

    const capitalAtRisk =
      capitalMisallocated + (proj.projectedValueAtRisk ?? 0);
    const capitalFreedConfirmed = ci.totalCapitalFreed;

    // ── Inaction cost ───────────────────────────────────────────────────

    const inactionProjectedSpend = boardSnapshotCostDelta * boardSnapshotMonths;
    const inactionProjectedLiability =
      proj.projectedWastedSpend + proj.projectedValueAtRisk;

    // ── Capital flow chart ──────────────────────────────────────────────

    // Build a lookup of freed by month
    const freedByMonth: Record<string, number> = {};
    for (const m of ci.capitalFreedByMonth) {
      // Convert "2026-02" → "Feb"
      const date = new Date(m.month + "-01");
      const label = date.toLocaleDateString("en-US", { month: "short" });
      freedByMonth[label] = (freedByMonth[label] ?? 0) + m.amount;
    }

    // Estimate misallocation fraction per month (steady proportion of total spend)
    const misallocationFraction =
      monthlyCapitalSpend > 0
        ? capitalMisallocated / monthlyCapitalSpend
        : 0;

    const capitalFlowData: CapitalFlowDataPoint[] = ct.map((point) => ({
      month: point.month,
      totalSpend: point.cost,
      misallocated: Math.round(point.cost * misallocationFraction),
      freed: freedByMonth[point.month] ?? 0,
      recovered: 0, // No pricing revenue realized yet
    }));

    // ── Decision queue ──────────────────────────────────────────────────

    const pendingDecisions = d.filter(
      (dec) => dec.status === "under_review",
    );

    const decisionQueue: DecisionQueueRow[] = pendingDecisions
      .map((dec: Decision) => {
        const days = daysSince(dec.createdAt);
        // Estimate confidence from available data
        const product = p.find((prod) => prod.id === dec.productId);
        const confidence = product
          ? Math.min(1, (product.costCoverage + (product.declaredValue !== null ? 0.3 : 0)) / 1.3)
          : 0.5;

        // Determine approver based on decision type
        let approver = "CFO";
        if (dec.type === "pricing_activation") approver = "CDO";
        else if (dec.type === "ai_project_review") approver = "Head of AI";
        else if (dec.type === "value_revalidation") approver = "Product Owner";

        return {
          decisionId: dec.id,
          type: dec.type,
          productName: dec.productName,
          capitalImpactMonthly: dec.projectedSavingsMonthly || dec.estimatedImpact,
          confidence,
          owner: dec.assignedTo,
          ownerTitle: dec.assignedToTitle,
          approver,
          slaDays: days,
          slaStatus: slaStatus(days),
          status: dec.status,
        };
      })
      .sort((a, b) => b.capitalImpactMonthly - a.capitalImpactMonthly);

    // ── Coverage & auditability ─────────────────────────────────────────

    const productsWithDeclaredValue = p.filter(
      (prod) => prod.declaredValue !== null,
    ).length;
    const productsWithInferredValue = p.filter(
      (prod) => prod.inferredValue !== null,
    ).length;
    const productsWithValue = productsWithDeclaredValue;
    const decisionsWithOwner = d.filter(
      (dec) => dec.assignedTo && dec.impactBasis,
    ).length;
    const decisionProvenance =
      d.length > 0 ? decisionsWithOwner / d.length : 0;

    return {
      monthlyCapitalSpend,
      capitalMisallocated,
      capitalFreedLast90d,
      capitalFreedRunRate,
      capitalFreedOneTime,
      decisionLatencyMedianDays,
      boardSnapshotCostDelta,
      boardSnapshotRoiDelta,
      boardSnapshotMonths,
      capitalActions: actions,
      capitalAtRisk,
      capitalFreedConfirmed,
      inactionProjectedSpend,
      inactionProjectedLiability,
      inactionPrimaryDriver: "decision latency",
      inactionPrimaryDriverValue: `median ${Math.round(decisionLatencyMedianDays)} days`,
      capitalFlowData,
      decisionQueue,
      costCoverage: s.costCoverage,
      valueCoverage: `${productsWithDeclaredValue}/${s.totalProducts} declared · ${productsWithInferredValue} inferred`,
      valueDeclarationCoverage: productsWithValue / s.totalProducts,
      confidenceLevel: ex.confidenceLevel,
      confidenceBasis: ex.confidenceBasis,
      decisionProvenance,
    };
  }, [
    products.data,
    summary.data,
    decisions.data,
    capitalImpact.data,
    behavior.data,
    rebalance.data,
    pricing.data,
    scorecards.data,
    executive.data,
    costTrend.data,
  ]);

  return { data, loading };
}

// Compact currency format for action card descriptions
function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(1)}K`;
  return `$${abs.toFixed(0)}`;
}
