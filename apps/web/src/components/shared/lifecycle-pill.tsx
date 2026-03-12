"use client";

import { cn } from "@/lib/utils";
import type { LifecycleStage } from "@/lib/types";

const stageConfig: Record<LifecycleStage, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
  active: { label: "Active", className: "bg-blue-50 text-blue-700" },
  growth: { label: "Growth", className: "bg-emerald-50 text-emerald-700" },
  mature: { label: "Mature", className: "bg-teal-50 text-teal-700" },
  decline: { label: "Decline", className: "bg-amber-50 text-amber-700" },
  retired: { label: "Retired", className: "bg-gray-100 text-gray-500" },
};

const stageDot: Record<LifecycleStage, string> = {
  draft: "bg-gray-400",
  active: "bg-blue-500",
  growth: "bg-emerald-500",
  mature: "bg-teal-500",
  decline: "bg-amber-500",
  retired: "bg-gray-400",
};

export function LifecyclePill({
  stage,
  size = "sm",
  className,
}: {
  stage: LifecycleStage;
  size?: "xs" | "sm";
  className?: string;
}) {
  const config = stageConfig[stage];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        config.className,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", stageDot[stage])} />
      {config.label}
    </span>
  );
}
