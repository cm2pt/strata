"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Standardised section header used inside cards and page sections.
 * Always uses `text-sm font-semibold` for title, `text-xs text-gray-400` for subtitle.
 * Optional leading icon badge and trailing action slot.
 */
export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  iconColor = "text-gray-600",
  iconBg = "bg-gray-100",
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between mb-4", className)}>
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0", iconBg)}>
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
        )}
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0 ml-3">{action}</div>}
    </div>
  );
}
