"use client";

import { cn } from "@/lib/utils";
import { card, typography, brand } from "@/lib/tokens";
import { formatCurrency, formatPercent } from "@/lib/format";
import { CoverageBar } from "@/components/shared/coverage-bar";
import { ConfidenceIndicator } from "@/components/shared/confidence-indicator";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CapitalModel, DecisionQueueRow, DecisionType } from "@/lib/types";
import {
  Target,
  ArrowRight,
  Trash2,
  Search,
  RefreshCw,
  TrendingDown,
  Shuffle,
  DollarSign,
  Brain,
  AlertTriangle,
  Info,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

interface DecisionCockpitProps {
  model: CapitalModel;
  className?: string;
}

const decisionTypeConfig: Record<
  DecisionType,
  { icon: typeof Trash2; label: string; color: string; bg: string }
> = {
  retirement: { icon: Trash2, label: "Retire", color: "text-red-600", bg: "bg-red-50" },
  cost_investigation: { icon: Search, label: "Cost", color: "text-amber-600", bg: "bg-amber-50" },
  value_revalidation: { icon: RefreshCw, label: "Revalidate", color: "text-blue-600", bg: "bg-blue-50" },
  low_roi_review: { icon: TrendingDown, label: "Low ROI", color: "text-amber-600", bg: "bg-amber-50" },
  capital_reallocation: { icon: Shuffle, label: "Reallocate", color: "text-blue-600", bg: "bg-blue-50" },
  pricing_activation: { icon: DollarSign, label: "Price", color: "text-teal-600", bg: "bg-teal-50" },
  ai_project_review: { icon: Brain, label: "AI Review", color: "text-purple-600", bg: "bg-purple-50" },
  portfolio_change: { icon: Shuffle, label: "Portfolio", color: "text-gray-600", bg: "bg-gray-50" },
};

const slaColors: Record<DecisionQueueRow["slaStatus"], string> = {
  on_track: "text-gray-500",
  at_risk: "text-amber-600",
  overdue: "text-red-600",
};

export function DecisionCockpit({ model, className }: DecisionCockpitProps) {
  // Build summary sentence from data
  const pendingCount = model.decisionQueue.length;
  const totalPendingImpact = model.decisionQueue.reduce(
    (sum, row) => sum + row.capitalImpactMonthly,
    0,
  );
  const overdueCount = model.decisionQueue.filter(
    (row) => row.slaStatus === "overdue",
  ).length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: brand.deepNavy }}
          >
            <Target className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Decision Cockpit
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Capital decisions requiring action
            </p>
          </div>
        </div>
        <ConfidenceIndicator
          level={model.confidenceLevel}
          basis={model.confidenceBasis}
        />
      </div>

      {/* Summary sentence */}
      <div
        className={cn(card.base, "px-4 py-3 flex items-start gap-2")}
        style={{ backgroundColor: "#FAFBFC" }}
      >
        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-gray-700 leading-relaxed">
          <span className="font-semibold font-mono">
            {formatCurrency(model.capitalMisallocated, true)}/mo
          </span>{" "}
          is misallocated across{" "}
          <span className="font-semibold">{pendingCount} pending decisions</span>{" "}
          ({formatCurrency(totalPendingImpact, true)}/mo capital at stake).
          {overdueCount > 0 && (
            <>
              {" "}
              <span className="font-semibold text-red-600">
                {overdueCount} overdue
              </span>{" "}
              item{overdueCount > 1 ? "s" : ""} require immediate review.
            </>
          )}
        </p>
      </div>

      {/* Main grid: Table + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Decision Queue table */}
        <div className={cn(card.base, "lg:col-span-3 overflow-hidden")}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={typography.tableHeader}>Type</TableHead>
                  <TableHead className={typography.tableHeader}>
                    Asset
                  </TableHead>
                  <TableHead
                    className={cn(typography.tableHeader, "text-right")}
                  >
                    Capital Impact
                  </TableHead>
                  <TableHead
                    className={cn(typography.tableHeader, "text-right")}
                  >
                    Confidence
                  </TableHead>
                  <TableHead className={typography.tableHeader}>Owner</TableHead>
                  <TableHead
                    className={cn(typography.tableHeader, "text-right")}
                  >
                    SLA
                  </TableHead>
                  <TableHead className={typography.tableHeader} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {model.decisionQueue.map((row) => {
                  const cfg = decisionTypeConfig[row.type];
                  const Icon = cfg.icon;
                  return (
                    <TableRow
                      key={row.decisionId}
                      className="hover:bg-gray-50/50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded",
                              cfg.bg,
                            )}
                          >
                            <Icon className={cn("h-3 w-3", cfg.color)} />
                          </div>
                          <span
                            className={cn(
                              "text-[10px] font-semibold uppercase tracking-wider",
                              cfg.color,
                            )}
                          >
                            {cfg.label}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-gray-900">
                          {row.productName}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "text-sm font-semibold font-mono tabular-nums",
                            row.capitalImpactMonthly > 0
                              ? "text-teal-700"
                              : "text-red-600",
                          )}
                        >
                          {formatCurrency(row.capitalImpactMonthly, true)}
                          <span className="text-xs font-normal text-gray-400">
                            /mo
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-mono tabular-nums text-gray-600">
                          {Math.round(row.confidence * 100)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-700 truncate">
                            {row.owner}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {row.approver}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "text-xs font-semibold font-mono tabular-nums",
                            slaColors[row.slaStatus],
                          )}
                        >
                          {row.slaDays}d
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link href={`/decisions`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 gap-1"
                          >
                            Review
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Coverage & Auditability sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className={cn(card.base, "p-4 space-y-4")}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-gray-400" />
              <p className="text-xs font-semibold text-gray-900">
                Coverage & Auditability
              </p>
            </div>

            {/* Cost coverage */}
            <div>
              <CoverageBar
                value={model.costCoverage}
                label="Cost data coverage"
              />
            </div>

            {/* Value declaration coverage */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">
                  Value coverage
                </p>
                <p className="text-xs font-semibold font-mono tabular-nums text-gray-700">
                  {model.valueCoverage}
                </p>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${model.valueDeclarationCoverage * 100}%`,
                    backgroundColor: brand.accentGreen,
                  }}
                />
              </div>
            </div>

            {/* Decision provenance */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">
                  Decision provenance
                </p>
                <p className="text-xs font-semibold font-mono tabular-nums text-gray-700">
                  {formatPercent(model.decisionProvenance)}
                </p>
              </div>
              <p className="text-[10px] text-gray-400">
                Decisions with owner + evidence
              </p>
            </div>

            {/* Confidence model tooltip */}
            <div className="pt-3 border-t" style={{ borderColor: brand.borderSubtle }}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-gray-600 transition-colors">
                      <Info className="h-3 w-3" />
                      Confidence model
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Confidence is a blend of cost coverage, value evidence,
                      owner attribution, and usage signal. Higher coverage and
                      more declarations increase confidence.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Warning callout */}
            <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Most misallocation sits in low-coverage areas. Improving value
                declarations reduces capital risk.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
