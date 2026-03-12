"use client";

import { cn } from "@/lib/utils";
import { card, typography, brand } from "@/lib/tokens";
import { formatCurrency, formatROI } from "@/lib/format";
import type { CapitalModel } from "@/lib/types";
import { AlertTriangle, ArrowRight, FlaskConical, Shield } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useExplainability } from "@/lib/contexts/explainability-context";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface CapitalHeaderProps {
  model: CapitalModel;
  className?: string;
  /** Called when a metric's provenance icon is clicked */
  onProvenanceClick?: (metricKey: string) => void;
}

export function CapitalHeader({ model, className, onProvenanceClick }: CapitalHeaderProps) {
  const { showDataSources } = useExplainability();
  const latencyWarning = model.decisionLatencyMedianDays > 14;
  const showProvenance = showDataSources && !!onProvenanceClick;

  // Diagnosis computations
  const wastePercent = model.monthlyCapitalSpend > 0
    ? Math.round((model.capitalMisallocated / model.monthlyCapitalSpend) * 100)
    : 0;
  const healthScore = Math.max(0, 100 - wastePercent);
  const healthColor = healthScore >= 70 ? "text-teal-700" : healthScore >= 40 ? "text-amber-700" : "text-red-700";
  const healthDot = healthScore >= 70 ? "bg-teal-500" : healthScore >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className={cn(card.primary, "p-6", className)}>
      {/* Zone A — Two-column hero: Spend vs. Waste */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Left: Monthly Data Capital Spend */}
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <p className={cn(typography.metricLabel)}>
              Monthly Data Capital Spend
            </p>
            {showProvenance && (
              <ProvenanceButton
                metricKey="portfolio_monthly_spend"
                label="Monthly Data Capital Spend"
                onClick={onProvenanceClick!}
              />
            )}
          </div>
          <p
            className="text-4xl sm:text-5xl font-semibold font-mono tabular-nums tracking-tight"
            style={{ color: brand.graphite }}
          >
            {formatCurrency(model.monthlyCapitalSpend, true)}
            <span className="text-lg font-normal text-gray-400">/mo</span>
          </p>
        </div>

        {/* Right: Capital Waste */}
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <p className={cn(typography.metricLabel)} style={{ color: brand.alertAmber }}>
              Capital Waste
            </p>
            {showProvenance && (
              <ProvenanceButton
                metricKey="capital_misallocated"
                label="Capital Waste"
                onClick={onProvenanceClick!}
              />
            )}
          </div>
          <p className="text-4xl sm:text-5xl font-semibold font-mono tabular-nums tracking-tight text-amber-700">
            {wastePercent}%
          </p>
          <p className="text-sm text-amber-500 font-mono tabular-nums mt-1">
            {formatCurrency(model.capitalMisallocated, true)}/mo with no measurable return
          </p>
        </div>
      </div>

      {/* Zone B — 4-metric secondary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t" style={{ borderColor: brand.borderSubtle }}>
        {/* Portfolio Health */}
        <div className="flex items-start gap-2.5">
          <div className={cn("mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0", healthDot)} />
          <div>
            <p className={cn(typography.metricLabel, "mb-0.5")}>Portfolio Health</p>
            <p className={cn("text-lg font-semibold font-mono tabular-nums", healthColor)}>
              {healthScore}
              <span className="text-xs font-normal text-gray-400">/100</span>
            </p>
          </div>
        </div>

        {/* Capital Freed */}
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className={cn(typography.metricLabel)} style={{ color: brand.accentGreen }}>
              Capital Freed (90d)
            </p>
            {showProvenance && (
              <ProvenanceButton
                metricKey="capital_freed"
                label="Capital Freed"
                onClick={onProvenanceClick!}
              />
            )}
          </div>
          <p className="text-lg font-semibold font-mono tabular-nums text-teal-700">
            {formatCurrency(model.capitalFreedLast90d, true)}
          </p>
          <p className="text-[10px] text-gray-400">
            Run-rate {formatCurrency(model.capitalFreedRunRate, true)}/mo
          </p>
        </div>

        {/* Decision Latency */}
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className={cn(typography.metricLabel)}>
              Decision Latency
            </p>
            {showProvenance && (
              <ProvenanceButton
                metricKey="decision_velocity"
                label="Decision Latency"
                onClick={onProvenanceClick!}
              />
            )}
          </div>
          <p
            className={cn(
              "text-lg font-semibold font-mono tabular-nums",
              latencyWarning ? "text-amber-700" : "text-gray-700",
            )}
          >
            {Math.round(model.decisionLatencyMedianDays)}
            <span className="text-xs font-normal text-gray-400"> days median</span>
          </p>
          <p className="text-[10px] text-gray-400">
            Recommendation to approval
          </p>
        </div>

        {/* Capital at Risk */}
        <div>
          <p className={cn(typography.metricLabel, "mb-0.5")} style={{ color: brand.riskRed }}>
            Capital at Risk
          </p>
          <p className="text-lg font-semibold font-mono tabular-nums text-red-700">
            {formatCurrency(model.capitalAtRisk, true)}
          </p>
          <p className="text-[10px] text-gray-400">
            Unresolved exposure
          </p>
        </div>
      </div>

      {/* Zone C — Full-width urgency banner */}
      <div className="mt-5">
        <div className="rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ backgroundColor: brand.deepNavy }}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">
                Board Projection: {model.boardSnapshotMonths}-Month Outlook
              </p>
              <p className="text-xs text-gray-300 mt-0.5">
                Without intervention:{" "}
                <span className="font-semibold text-red-300 font-mono tabular-nums">
                  +{formatCurrency(model.boardSnapshotCostDelta, true)}
                </span>
                {" "}additional cost, portfolio ROI drops to{" "}
                <span className="font-semibold text-red-300 font-mono tabular-nums">
                  {formatROI(model.boardSnapshotRoiDelta)}
                </span>
              </p>
            </div>
          </div>
          <Link href="/capital-projection" className="flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1 border-gray-600 text-gray-200 hover:bg-gray-800 hover:text-white"
            >
              View projection
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Provenance Button ────────────────────────────────────────────────────────

function ProvenanceButton({
  metricKey,
  label,
  onClick,
}: {
  metricKey: string;
  label: string;
  onClick: (key: string) => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onClick(metricKey)}
          className="text-teal-400 hover:text-teal-600 transition-colors"
          aria-label={`View provenance for ${label}`}
        >
          <FlaskConical className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        View data provenance
      </TooltipContent>
    </Tooltip>
  );
}
