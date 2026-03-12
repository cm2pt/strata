/**
 * Strata — API Client
 *
 * When NEXT_PUBLIC_API_URL is set, fetches from the real backend.
 * When not set, all hooks fall back to seed.ts imports (demo mode).
 *
 * Supports automatic token refresh: when a request gets a 401,
 * the client silently exchanges the refresh token for a new access
 * token and retries the original request once.
 */

import { circuitBreaker } from "./circuit-breaker";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/** Default request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 30_000;

/** Maximum number of retries for transient (5xx) errors */
const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 3000]; // ms

const isDev = process.env.NODE_ENV === "development";

/**
 * True when a real backend URL is configured.
 * Demo mode does NOT disable the API — it only enables the demo login panel.
 * Data hooks use the API when available, falling back to seed data when not.
 */
export const isAPIEnabled = !!API_BASE;

/**
 * True when mutations (POST/PATCH/DELETE) are allowed.
 * Requires a real backend to be configured.
 */
export const canMutate = isAPIEnabled;

/**
 * True when the app is running in demo mode.
 * Used by hooks to fall back to seed data when the API returns empty results
 * for features whose backend tables haven't been populated yet.
 */
export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// ---------------------------------------------------------------------------
// CSRF token helpers (double-submit cookie pattern)
// ---------------------------------------------------------------------------

/** HTTP methods that require a CSRF token */
const CSRF_METHODS = new Set(["POST", "PATCH", "DELETE"]);

/** Read a cookie value by name */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("dao_token");
}

/**
 * Store the access token in localStorage.
 * @param token - JWT access token from the auth endpoint
 * @example
 * setToken(response.accessToken);
 */
export function setToken(token: string) {
  localStorage.setItem("dao_token", token);
}

/**
 * Remove the access token and refresh token from localStorage.
 * Typically called on logout or when a token refresh fails.
 * @example
 * clearToken(); // user is now logged out
 */
export function clearToken() {
  localStorage.removeItem("dao_token");
  localStorage.removeItem("dao_refresh_token");
}

/**
 * Retrieve the refresh token from localStorage.
 * Returns `null` on the server (SSR) or when no token is stored.
 * @returns The stored refresh token, or `null`
 * @example
 * const rt = getRefreshToken();
 * if (rt) { await refreshSession(rt); }
 */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("dao_refresh_token");
}

/**
 * Store the refresh token in localStorage.
 * @param token - JWT refresh token from the auth endpoint
 * @example
 * setRefreshToken(response.refreshToken);
 */
export function setRefreshToken(token: string) {
  localStorage.setItem("dao_refresh_token", token);
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Custom error class for API responses with non-2xx status codes.
 * Carries the HTTP status alongside the error message for downstream handling.
 * @example
 * try { await apiGet("/datasets"); }
 * catch (e) { if (e instanceof APIError && e.status === 404) { ... } }
 */
export class APIError extends Error {
  constructor(
    /** HTTP status code (e.g., 401, 404, 500). 0 indicates a timeout. */
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "APIError";
  }
}

// ---------------------------------------------------------------------------
// Error message sanitization
// ---------------------------------------------------------------------------

/** User-friendly messages for common HTTP status codes */
const STATUS_MESSAGES: Record<number, string> = {
  400: "Invalid request",
  401: "Session expired",
  404: "Not found",
  500: "Server error — please try again",
  502: "Server error — please try again",
  503: "Server error — please try again",
  504: "Server error — please try again",
};

/**
 * Sanitize backend error messages before displaying to the client.
 * - Maps known status codes to user-friendly messages.
 * - In production, never exposes raw backend detail for 5xx errors.
 * - In development, preserves raw detail for debugging.
 */
function sanitizeErrorMessage(status: number, rawMessage: string): string {
  // 403 is handled separately (keeps its "Permission denied: ..." format)
  if (status === 403) return rawMessage;

  const isProduction = process.env.NODE_ENV === "production";

  // For 5xx errors in production, always use the generic message
  if (isProduction && status >= 500) {
    return STATUS_MESSAGES[status] || "Server error — please try again";
  }

  // For known status codes, use the friendly message
  if (STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status];
  }

  // In development or for other status codes, preserve the raw message
  return rawMessage;
}

// ---------------------------------------------------------------------------
// Silent refresh logic
// ---------------------------------------------------------------------------

/** Prevent multiple concurrent refresh attempts */
let _refreshPromise: Promise<boolean> | null = null;

async function _tryRefresh(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;

  try {
    const url = `${API_BASE}/api/v1/auth/refresh`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });

    if (!res.ok) {
      clearToken();
      return false;
    }

    const data = await res.json();
    if (data.accessToken) setToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    return true;
  } catch {
    clearToken();
    return false;
  }
}

/**
 * Attempt a silent token refresh. Deduplicates concurrent calls.
 */
function silentRefresh(): Promise<boolean> {
  if (!_refreshPromise) {
    _refreshPromise = _tryRefresh().finally(() => {
      _refreshPromise = null;
    });
  }
  return _refreshPromise;
}

// ---------------------------------------------------------------------------
// Signal utilities
// ---------------------------------------------------------------------------

/** Combine multiple AbortSignals — aborts when ANY signal fires */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), {
      once: true,
      signal: controller.signal,
    });
  }
  return controller.signal;
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

