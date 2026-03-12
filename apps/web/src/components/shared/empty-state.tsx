"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Consistent empty state pattern — subtle gradient background with icon,
 * title, optional description, and optional action button.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-gradient-to-b from-gray-50/80 to-white p-12 text-center flex flex-col items-center justify-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
        <Icon className="h-6 w-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      {description && (
        <p className="text-xs text-gray-400 mt-1.5 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
