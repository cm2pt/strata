import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { circuitBreaker, getPrefix } from "./circuit-breaker";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const succeed = () => Promise.resolve("ok");
const fail = () => Promise.reject(new Error("boom"));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getPrefix", () => {
  it("extracts first path segment", () => {
    expect(getPrefix("/decisions/dec-001/comments")).toBe("/decisions");
  });

  it("strips query strings", () => {
    expect(getPrefix("/assets/?search=foo&page=2")).toBe("/assets");
  });

  it("handles root-level paths", () => {
    expect(getPrefix("/portfolio/summary")).toBe("/portfolio");
  });
});

describe("circuitBreaker", () => {
  beforeEach(() => {
    circuitBreaker.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---- Closed state ----

  it("starts in CLOSED state", () => {
    const info = circuitBreaker.getState("/data-products/dp-001");
    expect(info.state).toBe("CLOSED");
    expect(info.failures).toBe(0);
  });

  it("passes through successful requests in closed state", async () => {
    const result = await circuitBreaker.execute("/data-products", succeed);
    expect(result).toBe("ok");
    expect(circuitBreaker.getState("/data-products").state).toBe("CLOSED");
  });

  it("increments failure count on error but stays closed below threshold", async () => {
    await expect(circuitBreaker.execute("/data-products", fail)).rejects.toThrow("boom");
    const info = circuitBreaker.getState("/data-products");
    expect(info.state).toBe("CLOSED");
    expect(info.failures).toBe(1);
  });

  // ---- Open state ----

  it("opens after 5 consecutive failures", async () => {
    for (let i = 0; i < 5; i++) {
      await expect(circuitBreaker.execute("/decisions", fail)).rejects.toThrow("boom");
    }
    const info = circuitBreaker.getState("/decisions");
    expect(info.state).toBe("OPEN");
    expect(info.failures).toBe(5);
  });

  it("rejects immediately when circuit is open", async () => {
    // Open the circuit
    for (let i = 0; i < 5; i++) {
      await expect(circuitBreaker.execute("/decisions", fail)).rejects.toThrow("boom");
    }
    expect(circuitBreaker.getState("/decisions").state).toBe("OPEN");

    // Next call should be rejected immediately without calling fn
    const fn = vi.fn(succeed);
    await expect(circuitBreaker.execute("/decisions", fn)).rejects.toThrow(
      "Service temporarily unavailable. Retrying automatically...",
    );
    expect(fn).not.toHaveBeenCalled();
  });

  // ---- Half-open state ----

  it("transitions to HALF_OPEN after 30s cooldown", async () => {
    // Open the circuit
    for (let i = 0; i < 5; i++) {
      await expect(circuitBreaker.execute("/decisions", fail)).rejects.toThrow("boom");
    }
    expect(circuitBreaker.getState("/decisions").state).toBe("OPEN");

    // Advance time past cooldown
    vi.advanceTimersByTime(30_001);

    // The next execute should allow the request through (half-open probe)
    const result = await circuitBreaker.execute("/decisions", succeed);
    expect(result).toBe("ok");
    expect(circuitBreaker.getState("/decisions").state).toBe("CLOSED");
  });

  it("re-opens on failed half-open probe", async () => {
    // Open the circuit
    for (let i = 0; i < 5; i++) {
      await expect(circuitBreaker.execute("/decisions", fail)).rejects.toThrow("boom");
    }

    // Advance past cooldown
    vi.advanceTimersByTime(30_001);

    // Half-open probe fails
    await expect(circuitBreaker.execute("/decisions", fail)).rejects.toThrow("boom");
    expect(circuitBreaker.getState("/decisions").state).toBe("OPEN");
  });

  it("closes on successful half-open probe", async () => {
    // Open the circuit
    for (let i = 0; i < 5; i++) {
      await expect(circuitBreaker.execute("/decisions", fail)).rejects.toThrow("boom");
    }

    // Advance past cooldown
    vi.advanceTimersByTime(30_001);

    // Half-open probe succeeds
    const result = await circuitBreaker.execute("/decisions", succeed);
    expect(result).toBe("ok");

    const info = circuitBreaker.getState("/decisions");
    expect(info.state).toBe("CLOSED");
    expect(info.failures).toBe(0);
  });

  // ---- Per-prefix isolation ----

  it("tracks separate circuits per endpoint prefix", async () => {
    // Open the /decisions circuit
    for (let i = 0; i < 5; i++) {
      await expect(circuitBreaker.execute("/decisions/dec-001", fail)).rejects.toThrow("boom");
    }
    expect(circuitBreaker.getState("/decisions").state).toBe("OPEN");

    // /data-products should still be closed
    expect(circuitBreaker.getState("/data-products").state).toBe("CLOSED");
    const result = await circuitBreaker.execute("/data-products/dp-001", succeed);
    expect(result).toBe("ok");
  });

  it("groups sub-paths under the same prefix", async () => {
    // Failures on different sub-paths of /decisions all count toward the same circuit
    await expect(circuitBreaker.execute("/decisions/dec-001", fail)).rejects.toThrow();
    await expect(circuitBreaker.execute("/decisions/dec-002/comments", fail)).rejects.toThrow();
    await expect(circuitBreaker.execute("/decisions/?status=open", fail)).rejects.toThrow();
    await expect(circuitBreaker.execute("/decisions/dec-003/actions", fail)).rejects.toThrow();
    await expect(circuitBreaker.execute("/decisions/savings-summary", fail)).rejects.toThrow();

    expect(circuitBreaker.getState("/decisions").state).toBe("OPEN");
  });

  // ---- Reset ----

  it("resets a single prefix with resetPrefix", async () => {
    for (let i = 0; i < 5; i++) {
      await expect(circuitBreaker.execute("/decisions", fail)).rejects.toThrow();
    }
    expect(circuitBreaker.getState("/decisions").state).toBe("OPEN");

    circuitBreaker.resetPrefix("/decisions/anything");
    expect(circuitBreaker.getState("/decisions").state).toBe("CLOSED");
    expect(circuitBreaker.getState("/decisions").failures).toBe(0);
  });

  it("a success resets the failure counter", async () => {
    // 3 failures, then a success
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute("/portfolio", fail)).rejects.toThrow();
    }
    expect(circuitBreaker.getState("/portfolio").failures).toBe(3);

    await circuitBreaker.execute("/portfolio/summary", succeed);
    expect(circuitBreaker.getState("/portfolio").failures).toBe(0);
    expect(circuitBreaker.getState("/portfolio").state).toBe("CLOSED");
  });
});
