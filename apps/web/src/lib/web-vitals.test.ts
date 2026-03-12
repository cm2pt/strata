import { describe, it, expect, vi, beforeEach } from "vitest";

const mockOnCLS = vi.fn();
const mockOnINP = vi.fn();
const mockOnLCP = vi.fn();
const mockOnTTFB = vi.fn();

vi.mock("web-vitals", () => ({
  onCLS: mockOnCLS,
  onINP: mockOnINP,
  onLCP: mockOnLCP,
  onTTFB: mockOnTTFB,
}));

describe("web-vitals", () => {
  beforeEach(() => {
    mockOnCLS.mockReset();
    mockOnINP.mockReset();
    mockOnLCP.mockReset();
    mockOnTTFB.mockReset();
  });

  it("registers all four vitals callbacks", async () => {
    const { reportWebVitals } = await import("./web-vitals");
    await reportWebVitals();
    expect(mockOnCLS).toHaveBeenCalledOnce();
    expect(mockOnINP).toHaveBeenCalledOnce();
    expect(mockOnLCP).toHaveBeenCalledOnce();
    expect(mockOnTTFB).toHaveBeenCalledOnce();
  });

  it("passes a function callback to each vital", async () => {
    const { reportWebVitals } = await import("./web-vitals");
    await reportWebVitals();
    expect(typeof mockOnCLS.mock.calls[0][0]).toBe("function");
    expect(typeof mockOnINP.mock.calls[0][0]).toBe("function");
    expect(typeof mockOnLCP.mock.calls[0][0]).toBe("function");
    expect(typeof mockOnTTFB.mock.calls[0][0]).toBe("function");
  });

  it("sendToAnalytics does not throw when called", async () => {
    const { reportWebVitals } = await import("./web-vitals");
    await reportWebVitals();
    const callback = mockOnCLS.mock.calls[0][0];
    // Call with mock metric — exercises the function regardless of isDev
    expect(() =>
      callback({ name: "CLS", value: 0.05, rating: "good" }),
    ).not.toThrow();
    expect(() =>
      callback({ name: "CLS", value: 0.2, rating: "needs-improvement" }),
    ).not.toThrow();
    expect(() =>
      callback({ name: "CLS", value: 0.5, rating: "poor" }),
    ).not.toThrow();
  });

  it("does not throw when web-vitals import fails", async () => {
    vi.doMock("web-vitals", () => {
      throw new Error("module not found");
    });
    const mod = await import("./web-vitals");
    await expect(mod.reportWebVitals()).resolves.toBeUndefined();
  });
});
