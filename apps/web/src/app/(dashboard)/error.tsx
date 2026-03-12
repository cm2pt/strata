"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { PageShell } from "@/components/shared/page-shell";

/**
 * Route-level error boundary for the (dashboard) layout group.
 *
 * Catches unhandled runtime errors in any dashboard page and renders
 * a user-friendly ErrorState instead of a blank white screen.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in development; replace with your error service in production
    console.error("[Dashboard Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <PageShell className="max-w-lg">
        <ErrorState
          title="Something went wrong"
          description={
            error.message ||
            "An unexpected error occurred. Please try again or contact support if the issue persists."
          }
          onRetry={reset}
        />
      </PageShell>
    </div>
  );
}
