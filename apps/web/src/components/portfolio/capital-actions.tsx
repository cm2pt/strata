"use client";

import { cn } from "@/lib/utils";
import { card, typography, brand } from "@/lib/tokens";
import { formatCurrency } from "@/lib/format";
import type { CapitalActionCard } from "@/lib/types";
import { ArrowRight, Trash2, Shuffle, DollarSign, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface CapitalActionsProps {
  actions: CapitalActionCard[];
  className?: string;
}

const typeConfig: Record<
  CapitalActionCard["type"],
  { icon: typeof Trash2; label: string; color: string }
> = {
  retire: { icon: Trash2, label: "Retire", color: "text-red-600" },
  reallocate: { icon: Shuffle, label: "Reallocate", color: "text-blue-600" },
  price: { icon: DollarSign, label: "Price", color: "text-teal-600" },
  review_ai: { icon: Brain, label: "AI Review", color: "text-purple-600" },
};

const statusDot: Record<CapitalActionCard["status"], string> = {
  actionable: "bg-emerald-500",
  in_progress: "bg-amber-500",
  blocked: "bg-red-500",
};

// ─── Standalone Card Item ─────────────────────────────────────────────────────

interface CapitalActionCardItemProps {
  action: CapitalActionCard;
  className?: string;
}

/**
 * Renders a single capital action card.
 * Exported for reuse in the promoted actions grid on the portfolio page.
 */
export function CapitalActionCardItem({ action, className }: CapitalActionCardItemProps) {
  const cfg = typeConfig[action.type];
  const Icon = cfg.icon;
  const isAvoidance = action.type === "review_ai" || action.type === "retire";

  return (
    <div
      className={cn(
        card.base,
        card.hover,
        "p-4 flex flex-col gap-3",
        className,
      )}
    >
      {/* Top: Impact + type badge */}
      <div className="flex items-start justify-between">
        <div>
          <p
            className={cn(
              "text-lg font-semibold font-mono tabular-nums",
              isAvoidance ? "text-amber-700" : "text-teal-700",
            )}
          >
            {isAvoidance ? "−" : "+"}
            {formatCurrency(action.capitalImpactMonthly, true)}
            <span className="text-xs font-normal text-gray-400">
              /mo
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              statusDot[action.status],
            )}
          />
          <div
            className={cn(
              "flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider",
              cfg.color,
            )}
          >
            <Icon className="h-3 w-3" />
            {cfg.label}
          </div>
        </div>
      </div>

      {/* Middle: Title + description */}
      <div className="flex-1 min-h-0">
        <p className="text-sm font-semibold text-gray-900 leading-snug">
          {action.title}
        </p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
          {action.description}
        </p>
      </div>

      {/* Bottom: Confidence + approver + CTA */}
      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: brand.borderSubtle }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-medium text-gray-400 tabular-nums">
            {Math.round(action.confidence * 100)}% conf
          </span>
          <span className="text-[10px] text-gray-300">·</span>
          <span className="text-[10px] text-gray-400 truncate">
            {action.requiredApprover}
          </span>
        </div>
        <Link href={action.reviewHref}>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 gap-1 flex-shrink-0"
          >
            Review
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Horizontal Scrollable Strip ──────────────────────────────────────────────

export function CapitalActions({ actions, className }: CapitalActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p className={cn(typography.metricLabel, "px-1")}>Capital Actions</p>
      <div className="flex gap-4 overflow-x-auto pb-1 snap-x snap-mandatory -mx-1 px-1">
        {actions.map((action) => (
          <CapitalActionCardItem
            key={action.id}
            action={action}
            className="w-72 flex-shrink-0 snap-start"
          />
        ))}
      </div>
    </div>
  );
}
