"use client";

import { cn } from "@/lib/utils";
import { statusColors } from "@/lib/tokens";
import type { LucideIcon } from "lucide-react";

type Variant = keyof typeof statusColors;

interface InsightCalloutProps {
  variant: Variant;
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Colored callout box used for AI insights, alerts, and status messages.
 * Uses consistent token-based coloring.
 */
export function InsightCallout({
  variant,
  icon: Icon,
  title,
  description,
  action,
  className,
}: InsightCalloutProps) {
  const colors = statusColors[variant];

  return (
    <div className={cn("rounded-lg border p-3", colors.bg, colors.border, className)}>
      <div className="flex items-start gap-2">
        <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", colors.icon)} />
        <div className="min-w-0">
          <p className={cn("text-xs font-medium", colors.text)}>{title}</p>
          <p className={cn("text-[11px] mt-1 opacity-80", colors.text)}>{description}</p>
          {action && <div className="mt-1.5">{action}</div>}
        </div>
      </div>
    </div>
  );
}
