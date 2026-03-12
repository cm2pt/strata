import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { OfflineIndicator } from "./offline-indicator";

describe("OfflineIndicator", () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    originalOnLine = navigator.onLine;
  });

  afterEach(() => {
    // Restore original value
    Object.defineProperty(navigator, "onLine", {
      value: originalOnLine,
      writable: true,
      configurable: true,
    });
  });

  it("renders nothing when navigator.onLine is true", () => {
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
      configurable: true,
    });
    const { container } = render(<OfflineIndicator />);
    expect(container.innerHTML).toBe("");
  });

  it("shows offline banner when navigator.onLine is false on mount", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      writable: true,
      configurable: true,
    });
    render(<OfflineIndicator />);
    expect(
      screen.getByText(/offline.*Some features may be unavailable/),
    ).toBeTruthy();
  });

  it("shows offline banner when offline event fires", () => {
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
      configurable: true,
    });
    render(<OfflineIndicator />);
    // Initially online — nothing shown
    expect(
      screen.queryByText(/offline.*Some features may be unavailable/),
    ).toBeNull();

    // Simulate going offline
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(
      screen.getByText(/offline.*Some features may be unavailable/),
    ).toBeTruthy();
  });

  it("hides offline banner when online event fires", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      writable: true,
      configurable: true,
    });
    render(<OfflineIndicator />);
    expect(
      screen.getByText(/offline.*Some features may be unavailable/),
    ).toBeTruthy();

    // Simulate going online
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(
      screen.queryByText(/offline.*Some features may be unavailable/),
    ).toBeNull();
  });

  it("renders the WifiOff icon when offline", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      writable: true,
      configurable: true,
    });
    const { container } = render(<OfflineIndicator />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("cleans up event listeners on unmount", () => {
    const removeEventSpy = vi.spyOn(window, "removeEventListener");
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
      configurable: true,
    });
    const { unmount } = render(<OfflineIndicator />);
    unmount();

    const removedEvents = removeEventSpy.mock.calls.map((c) => c[0]);
    expect(removedEvents).toContain("offline");
    expect(removedEvents).toContain("online");
    removeEventSpy.mockRestore();
  });

  it("toggles between online and offline states", () => {
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
      configurable: true,
    });
    render(<OfflineIndicator />);

    // Go offline
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(
      screen.getByText(/offline.*Some features may be unavailable/),
    ).toBeTruthy();

    // Go online
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(
      screen.queryByText(/offline.*Some features may be unavailable/),
    ).toBeNull();

    // Go offline again
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(
      screen.getByText(/offline.*Some features may be unavailable/),
    ).toBeTruthy();
  });
});
