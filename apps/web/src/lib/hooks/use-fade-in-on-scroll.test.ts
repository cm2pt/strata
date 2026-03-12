import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import React from "react";
import { useFadeInOnScroll } from "./use-fade-in-on-scroll";

// Store mock observer instances so we can verify and fire events
let lastObserverInstance: {
  callback: IntersectionObserverCallback;
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
} | null = null;

beforeEach(() => {
  lastObserverInstance = null;

  // Use a class-based mock so `new IntersectionObserver(...)` works
  class MockIntersectionObserver {
    callback: IntersectionObserverCallback;
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    root = null;
    rootMargin = "";
    thresholds: number[] = [];
    takeRecords = () => [] as IntersectionObserverEntry[];

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
      lastObserverInstance = this;
    }
  }

  global.IntersectionObserver =
    MockIntersectionObserver as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Test component that renders a real DOM element with the hook's ref
function TestComponent({ once }: { once?: boolean }) {
  const { ref, isVisible } = useFadeInOnScroll({ once });
  return React.createElement("div", {
    ref,
    "data-testid": "target",
    "data-visible": String(isVisible),
  });
}

describe("useFadeInOnScroll", () => {
  it("returns isVisible=false initially", () => {
    const { getByTestId } = render(React.createElement(TestComponent, {}));
    expect(getByTestId("target").getAttribute("data-visible")).toBe("false");
  });

  it("creates an IntersectionObserver and observes the element", () => {
    const { getByTestId } = render(React.createElement(TestComponent, {}));
    const el = getByTestId("target");
    expect(lastObserverInstance).not.toBeNull();
    expect(lastObserverInstance!.observe).toHaveBeenCalledWith(el);
  });

  it("sets isVisible=true when intersection fires", () => {
    const { getByTestId } = render(React.createElement(TestComponent, {}));
    const el = getByTestId("target");

    act(() => {
      lastObserverInstance!.callback(
        [{ isIntersecting: true, target: el }] as unknown as IntersectionObserverEntry[],
        lastObserverInstance as unknown as IntersectionObserver
      );
    });

    expect(el.getAttribute("data-visible")).toBe("true");
  });

  it("unobserves after first intersection when once=true (default)", () => {
    const { getByTestId } = render(React.createElement(TestComponent, {}));
    const el = getByTestId("target");

    act(() => {
      lastObserverInstance!.callback(
        [{ isIntersecting: true, target: el }] as unknown as IntersectionObserverEntry[],
        lastObserverInstance as unknown as IntersectionObserver
      );
    });

    expect(lastObserverInstance!.unobserve).toHaveBeenCalledWith(el);
  });

  it("does not unobserve when once=false", () => {
    const { getByTestId } = render(
      React.createElement(TestComponent, { once: false })
    );
    const el = getByTestId("target");

    act(() => {
      lastObserverInstance!.callback(
        [{ isIntersecting: true, target: el }] as unknown as IntersectionObserverEntry[],
        lastObserverInstance as unknown as IntersectionObserver
      );
    });

    expect(el.getAttribute("data-visible")).toBe("true");
    expect(lastObserverInstance!.unobserve).not.toHaveBeenCalled();
  });

  it("cleans up observer on unmount", () => {
    const { unmount } = render(React.createElement(TestComponent, {}));
    const instance = lastObserverInstance!;
    unmount();
    expect(instance.disconnect).toHaveBeenCalled();
  });
});
