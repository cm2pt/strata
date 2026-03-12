"use client";

/**
 * PersonaWelcomeBanner — Role-specific welcome insight on first visit.
 *
 * Shows a one-line, data-driven greeting when a persona lands on their
 * home page for the first time in a session. Dismissed on click and
 * does not reappear during the session (uses sessionStorage, NOT
 * localStorage, so it returns on next login — great for demos).
 *
 * Each persona gets a tailored message that reinforces their aha moment.
 */

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { X, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/context";

const SESSION_KEY_PREFIX = "strata_persona_welcome_";
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

interface PersonaWelcomeBannerProps {
  /** The page route, used to match persona-specific messaging */
  page: string;
  /** Optional dynamic data to interpolate into messages */
  data?: {
    totalSavings?: number;
    productCount?: number;
    decisionCount?: number;
    aiProjectsFlagged?: number;
    aiCriticalCount?: number;
    compositeValue?: number;
    portfolioCost?: number;
  };
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

/**
 * Get persona-specific welcome copy based on role + page + data.
 */
function getWelcomeMessage(
  roleId: string | undefined,
  name: string | undefined,
  page: string,
  data?: PersonaWelcomeBannerProps["data"],
): { title: string; subtitle: string } | null {
  const firstName = name?.split(" ")[0] ?? "there";

  // CFO on Capital Impact
  if (roleId === "cfo" && page === "/capital-impact") {
    const savings = data?.totalSavings ? formatCompact(data.totalSavings) : "$360K";
    return {
      title: `Welcome, ${firstName}`,
      subtitle: `Your data portfolio generated ${savings} in annualized capital recovery this quarter. Review the breakdown below.`,
    };
  }

  // CDO on Portfolio
  if (roleId === "cdo" && page === "/portfolio") {
    const count = data?.productCount ?? 13;
    const decisions = data?.decisionCount ?? 3;
    return {
      title: `Welcome, ${firstName}`,
      subtitle: `${count} products under management. ${decisions} require lifecycle decisions this period.`,
    };
  }

  // Product Owner on Assets
  if (roleId === "product_owner" && page === "/assets") {
    const value = data?.compositeValue ? formatCompact(data.compositeValue) : "$28K";
    return {
      title: `Welcome, ${firstName}`,
      subtitle: `Your products generated ${value} in composite value this month. Review cost trends and consumer activity below.`,
    };
  }

  // Head of AI on AI Scorecard
  if (roleId === "head_of_ai" && page === "/ai-scorecard") {
    const flagged = data?.aiProjectsFlagged ?? 3;
    const critical = data?.aiCriticalCount ?? 1;
    return {
      title: `Welcome, ${firstName}`,
      subtitle: `${flagged} AI project${flagged !== 1 ? "s" : ""} flagged for governance review. ${critical} critical.`,
    };
  }

  // FP&A on Allocation
  if (roleId === "fpa_analyst" && page === "/allocation") {
    const cost = data?.portfolioCost ? formatCompact(data.portfolioCost) : "$180K";
    return {
      title: `Welcome, ${firstName}`,
      subtitle: `Total portfolio spend is ${cost}/mo across all domains. Review allocation efficiency and rebalancing opportunities below.`,
    };
  }

  // Governance Steward on Lifecycle
  if (roleId === "governance_steward" && page === "/lifecycle") {
    return {
      title: `Welcome, ${firstName}`,
      subtitle: `Review lifecycle health across all managed products. Flag products for retirement or certification below.`,
    };
  }

  // Executive Sponsor on Portfolio
  if (roleId === "executive_sponsor" && page === "/portfolio") {
    const count = data?.productCount ?? 13;
    return {
      title: `Welcome, ${firstName}`,
      subtitle: `${count}-product portfolio under strategic oversight. Review capital actions and board-ready metrics below.`,
    };
  }

  // Generic fallback for any role on any supported page
  return null;
}

export function PersonaWelcomeBanner({ page, data }: PersonaWelcomeBannerProps) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  const roleId = user?.role;
  const sessionKey = `${SESSION_KEY_PREFIX}${roleId}_${page}`;

  useEffect(() => {
    if (!DEMO_MODE || !user) return;
    if (typeof window !== "undefined" && !sessionStorage.getItem(sessionKey)) {
      setVisible(true);
    }
  }, [user, sessionKey]);

  function handleDismiss() {
    setVisible(false);
    sessionStorage.setItem(sessionKey, "1");
  }

  if (!visible || !user) return null;

  const message = getWelcomeMessage(roleId, user.name, page, data);
  if (!message) return null;

  return (
    <div className={cn(
      "rounded-lg border p-4 flex items-start gap-3",
      "bg-teal-50/50 border-teal-200",
    )}>
      <Sparkles className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-teal-900">{message.title}</p>
        <p className="text-xs text-teal-700 mt-0.5 leading-relaxed">
          {message.subtitle}
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
