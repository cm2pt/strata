/**
 * Strata — Environment Variable Validation
 *
 * Validates environment variables at build/startup time.
 * Provides typed access to all env vars used by the frontend.
 *
 * Usage:
 *   import { env } from "@/lib/env";
 *   const apiUrl = env.NEXT_PUBLIC_API_URL; // string | undefined
 */

// ---------------------------------------------------------------------------
// Client-side env (NEXT_PUBLIC_* — available in browser)
// ---------------------------------------------------------------------------

interface ClientEnv {
  /** Backend API URL. When unset, app runs in demo mode with seed data. */
  NEXT_PUBLIC_API_URL: string | undefined;
  /** Build ID / Git SHA injected at build time */
  NEXT_PUBLIC_BUILD_ID: string | undefined;
}

function validateClientEnv(): ClientEnv {
  const raw = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_BUILD_ID: process.env.NEXT_PUBLIC_BUILD_ID,
  };

  // Validate URL format if provided
  if (raw.NEXT_PUBLIC_API_URL) {
    try {
      new URL(raw.NEXT_PUBLIC_API_URL);
    } catch {
      console.error(
        `[env] Invalid NEXT_PUBLIC_API_URL: "${raw.NEXT_PUBLIC_API_URL}" — must be a valid URL (e.g. http://localhost:8000/api/v1)`,
      );
    }
  }

  return raw;
}

export const env = validateClientEnv();

// ---------------------------------------------------------------------------
// Build-time safety checks
// ---------------------------------------------------------------------------

/**
 * Warn at build time if DEMO_MODE is enabled in a production build.
 * This runs during module evaluation (i.e., at build/startup time)
 * so that CI pipelines and build logs surface the warning early.
 */
if (
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
  process.env.NODE_ENV === "production"
) {
  console.warn(
    "[env] WARNING: NEXT_PUBLIC_DEMO_MODE is enabled in a production build. " +
      "Demo mode exposes synthetic data and demo-login endpoints. " +
      "Set NEXT_PUBLIC_DEMO_MODE=false for production deployments.",
  );
}

// ---------------------------------------------------------------------------
// Runtime checks (call once at app startup)
// ---------------------------------------------------------------------------

/** Log current mode for debugging */
export function logEnvStatus() {
  if (typeof window === "undefined") return; // SSR — skip

  const mode = env.NEXT_PUBLIC_API_URL ? "API" : "Demo";
  console.info(
    `[Strata] Running in ${mode} mode${env.NEXT_PUBLIC_API_URL ? ` → ${env.NEXT_PUBLIC_API_URL}` : ""}`,
  );
}
