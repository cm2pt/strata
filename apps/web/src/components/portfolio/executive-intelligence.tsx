"use client";

import { cn } from "@/lib/utils";
import { card } from "@/lib/tokens";
import { ConfidenceIndicator } from "@/components/shared/confidence-indicator";
import { formatCurrency, formatROI } from "@/lib/format";
import type { ExecutiveSummary } from "@/lib/types";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ExecutiveIntelligenceProps {
  summary: ExecutiveSummary;
  className?: string;
}

const typeConfig = {
  insight: { icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", badge: "Insight" },
  risk: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", badge: "Risk" },
  opportunity: { icon: Lightbulb, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", badge: "Opportunity" },
};

/**
 * @deprecated Use DecisionCockpit for the Portfolio page. Kept for board-view and other pages.
 *
 * Executive Intelligence — the AI advisory layer.
 * 3 key insights, 1 risk, 1 opportunity, plus "if you do nothing" projection.
 */
export function ExecutiveIntelligence({ summary, className }: ExecutiveIntelligenceProps) {
  const [showProjection, setShowProjection] = useState(false);
  const p = summary.doNothingProjection;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Executive Intelligence</h2>
            <p className="text-xs text-gray-400 mt-0.5">AI-generated advisory based on portfolio data</p>
          </div>
        </div>
        <ConfidenceIndicator
          level={summary.confidenceLevel}
          basis={summary.confidenceBasis}
        />
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {summary.insights.map((insight) => {
          const cfg = typeConfig[insight.type];
          const Icon = cfg.icon;
          return (
            <div
              key={insight.id}
              className={cn(
                "rounded-lg border p-3",
                cfg.bg, cfg.border,
                insight.type === "risk" || insight.type === "opportunity" ? "lg:col-span-1" : "lg:col-span-1",
              )}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                <span className={cn("text-[10px] font-semibold uppercase tracking-wider", cfg.color)}>
                  {cfg.badge}
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-900 leading-snug">
                {insight.title}
              </p>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed line-clamp-3">
                {insight.description}
              </p>
              {insight.financialImpact !== null && (
                <div className="mt-2 pt-2 border-t border-black/5">
                  <span className={cn("text-xs font-semibold font-mono", insight.financialImpact > 0 ? "text-emerald-600" : "text-red-600")}>
                    {insight.financialImpact > 0 ? "+" : ""}{formatCurrency(insight.financialImpact, true)}
                    <span className="text-gray-400 font-normal">/mo impact</span>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* "If You Do Nothing" Projection — Collapsible */}
      <div className={cn(card.base, "overflow-hidden")}>
        <button
          onClick={() => setShowProjection(!showProjection)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-gray-900">
              <AlertTriangle className="h-3 w-3 text-amber-400" />
            </div>
            <span className="text-xs font-semibold text-gray-900">
              If you do nothing: {p.months}-month projection
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-400">
                Cost: {formatCurrency(p.currentMonthlyCost, true)} → <span className="text-red-600 font-semibold">{formatCurrency(p.projectedMonthlyCost, true)}</span>
              </span>
              <span className="text-gray-400">
                ROI: {formatROI(p.currentROI)} → <span className="text-red-600 font-semibold">{formatROI(p.projectedROI)}</span>
              </span>
            </div>
            {showProjection ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </button>

        {showProjection && (
          <div className="px-4 pb-4 border-t border-border">
            <div className="grid grid-cols-4 gap-4 mt-3">
              <div className="rounded-lg bg-red-50 border border-red-100 p-3">
                <p className="text-[10px] uppercase tracking-wider text-red-400">Projected Cost</p>
                <p className="text-lg font-semibold text-red-700 font-mono mt-1">{formatCurrency(p.projectedMonthlyCost, true)}<span className="text-xs font-normal text-red-400">/mo</span></p>
                <p className="text-[10px] text-red-400 mt-0.5">+{formatCurrency(p.projectedMonthlyCost - p.currentMonthlyCost, true)} from current</p>
              </div>
              <div className="rounded-lg bg-red-50 border border-red-100 p-3">
                <p className="text-[10px] uppercase tracking-wider text-red-400">Projected ROI</p>
                <p className="text-lg font-semibold text-red-700 font-mono mt-1">{formatROI(p.projectedROI)}</p>
                <p className="text-[10px] text-red-400 mt-0.5">Down from {formatROI(p.currentROI)}</p>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                <p className="text-[10px] uppercase tracking-wider text-amber-500">Wasted Spend</p>
                <p className="text-lg font-semibold text-amber-700 font-mono mt-1">{formatCurrency(p.projectedWastedSpend, true)}</p>
                <p className="text-[10px] text-amber-400 mt-0.5">Over {p.months} months on declining assets</p>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                <p className="text-[10px] uppercase tracking-wider text-amber-500">Value at Risk</p>
                <p className="text-lg font-semibold text-amber-700 font-mono mt-1">{formatCurrency(p.projectedValueAtRisk, true)}<span className="text-xs font-normal text-amber-400">/mo</span></p>
                <p className="text-[10px] text-amber-400 mt-0.5">From expiring declarations</p>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Assumptions</p>
              <ul className="space-y-1">
                {p.assumptions.map((a, i) => (
                  <li key={i} className="text-[11px] text-gray-500 flex items-start gap-2">
                    <span className="text-gray-300 mt-0.5">•</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3 pt-3 border-t border-border flex items-center gap-3">
              <Button size="sm" className="text-xs h-8 bg-gray-900 hover:bg-gray-800">
                Take action on recommendations
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
              <span className="text-[10px] text-gray-400">
                Projections recalculate daily based on real cost and usage data
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
