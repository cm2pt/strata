"use client";

import { cn } from "@/lib/utils";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Optional error code for support reference */
  errorCode?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Consistent error display with optional retry action.
 * Includes error code, "What you can try" guidance, and timestamp.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "An error occurred while loading this data.",
  errorCode,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-red-200 bg-gradient-to-b from-red-50 to-white p-8 text-center flex flex-col items-center justify-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
        <AlertCircle className="h-6 w-6 text-red-500" />
      </div>
      <h3 className="text-sm font-semibold text-red-900">{title}</h3>
      <p className="text-xs text-red-700/80 mt-1.5 max-w-sm">{description}</p>

      {/* What you can try */}
      <div className="mt-4 text-left max-w-xs">
        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-1.5">What you can try</p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>Refresh the page</li>
          <li>Check your network connection</li>
          {onRetry && <li>Click the retry button below</li>}
        </ul>
      </div>

      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-5 text-xs gap-1.5 border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800"
          onClick={onRetry}
        >
          <RefreshCw className="h-3 w-3" />
          Try again
        </Button>
      )}

      {/* Error code + timestamp */}
      <div className="mt-4 flex items-center gap-3 text-[10px] text-gray-300">
        {errorCode && <span>Code: {errorCode}</span>}
        <span>{new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