/**
 * Internal fetch implementation with auth headers, error handling, automatic
 * token refresh on 401, and retry logic for transient 5xx errors.
 *
 * This is the raw implementation without circuit-breaker wrapping.
 * External callers should use `apiFetch` instead.
 */
async function _apiFetchInternal<T>(
  path: string,
  options: RequestInit = {},
  _retried = false,
  _retryCount = 0,
): Promise<T> {
  const startTime = Date.now();
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-ID": crypto.randomUUID(),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Attach CSRF token for mutating requests (double-submit cookie pattern)
  const method = (options.method || "GET").toUpperCase();
  if (CSRF_METHODS.has(method)) {
    const csrfToken = getCookie("csrf_token");
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }

  // Add request timeout via AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // Merge with any caller-supplied signal
  const signal = options.signal
    ? anySignal([options.signal, controller.signal])
    : controller.signal;

  const url = `${API_BASE}${path}`;

  if (isDev) {
    console.groupCollapsed(`%c${options.method || "GET"} ${path}`, "color: #0ea5e9; font-weight: bold");
    console.log("URL:", url);
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers, signal });
  } catch (e) {
    clearTimeout(timeoutId);
    if (isDev) {
      console.log("Error:", e);
      console.groupEnd();
    }
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new APIError(0, `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    // Retry on 5xx if retries remain
    if (res.status >= 500 && _retryCount < MAX_RETRIES) {
      if (isDev) {
        console.log("Status:", res.status, `(${Date.now() - startTime}ms) — retrying (${_retryCount + 1}/${MAX_RETRIES})`);
        console.groupEnd();
      }
      const delay = RETRY_DELAYS[_retryCount] ?? 3000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return _apiFetchInternal<T>(path, options, _retried, _retryCount + 1);
    }

    // On 401, attempt silent refresh once
    if (res.status === 401 && !_retried) {
      const refreshed = await silentRefresh();
      if (refreshed) {
        if (isDev) {
          console.log("Status:", res.status, "— refreshing token");
          console.groupEnd();
        }
        return _apiFetchInternal<T>(path, options, true, _retryCount);
      }
      clearToken();
    }

    // On 429, provide rate-limit feedback with Retry-After hint
    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      const waitSec = retryAfter ? parseInt(retryAfter, 10) : 60;
      if (isDev) {
        console.log("Status:", res.status, `(${Date.now() - startTime}ms)`);
        console.groupEnd();
      }
      throw new APIError(429, `Too many requests. Please wait ${waitSec} seconds and try again.`);
    }

    const body = await res.json().catch(() => ({ detail: res.statusText }));
    const message = body.detail || res.statusText;

    if (isDev) {
      console.log("Status:", res.status, `(${Date.now() - startTime}ms)`);
      console.groupEnd();
    }

    // On 403, provide a clear permission-denied message
    if (res.status === 403) {
      throw new APIError(
        403,
        message.startsWith("Permission denied")
          ? message
          : `Permission denied: ${message}`,
      );
    }

    throw new APIError(res.status, sanitizeErrorMessage(res.status, message));
  }

  if (isDev) {
    console.log("Status:", res.status, `(${Date.now() - startTime}ms)`);
    console.groupEnd();
  }

  return res.json();
}

/**
 * Core fetch wrapper with auth, retries, token refresh, and circuit-breaker protection.
 *
 * Automatically attaches the stored JWT, retries transient 5xx errors (up to 2 times),
 * silently refreshes the token on 401, and guards endpoints via a circuit breaker.
 *
 * @typeParam T - Expected JSON response type
 * @param path - API path relative to `NEXT_PUBLIC_API_URL` (e.g., `/api/v1/datasets`)
 * @param options - Standard `RequestInit` overrides (method, body, signal, etc.)
 * @returns Parsed JSON response body
 * @throws {APIError} On non-2xx responses after all retry/refresh attempts
 * @example
 * const datasets = await apiFetch<Dataset[]>("/api/v1/datasets");
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return circuitBreaker.execute(path, () =>
    _apiFetchInternal<T>(path, options),
  );
}

/**
 * Send a GET request to the API.
 * @typeParam T - Expected JSON response type
 * @param path - API path (e.g., `/api/v1/datasets`)
 * @returns Parsed JSON response body
 * @example
 * const datasets = await apiGet<Dataset[]>("/api/v1/datasets");
 */
export function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "GET" });
}

/**
 * Send a POST request to the API.
 * @typeParam T - Expected JSON response type
 * @param path - API path (e.g., `/api/v1/datasets`)
 * @param body - Request body (will be JSON-serialized)
 * @returns Parsed JSON response body
 * @example
 * const created = await apiPost<Dataset>("/api/v1/datasets", { name: "Sales Q4" });
 */
export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Send a PATCH request to the API.
 * @typeParam T - Expected JSON response type
 * @param path - API path (e.g., `/api/v1/datasets/123`)
 * @param body - Partial update body (will be JSON-serialized)
 * @returns Parsed JSON response body
 * @example
 * const updated = await apiPatch<Dataset>("/api/v1/datasets/123", { status: "active" });
 */
export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/**
 * Send a DELETE request to the API.
 * @typeParam T - Expected JSON response type
 * @param path - API path (e.g., `/api/v1/datasets/123`)
 * @returns Parsed JSON response body
 * @example
 * await apiDelete("/api/v1/datasets/123");
 */
export function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE" });
}
