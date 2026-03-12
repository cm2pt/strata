"use client";

import { useState, useEffect } from "react";
import { isAPIEnabled } from "@/lib/api/client";
import { AlertTriangle, X } from "lucide-react";

const DISMISSED_KEY = "strata_demo_banner_dismissed";

/**
 * Persistent amber banner shown when running in offline demo mode.
 * Renders nothing when a real API backend is configured.
 * Dismissible per session via sessionStorage.
 */
export function DemoModeBanner() {
  const [dismissed, setDismissed] = useState(true); // Start hidden to avoid flash

  useEffect(() => {
    if (isAPIEnabled) return;
    const stored = sessionStorage.getItem(DISMISSED_KEY);
    setDismissed(stored === "true");
  }, []);

  if (isAPIEnabled || dismissed) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-800 relative">
      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
      <span>
        <strong className="font-semibold">Demo Mode</strong> — viewing sample
        data with synthetic portfolios.{" "}
        <button
          className="underline hover:text-amber-900 font-medium transition-colors"
          onClick={() => window.open("mailto:demo@strata.dev?subject=Strata%20Demo%20Request&body=I%27d%20like%20to%20see%20Strata%20with%20our%20organization%27s%20data.", "_blank")}
        >
          Request a demo with your data
        </button>
      </span>
      <button
        onClick={() => {
          setDismissed(true);
          sessionStorage.setItem(DISMISSED_KEY, "true");
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 hover:text-amber-600 transition-colors"
        aria-label="Dismiss demo mode banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
