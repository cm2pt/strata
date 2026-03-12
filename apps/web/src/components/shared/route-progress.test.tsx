import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";

// Mock next/navigation
let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

import { RouteProgress } from "./route-progress";

describe("RouteProgress", () => {
  beforeEach(() => {
    mockPathname = "/";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders without crashing", () => {
    const { container } = render(<RouteProgress />);
    expect(container).toBeTruthy();
  });

  it("does not show progress bar initially", () => {
    const { container } = render(<RouteProgress />);
    // The component returns null when not loading
    expect(container.querySelector(".bg-teal-500")).toBeNull();
  });

  it("shows progress bar when a link to a different route is clicked", () => {
    const { container } = render(
      <div>
        <a href="/other">Navigate</a>
        <RouteProgress />
      </div>,
    );

    // Click the link to trigger navigation
    fireEvent.click(screen.getByText("Navigate"));

    expect(container.querySelector(".bg-teal-500")).toBeTruthy();
  });

  it("does not show progress bar when a link to the same route is clicked", () => {
    mockPathname = "/current";
    const { container } = render(
      <div>
        <a href="/current">Same Page</a>
        <RouteProgress />
      </div>,
    );

    fireEvent.click(screen.getByText("Same Page"));

    expect(container.querySelector(".bg-teal-500")).toBeNull();
  });

  it("does not show progress bar for external links", () => {
    const { container } = render(
      <div>
        <a href="https://example.com">External</a>
        <RouteProgress />
      </div>,
    );

    fireEvent.click(screen.getByText("External"));

    expect(container.querySelector(".bg-teal-500")).toBeNull();
  });

  it("does not react to clicks on non-link elements", () => {
    const { container } = render(
      <div>
        <button>Click me</button>
        <RouteProgress />
      </div>,
    );

    fireEvent.click(screen.getByText("Click me"));

    expect(container.querySelector(".bg-teal-500")).toBeNull();
  });

  it("sets initial progress to 10 when navigation starts", () => {
    const { container } = render(
      <div>
        <a href="/other">Navigate</a>
        <RouteProgress />
      </div>,
    );

    fireEvent.click(screen.getByText("Navigate"));

    const bar = container.querySelector(".bg-teal-500") as HTMLElement;
    expect(bar.style.width).toBe("10%");
  });

  it("increases progress over time", () => {
    const { container } = render(
      <div>
        <a href="/other">Navigate</a>
        <RouteProgress />
      </div>,
    );

    fireEvent.click(screen.getByText("Navigate"));

    const bar = container.querySelector(".bg-teal-500") as HTMLElement;
    const initialWidth = parseFloat(bar.style.width);

    // Advance timers to simulate progress
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const newWidth = parseFloat(bar.style.width);
    expect(newWidth).toBeGreaterThan(initialWidth);
  });

  it("cleans up click listener on unmount", () => {
    const removeEventSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<RouteProgress />);
    unmount();

    const removedEvents = removeEventSpy.mock.calls.map((c) => c[0]);
    expect(removedEvents).toContain("click");
    removeEventSpy.mockRestore();
  });
});
