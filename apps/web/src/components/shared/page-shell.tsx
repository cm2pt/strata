"use client";

import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Consistent page wrapper: horizontal padding, vertical padding,
 * section spacing, and max-width cap.
 */
export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={cn("px-8 py-8 space-y-7 max-w-[1440px] mx-auto", className)}>
      {children}
    </div>
  );
}
