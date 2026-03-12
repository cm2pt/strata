"use client";

import { cn } from "@/lib/utils";
import type { DecisionStatus } from "@/lib/types";
import { Clock, CheckCircle2, XCircle, PauseCircle } from "lucide-react";

const config: Record<DecisionStatus, { label: string; icon: typeof Clock; className: string }> = {
  under_review: {
    label: "Under Review",
    icon: Clock,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  delayed: {
    label: "Delayed",
    icon: PauseCircle,
    className: "bg-orange-50 text-orange-700 border-orange-200",
  },
};

export function DecisionStatusBadge({
  status,
  size = "sm",
  className: extraClass,
}: {
  status: DecisionStatus;
  size?: "xs" | "sm";
  className?: string;
}) {
  const c = config[status];
  const Icon = c.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        c.className,
        extraClass
      )}
    >
      <Icon className={size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {c.label}
    </span>
  );
}
