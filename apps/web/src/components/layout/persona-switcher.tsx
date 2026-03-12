"use client";

/**
 * PersonaSwitcher — Quick persona switch for demo mode.
 *
 * Renders a compact dropdown in the sidebar footer that lets the demo
 * narrator switch personas in one click without returning to the login
 * page. Only renders when NEXT_PUBLIC_DEMO_MODE=true.
 *
 * Tier 1 & 2 personas appear as quick-switch options; an "All personas"
 * link navigates back to the full login page for Tier 3 access.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { getSeedPersonas } from "@/lib/auth/demo-personas";
import { ChevronUp, ArrowRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { brand } from "@/lib/tokens";
import type { DemoPersona } from "@/lib/types";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

/* Tier 1 + Tier 2 personas — the ones we want for quick-switch */
const QUICK_SWITCH_ROLES = new Set([
  "cfo", "cdo", "product_owner",
  "fpa_analyst", "head_of_ai", "governance_steward",
]);

/* Pastel avatar colors (matching sidebar) */
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
];
function avatarColor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/* Route label mapping (for display) */
const ROUTE_LABELS: Record<string, string> = {
  "/capital-impact": "Capital Impact",
  "/portfolio": "Portfolio",
  "/allocation": "Allocation",
  "/assets": "Assets",
  "/lifecycle": "Lifecycle",
  "/setup": "Setup",
  "/candidates": "Candidates",
  "/ai-scorecard": "AI Scorecard",
  "/marketplace": "Marketplace",
  "/decisions": "Decisions",
  "/simulate": "Simulate",
};

interface PersonaSwitcherProps {
  collapsed?: boolean;
}

export function PersonaSwitcher({ collapsed = false }: PersonaSwitcherProps) {
  const router = useRouter();
  const { user, demoLogin } = useAuth();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  if (!DEMO_MODE || !user) return null;

  const allPersonas = getSeedPersonas();
  const quickPersonas = allPersonas.filter((p) => QUICK_SWITCH_ROLES.has(p.roleId));
  const currentRole = user.role;

  async function handleSwitch(persona: DemoPersona) {
    if (persona.roleId === currentRole) {
      setOpen(false);
      return;
    }
    setSwitching(persona.roleId);
    try {
      const u = await demoLogin(persona.roleId);
      const target = u.roleMeta?.defaultFocusRoute ?? "/portfolio";
      router.replace(target);
      setOpen(false);
    } catch {
      // Fallback: redirect to login
      router.push("/login");
    } finally {
      setSwitching(null);
    }
  }

  // Collapsed mode: just show a small button
  if (collapsed) {
    return (
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors hover:ring-2 hover:ring-teal-200"
        title="Switch persona"
      >
        <div className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold", avatarColor(user.name ?? "User"))}>
          {initials(user.name ?? "User")}
        </div>
      </button>
    );
  }

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all",
          "hover:bg-gray-50",
          open && "bg-gray-50",
        )}
      >
        <div className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold flex-shrink-0", avatarColor(user.name ?? "User"))}>
          {initials(user.name ?? "User")}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-medium text-gray-700 truncate">{user.name}</span>
          <span className="text-[10px] text-gray-400 truncate">{user.roleMeta?.displayName ?? user.role}</span>
        </div>
        <ChevronUp
          className={cn(
            "h-3.5 w-3.5 text-gray-400 transition-transform flex-shrink-0",
            open ? "rotate-0" : "rotate-180",
          )}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div
            className="absolute bottom-full left-0 right-0 z-50 mb-1 rounded-xl border bg-white shadow-lg overflow-hidden"
            style={{ borderColor: brand.borderLight }}
          >
            {/* Header */}
            <div className="px-3 pt-3 pb-2">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" style={{ color: brand.slate }} />
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: brand.slate }}>
                  Switch Persona
                </span>
              </div>
            </div>

            {/* Quick-switch personas (Tier 1 + 2) */}
            <div className="px-1.5 pb-1.5 max-h-[320px] overflow-y-auto">
              {quickPersonas.map((p) => {
                const isCurrent = p.roleId === currentRole;
                const isSwitching = switching === p.roleId;
                return (
                  <button
                    key={p.roleId}
                    onClick={() => handleSwitch(p)}
                    disabled={switching !== null}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all",
                      "disabled:opacity-50 disabled:cursor-wait",
                      isCurrent
                        ? "bg-teal-50 border border-teal-200"
                        : "hover:bg-gray-50 border border-transparent",
                    )}
                  >
                    <div className={cn("flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-semibold flex-shrink-0", avatarColor(p.roleId))}>
                      {initials(p.name ?? p.displayName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-800 truncate">
                          {p.displayName}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-medium text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                        {isSwitching && (
                          <div className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-gray-700" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[10px]" style={{ color: brand.slate }}>
                        <span className="truncate">{p.name}</span>
                        <span style={{ color: brand.borderLight }}>&middot;</span>
                        <span className="font-medium" style={{ color: brand.accentGreen }}>
                          {ROUTE_LABELS[p.defaultFocusRoute] || p.defaultFocusRoute}
                        </span>
                      </div>
                    </div>
                    {!isCurrent && (
                      <ArrowRight className="h-3 w-3 text-gray-300 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* All personas link */}
            <div className="border-t px-3 py-2" style={{ borderColor: brand.borderSubtle }}>
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/login");
                }}
                className="w-full text-[11px] text-center font-medium transition-colors hover:text-teal-800"
                style={{ color: brand.accentGreen }}
              >
                All {allPersonas.length} personas →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
