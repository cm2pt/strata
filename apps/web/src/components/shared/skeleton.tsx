"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// ============================================================
// Strata — Skeleton Loading Components
// Consistent pulse-animated placeholders for every page state
// ============================================================

interface SkeletonBarProps {
  className?: string;
}

/** Base shimmer bar — compose for custom layouts */
export function SkeletonBar({ className }: SkeletonBarProps) {
  return (
    <div
      className={cn("animate-shimmer rounded", className)}
    />
  );
}

// ── KPI Skeleton ────────────────────────────────────────────

interface KPISkeletonProps {
  className?: string;
}

/** Mimics KPICard: label + value + trend */
export function KPISkeleton({ className }: KPISkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        className,
      )}
    >
      {/* Label */}
      <SkeletonBar className="h-3 w-20 mb-3" />
      {/* Value */}
      <SkeletonBar className="h-7 w-28 mb-2" />
      {/* Sparkline placeholder */}
      <SkeletonBar className="h-6 w-12 mb-1.5 rounded-sm" />
      {/* Trend */}
      <SkeletonBar className="h-3 w-16" />
    </div>
  );
}

// ── Card Skeleton ───────────────────────────────────────────

interface CardSkeletonProps {
  /** Number of content lines to show (default 4) */
  lines?: number;
  className?: string;
}

/** Mimics a content card: title bar + N shimmer lines */
export function CardSkeleton({ lines = 4, className }: CardSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        className,
      )}
    >
      {/* Title */}
      <SkeletonBar className="h-4 w-36 mb-1.5" />
      {/* Subtitle */}
      <SkeletonBar className="h-3 w-52 mb-5" />
      {/* Content lines */}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBar
            key={i}
            className={cn(
              "h-3",
              i === lines - 1 ? "w-3/5" : "w-full",
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ── Table Skeleton ──────────────────────────────────────────

interface TableSkeletonProps {
  /** Number of data rows (default 5) */
  rows?: number;
  /** Number of columns (default 4) */
  columns?: number;
  className?: string;
}

/** Mimics a data table: header row + N data rows × M columns */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: TableSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden",
        className,
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-4 border-b border-border bg-gray-50/50 px-6 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBar
            key={i}
            className={cn(
              "h-2.5",
              i === 0 ? "w-32" : "w-20",
              "flex-shrink-0",
            )}
          />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className={cn(
            "flex items-center gap-4 px-6 py-3.5",
            r < rows - 1 && "border-b border-border/50",
          )}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <SkeletonBar
              key={c}
              className={cn(
                "h-3",
                c === 0 ? "w-36" : "w-16",
                "flex-shrink-0",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Loading Timeout ────────────────────────────────────────

/**
 * Shows a "taking longer than expected" message after a timeout.
 * Wrap around skeleton content to provide feedback on slow loads.
 */
export function LoadingTimeout({
  children,
  timeoutMs = 10_000,
  message = "Taking longer than expected\u2026",
}: {
  children: React.ReactNode;
  timeoutMs?: number;
  message?: string;
}) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [timeoutMs]);

  return (
    <>
      {children}
      {timedOut && (
        <p className="text-sm text-gray-400 text-center mt-4 animate-in fade-in">{message}</p>
      )}
    </>
  );
}
