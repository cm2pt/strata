/**
 * Tests for the useMutation hook — success flow, error flow,
 * loading state management, and canMutate guard.
 *
 * The mutation hook lives in hooks.ts; these tests exercise it
 * in isolation by mocking the canMutate flag.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ---------- canMutate=true scenario ----------

// We need two separate describe blocks: one where canMutate is true
// (API enabled) and one where it is false (offline demo).

describe("useMutation — API enabled (canMutate=true)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("success flow: calls the mutation fn and returns its result", async () => {
    // Mock canMutate as true
    vi.doMock("./client", () => ({
      isAPIEnabled: true,
      canMutate: true,
      apiGet: vi.fn(),
      apiPost: vi.fn(),
      apiPatch: vi.fn(),
    }));

    const { useMutation } = await import("./hooks");
    const { result } = renderHook(() => useMutation<{ id: string }>());

    expect(result.current.disabled).toBe(false);
    expect(result.current.disabledReason).toBe("");
    expect(result.current.loading).toBe(false);

    let resolved: { id: string } | undefined;
    await act(async () => {
      resolved = await result.current.execute(() =>
        Promise.resolve({ id: "new-123" }),
      );
    });

    expect(resolved).toEqual({ id: "new-123" });
    expect(result.current.loading).toBe(false);
  });

  it("error flow: propagates the error from the mutation fn", async () => {
    vi.doMock("./client", () => ({
      isAPIEnabled: true,
      canMutate: true,
      apiGet: vi.fn(),
      apiPost: vi.fn(),
      apiPatch: vi.fn(),
    }));

    const { useMutation } = await import("./hooks");
    const { result } = renderHook(() => useMutation());

    await expect(
      act(() =>
        result.current.execute(() =>
          Promise.reject(new Error("Network failure")),
        ),
      ),
    ).rejects.toThrow("Network failure");

    // Loading should be reset after error
    expect(result.current.loading).toBe(false);
  });

  it("loading state: sets loading=true during execution", async () => {
    vi.doMock("./client", () => ({
      isAPIEnabled: true,
      canMutate: true,
      apiGet: vi.fn(),
      apiPost: vi.fn(),
      apiPatch: vi.fn(),
    }));

    const { useMutation } = await import("./hooks");
    const { result } = renderHook(() => useMutation<string>());

    let resolvePromise: (value: string) => void;
    const slowPromise = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });

    // Start execution (don't await yet)
    let executionPromise: Promise<string>;
    act(() => {
      executionPromise = result.current.execute(() => slowPromise);
    });

    // Loading should be true while in-flight
    expect(result.current.loading).toBe(true);

    // Resolve the promise
    await act(async () => {
      resolvePromise!("done");
      await executionPromise!;
    });

    // Loading should be false after completion
    expect(result.current.loading).toBe(false);
  });

  it("prevents concurrent mutations (in-flight guard)", async () => {
    vi.doMock("./client", () => ({
      isAPIEnabled: true,
      canMutate: true,
      apiGet: vi.fn(),
      apiPost: vi.fn(),
      apiPatch: vi.fn(),
    }));

    const { useMutation } = await import("./hooks");
    const { result } = renderHook(() => useMutation<string>());

    let resolveFirst: (value: string) => void;
    const firstPromise = new Promise<string>((resolve) => {
      resolveFirst = resolve;
    });

    // Start first mutation
    let firstExecution: Promise<string>;
    act(() => {
      firstExecution = result.current.execute(() => firstPromise);
    });

    // Second mutation should throw immediately
    await expect(
      act(() =>
        result.current.execute(() => Promise.resolve("second")),
      ),
    ).rejects.toThrow("Mutation already in progress");

    // Clean up first mutation
    await act(async () => {
      resolveFirst!("first");
      await firstExecution!;
    });
  });
});

// ---------- canMutate=false scenario ----------

describe("useMutation — offline demo (canMutate=false)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("disabled=true and disabledReason is set when canMutate is false", async () => {
    vi.doMock("./client", () => ({
      isAPIEnabled: false,
      canMutate: false,
      apiGet: vi.fn(),
      apiPost: vi.fn(),
      apiPatch: vi.fn(),
    }));

    const { useMutation } = await import("./hooks");
    const { result } = renderHook(() => useMutation());

    expect(result.current.disabled).toBe(true);
    expect(result.current.disabledReason).toBeTruthy();
    expect(result.current.loading).toBe(false);
  });

  it("execute throws when canMutate is false", async () => {
    vi.doMock("./client", () => ({
      isAPIEnabled: false,
      canMutate: false,
      apiGet: vi.fn(),
      apiPost: vi.fn(),
      apiPatch: vi.fn(),
    }));

    const { useMutation } = await import("./hooks");
    const { result } = renderHook(() => useMutation());

    await expect(
      result.current.execute(() => Promise.resolve("should not run")),
    ).rejects.toThrow("API unavailable");
  });

  it("loading stays false when execute is rejected by canMutate guard", async () => {
    vi.doMock("./client", () => ({
      isAPIEnabled: false,
      canMutate: false,
      apiGet: vi.fn(),
      apiPost: vi.fn(),
      apiPatch: vi.fn(),
    }));

    const { useMutation } = await import("./hooks");
    const { result } = renderHook(() => useMutation());

    try {
      await result.current.execute(() => Promise.resolve("nope"));
    } catch {
      // expected
    }

    // Loading should never have been set to true
    expect(result.current.loading).toBe(false);
  });
});
