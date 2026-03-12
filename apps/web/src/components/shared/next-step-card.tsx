"use client";

import { cn } from "@/lib/utils";
import { statusColors } from "@/lib/tokens";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface NextStepCardProps {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  className?: string;
}

/**
 * Directional navigation card that guides users through the Strata workflow.
 * Uses the positive (teal) variant for a calm, forward-looking tone.
 */
export function NextStepCard({ title, description, href, ctaLabel, className }: NextStepCardProps) {
  const colors = statusColors.positive;

  return (
    <Link href={href} className="block group">
      <div className={cn(
        "rounded-lg border p-3 transition-shadow hover:shadow-[0_4px_12px_rgba(20,15,10,0.06)]",
        colors.bg,
        colors.border,
        className,
      )}>
        <div className="flex items-start gap-2">
          <ArrowRight className={cn("h-4 w-4 mt-0.5 flex-shrink-0 transition-transform group-hover:translate-x-0.5", colors.icon)} />
          <div className="min-w-0 flex-1">
            <p className={cn("text-xs font-medium", colors.text)}>{title}</p>
            <p className={cn("text-[11px] mt-1 opacity-80", colors.text)}>{description}</p>
          </div>
          <span className={cn(
            "text-[11px] font-medium flex-shrink-0 flex items-center gap-1 transition-colors",
            colors.text,
            "opacity-70 group-hover:opacity-100",
          )}>
            {ctaLabel}
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
