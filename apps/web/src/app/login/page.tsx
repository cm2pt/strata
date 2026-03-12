"use client";

/**
 * Login page — institutional auth UI with demo persona selector.
 *
 * The "Demo environment" panel only renders when NEXT_PUBLIC_DEMO_MODE=true.
 * Each persona button is styled as a premium, intentional role switcher.
 * Trust cues and security microcopy reinforce enterprise positioning.
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { apiGet, isAPIEnabled } from "@/lib/api/client";
import { getSeedPersonas } from "@/lib/auth/demo-personas";
import { StrataLogo } from "@/components/shared/strata-logo";
import { brand } from "@/lib/tokens";
import { Shield, ArrowRight } from "lucide-react";
import type { DemoPersona } from "@/lib/types";

/**
 * Validate a redirect path to prevent open-redirect attacks.
 * Only allows same-origin relative paths (starts with "/" but not "//").
 * Returns the path if safe, otherwise falls back to the default route.
 */
function safeRedirect(path: string | null | undefined, fallback = "/portfolio"): string {
  if (!path || typeof path !== "string") return fallback;
  // Must start with "/" and must NOT start with "//" (protocol-relative URL)
  if (path.startsWith("/") && !path.startsWith("//")) return path;
  return fallback;
}

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

/* Route label mapping for display under persona buttons */
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

