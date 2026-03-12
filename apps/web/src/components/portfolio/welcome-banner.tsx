"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { X, Sparkles } from "lucide-react";

const STORAGE_KEY = "strata_welcome_dismissed";

/**
 * A dismissible welcome banner shown on the first visit to the Portfolio page.
 * Persists dismissal in localStorage so it never reappears.
 */
export function WelcomeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }

  if (!visible) return null;

  return (
    <div className={cn(
      "rounded-lg border p-4 flex items-start gap-3",
      "bg-teal-50/50 border-teal-200",
    )}>
      <Sparkles className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-teal-900">Welcome to Strata</p>
        <p className="text-xs text-teal-700 mt-0.5 leading-relaxed">
          Your portfolio summary is below. Start by reviewing the capital actions that need your attention.
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="text-teal-400 hover:text-teal-600 transition-colors flex-shrink-0"
        aria-label="Dismiss welcome message"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
