"use client";

/**
 * Strata — Auth Context
 *
 * Provides current user + role metadata to all client components.
 * Handles token persistence, login, logout, and session restoration.
 *
 * The middleware (middleware.ts) checks a `dao_session` cookie to decide
 * whether to redirect to /login. We set/clear that cookie here alongside
 * localStorage so both layers stay in sync.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, setToken, clearToken, setRefreshToken, isAPIEnabled } from "@/lib/api/client";
import { createDemoUser } from "@/lib/auth/demo-personas";
import type { AuthUser, AuthResponse } from "@/lib/types";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const DEMO_USER_KEY = "dao_demo_user";

// ---------------------------------------------------------------------------
// Cookie helpers (thin wrapper — not httpOnly, just a middleware signal)
// ---------------------------------------------------------------------------

function isSecureContext(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:";
}

function setSessionCookie() {
  const secure = isSecureContext() ? "; Secure" : "";
  document.cookie = `dao_session=1; path=/; max-age=86400; SameSite=Strict${secure}`;
}

function clearSessionCookie() {
  const secure = isSecureContext() ? "; Secure" : "";
  document.cookie = `dao_session=; path=/; max-age=0; SameSite=Strict${secure}`;
}

/**
 * Set a CSRF cookie for client-side demo sessions.
 * The backend CSRF middleware validates that X-CSRF-Token header matches
 * this cookie on mutating requests. When the demo login bypasses the
 * backend (client-side only), we need to set this cookie ourselves so
 * subsequent API calls can pass CSRF validation.
 */
function setCsrfCookie() {
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const secure = isSecureContext() ? "; Secure" : "";
  document.cookie = `csrf_token=${token}; path=/; max-age=86400; SameSite=Strict${secure}`;
}

function clearCsrfCookie() {
  const secure = isSecureContext() ? "; Secure" : "";
  document.cookie = `csrf_token=; path=/; max-age=0; SameSite=Strict${secure}`;
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface AuthContextValue {
  /** Currently authenticated user (null while loading or unauthenticated) */
  user: AuthUser | null;
  /** True during initial session restoration */
  loading: boolean;
  /** Login with email + password */
  login: (email: string, password: string) => Promise<AuthUser>;
  /** One-click demo persona login */
  demoLogin: (role: string) => Promise<AuthUser>;
  /** Clear session and redirect to /login */
  logout: () => void;
  /** Check whether the current user has a permission */
  hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("dao_token")
        : null;
    if (!token) {
      clearSessionCookie();
      setLoading(false);
      return;
    }

    // Check for a stored client-side demo user (synthetic token)
    const isDemoToken = token.startsWith("demo-token-");
    if (isDemoToken && DEMO_MODE) {
      try {
        const stored = localStorage.getItem(DEMO_USER_KEY);
        if (stored) {
          const demoUser = JSON.parse(stored) as AuthUser;
          setUser(demoUser);
          setSessionCookie();
          // Ensure CSRF cookie exists for API calls
          if (!document.cookie.includes("csrf_token=")) {
            setCsrfCookie();
          }
        }
      } catch {
        localStorage.removeItem(DEMO_USER_KEY);
      }
      setLoading(false);
      return;
    }

    if (!isAPIEnabled) {
      // No backend and no demo token — clear stale session
      clearToken();
      clearSessionCookie();
      setLoading(false);
      return;
    }

    // Real token + real backend — validate via /auth/me
    apiGet<AuthUser>("/auth/me")
      .then((u) => {
        setUser(u);
        setSessionCookie(); // keep cookie fresh
      })
      .catch(() => {
        clearToken();
        clearSessionCookie();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      const res = await apiPost<AuthResponse>("/auth/login", { email, password });
      setToken(res.accessToken);
      if (res.refreshToken) setRefreshToken(res.refreshToken);
      setSessionCookie();
      setUser(res.user);
      return res.user;
    },
    [],
  );

  const demoLogin = useCallback(
    async (role: string): Promise<AuthUser> => {
      if (isAPIEnabled) {
        // Real backend available — try API first, fall back to client-side
        try {
          const res = await apiPost<AuthResponse>("/auth/demo-login", { role });
          setToken(res.accessToken);
          if (res.refreshToken) setRefreshToken(res.refreshToken);
          setSessionCookie();
          setUser(res.user);
          return res.user;
        } catch {
          // API failed — fall through to client-side login
        }
      }

      // Client-side demo login — no backend or API call failed
      const demoUser = createDemoUser(role);
      if (!demoUser) throw new Error(`Unknown demo role: ${role}`);

      // Store a synthetic token and the demo user in localStorage
      setToken(`demo-token-${role}-${Date.now()}`);
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
      setSessionCookie();
      setCsrfCookie(); // Enable CSRF validation for backend API calls
      setUser(demoUser);
      return demoUser;
    },
    [],
  );

  const logout = useCallback(() => {
    // Fire-and-forget server-side logout (revoke refresh tokens)
    if (isAPIEnabled) {
      apiPost("/auth/logout", {}).catch(() => {});
    }
    clearToken();
    localStorage.removeItem(DEMO_USER_KEY);
    clearSessionCookie();
    clearCsrfCookie();
    setUser(null);
    router.push("/login");
  }, [router]);

  const hasPermission = useCallback(
    (perm: string): boolean => {
      if (!user?.roleMeta) return false;
      return user.roleMeta.permissions.includes(perm);
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, demoLogin, logout, hasPermission }),
    [user, loading, login, demoLogin, logout, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