/* Simple two-letter initials from a name */
function initials(name: string | null): string {
  if (!name) return "??";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/* Muted institutional colors for persona avatars */
const AVATAR_STYLES = [
  { bg: "#EEF2FF", text: "#4338CA" },
  { bg: "#ECFDF5", text: "#065F46" },
  { bg: "#FEF3C7", text: "#92400E" },
  { bg: "#FFF1F2", text: "#9F1239" },
  { bg: "#F0F9FF", text: "#0C4A6E" },
  { bg: "#FAF5FF", text: "#6B21A8" },
  { bg: "#F0FDFA", text: "#134E4A" },
  { bg: "#FFF7ED", text: "#9A3412" },
  { bg: "#F8FAFC", text: "#334155" },
  { bg: "#FFFBEB", text: "#78350F" },
  { bg: "#EFF6FF", text: "#1E40AF" },
  { bg: "#FDF4FF", text: "#86198F" },
  { bg: "#F0FDF4", text: "#166534" },
  { bg: "#FEF2F2", text: "#991B1B" },
];
function avatarStyle(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return AVATAR_STYLES[Math.abs(h) % AVATAR_STYLES.length];
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: brand.offWhite }}>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, login, demoLogin } = useAuth();

  // Check for redirect/callbackUrl query parameter (validated for safety)
  const redirectParam = searchParams.get("redirect") || searchParams.get("callbackUrl");

  // If already authenticated, redirect to focus route
  useEffect(() => {
    if (!authLoading && user) {
      const target = safeRedirect(redirectParam || user.roleMeta?.defaultFocusRoute);
      router.replace(target);
    }
  }, [authLoading, user, router, redirectParam]);

  // Email/password form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Demo personas — always start with seed data so the list is visible
  // immediately. If the backend has a /auth/demo-personas endpoint, we
  // silently upgrade to those (they may have richer metadata).
  const [personas, setPersonas] = useState<DemoPersona[]>(
    () => DEMO_MODE ? getSeedPersonas() : [],
  );
  const [personasLoading] = useState(false);
  const [demoLoggingIn, setDemoLoggingIn] = useState<string | null>(null);

  // Optionally upgrade to API personas (silent — seed data already visible)
  useEffect(() => {
    if (!DEMO_MODE || !isAPIEnabled) return;
    apiGet<DemoPersona[]>("/auth/demo-personas")
      .then((apiPersonas) => {
        if (Array.isArray(apiPersonas) && apiPersonas.length > 0) {
          setPersonas(apiPersonas);
        }
      })
      .catch(() => {
        // API unavailable — keep seed personas (already displayed)
      });
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const u = await login(email, password);
      router.replace(safeRedirect(redirectParam || u.roleMeta?.defaultFocusRoute));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDemoLogin(roleId: string) {
    setError(null);
    setDemoLoggingIn(roleId);
    try {
      const u = await demoLogin(roleId);
      router.replace(safeRedirect(redirectParam || u.roleMeta?.defaultFocusRoute));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Demo login failed");
    } finally {
      setDemoLoggingIn(null);
    }
  }

  // Don't render until auth state is resolved
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: brand.offWhite }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  // Already logged in — will redirect via useEffect
  if (user) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: brand.offWhite }}>
      {/* Top bar */}
      <div className="px-6 py-5">
        <StrataLogo variant="full" theme="light" size="sm" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8">
          {/* ── Left: Login form ──────────────────────────────────────── */}
          <div className="flex-1 max-w-md mx-auto lg:mx-0">
            <div className="rounded-xl border bg-white p-8" style={{ borderColor: brand.borderLight }}>
              <div className="mb-8">
                <h1 className="text-xl font-semibold tracking-tight" style={{ color: brand.graphite }}>
                  Sign in to Strata
                </h1>
                <p className="text-sm mt-1" style={{ color: brand.slate }}>
                  Access your data capital management console.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: brand.graphite }}>
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-institutional w-full rounded-lg border px-3.5 py-2.5 text-sm placeholder-gray-400"
                    style={{ borderColor: brand.borderLight, color: brand.graphite }}
                    placeholder="you@company.com"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: brand.graphite }}>
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-institutional w-full rounded-lg border px-3.5 py-2.5 text-sm placeholder-gray-400"
                    style={{ borderColor: brand.borderLight, color: brand.graphite }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 flex items-start gap-2">
                    <div className="h-4 w-4 mt-0.5 flex-shrink-0 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-red-600 text-xs font-bold">!</span>
                    </div>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-interactive w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: brand.deepNavy }}
                >
                  {submitting ? "Authenticating..." : "Sign in"}
                </button>
              </form>

              {/* Trust cues */}
              <div className="mt-6 pt-5" style={{ borderTop: `1px solid ${brand.borderSubtle}` }}>
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5" style={{ color: brand.slate }} />
                  <p className="text-[11px]" style={{ color: brand.slate }}>
                    256-bit encrypted session &middot; SOC 2 compliant &middot; Auto-expire after 24h inactivity
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Demo persona selector ─────────────────────────── */}
          {DEMO_MODE && (
            <div className="flex-1 max-w-lg mx-auto lg:mx-0">
              <div className="rounded-xl border bg-white p-6" style={{ borderColor: brand.borderLight }}>
                {/* Header */}
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="flex h-5 w-5 items-center justify-center rounded" style={{ backgroundColor: `${brand.accentGreen}15` }}>
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: brand.accentGreen }} />
                  </div>
                  <h2 className="text-sm font-semibold" style={{ color: brand.graphite }}>
                    Demo Environment
                  </h2>
                </div>
                <p className="text-xs mb-5" style={{ color: brand.slate }}>
                  Select a persona to explore role-specific capital governance views with sample data.
                </p>

                {personasLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
                  </div>
                ) : personas.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: brand.slate }}>
                    No personas available. Check demo mode configuration.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-[520px] overflow-y-auto">
                    {personas.map((p, idx) => {
                      const av = avatarStyle(p.roleId);
                      // Tier section headers based on ordered persona list
                      const tierLabel =
                        idx === 0 ? "Deal Makers" :
                        idx === 3 ? "Deal Accelerators" :
                        idx === 6 ? "Supporting Roles" :
                        null;
                      return (
                        <div key={p.roleId}>
                          {tierLabel && (
                            <div className={`flex items-center gap-2 ${idx === 0 ? "mb-1" : "mt-3 mb-1"}`}>
                              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: brand.slate }}>
                                {tierLabel}
                              </p>
                              <div className="flex-1 h-px" style={{ backgroundColor: brand.borderSubtle }} />
                            </div>
                          )}
                        <button
                          onClick={() => handleDemoLogin(p.roleId)}
                          disabled={demoLoggingIn !== null}
                          className="w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all disabled:opacity-50 disabled:cursor-wait group hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                          style={{
                            borderColor: demoLoggingIn === p.roleId ? brand.accentGreen : brand.borderSubtle,
                            backgroundColor: demoLoggingIn === p.roleId ? `${brand.accentGreen}05` : "white",
                          }}
                        >
                          {/* Avatar */}
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold flex-shrink-0"
                            style={{ backgroundColor: av.bg, color: av.text }}
                          >
                            {initials(p.name)}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate" style={{ color: brand.graphite }}>
                                {p.displayName}
                              </span>
                              {demoLoggingIn === p.roleId && (
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border border-gray-300 border-t-gray-700" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: brand.slate }}>
                              {p.name && <span>{p.name}</span>}
                              {p.name && <span style={{ color: brand.borderLight }}>&middot;</span>}
                              <span className="font-medium" style={{ color: brand.accentGreen }}>
                                {ROUTE_LABELS[p.defaultFocusRoute] || p.defaultFocusRoute}
                              </span>
                            </div>
                          </div>

                          {/* Arrow */}
                          <ArrowRight
                            className="h-3.5 w-3.5 flex-shrink-0 transition-all opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
                            style={{ color: brand.slate }}
                          />
                        </button>
                      </div>
                      );
                    })}
                  </div>
                )}

                {/* Demo trust note */}
                <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${brand.borderSubtle}` }}>
                  <p className="text-[11px]" style={{ color: brand.slate }}>
                    Demo sessions use synthetic data. No production data is accessed.
                    Sessions expire after 24 hours.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
