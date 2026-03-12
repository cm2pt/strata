/**
 * Strata -- Circuit Breaker for API Calls
 *
 * Tracks consecutive failures per endpoint prefix (e.g., /portfolio, /decisions).
 * After a configurable number of consecutive failures, the circuit "opens"
 * and immediately rejects requests for a cooldown period.
 *
 * States:
 *   - CLOSED:    Normal operation. Failures increment a counter.
 *   - OPEN:      Too many failures. Requests are rejected immediately.
 *   - HALF_OPEN: Cooldown expired. One probe request is allowed through.
 *                If it succeeds the circuit closes; if it fails it re-opens.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitInfo {
  state: CircuitState;
  failures: number;
  lastFailureAt: number;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 30_000; // 30 seconds

// ---------------------------------------------------------------------------
// Internal per-prefix state
// ---------------------------------------------------------------------------

interface CircuitRecord {
  state: CircuitState;
  failures: number;
  lastFailureAt: number;
}

const circuits = new Map<string, CircuitRecord>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive a bucket key from the request path.
 * Strips query strings and uses the first path segment as the prefix,
 * e.g. "/decisions/dec-001/comments?foo=1" => "/decisions"
 */
export function getPrefix(path: string): string {
  const noQuery = path.split("?")[0];
  // Remove leading slash, split on "/", take first segment
  const segments = noQuery.replace(/^\//, "").split("/");
  return `/${segments[0]}`;
}

function getOrCreate(prefix: string): CircuitRecord {
  let record = circuits.get(prefix);
  if (!record) {
    record = { state: "CLOSED", failures: 0, lastFailureAt: 0 };
    circuits.set(prefix, record);
  }
  return record;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const circuitBreaker = {
  /**
   * Execute a function through the circuit breaker.
   *
   * @param path - The API path (used to derive the endpoint prefix)
   * @param fn   - The async function to execute (typically a fetch call)
   * @returns The result of `fn` if allowed through
   * @throws  Immediately if the circuit is open
   */
  async execute<T>(path: string, fn: () => Promise<T>): Promise<T> {
    const prefix = getPrefix(path);
    const record = getOrCreate(prefix);

    // OPEN state: check if cooldown has elapsed
    if (record.state === "OPEN") {
      const elapsed = Date.now() - record.lastFailureAt;
      if (elapsed >= COOLDOWN_MS) {
        // Transition to HALF_OPEN: allow one probe request
        record.state = "HALF_OPEN";
      } else {
        // Still in cooldown -- reject immediately
        throw new Error(
          "Service temporarily unavailable. Retrying automatically...",
        );
      }
    }

    try {
      const result = await fn();
      // Success: close the circuit (or confirm half-open probe succeeded)
      record.state = "CLOSED";
      record.failures = 0;
      return result;
    } catch (error) {
      record.failures += 1;
      record.lastFailureAt = Date.now();

      if (record.state === "HALF_OPEN") {
        // Half-open probe failed -- re-open
        record.state = "OPEN";
      } else if (record.failures >= FAILURE_THRESHOLD) {
        record.state = "OPEN";
      }

      throw error;
    }
  },

  /** Get the current state for an endpoint prefix (mainly for testing/monitoring). */
  getState(path: string): CircuitInfo {
    const prefix = getPrefix(path);
    const record = getOrCreate(prefix);
    return {
      state: record.state,
      failures: record.failures,
      lastFailureAt: record.lastFailureAt,
    };
  },

  /** Reset all circuits (useful for tests). */
  reset(): void {
    circuits.clear();
  },

  /** Reset the circuit for a specific prefix. */
  resetPrefix(path: string): void {
    const prefix = getPrefix(path);
    circuits.delete(prefix);
  },
};
