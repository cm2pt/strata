import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardError from "./error";

// Mock the ErrorState component so we can test DashboardError in isolation
// without worrying about lucide-react icon rendering in jsdom
vi.mock("@/components/shared/error-state", () => ({
  ErrorState: ({
    title,
    description,
    onRetry,
  }: {
    title?: string;
    description?: string;
    onRetry?: () => void;
  }) => (
    <div>
      <h3>{title}</h3>
      <p>{description}</p>
      {onRetry && (
        <button onClick={onRetry} type="button">
          Try again
        </button>
      )}
    </div>
  ),
}));

vi.mock("@/components/shared/page-shell", () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("DashboardError", () => {
  it("renders the fixed title 'Something went wrong'", () => {
    const error = new Error("Something broke");
    const reset = vi.fn();
    render(<DashboardError error={error} reset={reset} />);
    expect(screen.getByText("Something went wrong")).toBeTruthy();
  });

  it("renders the error message as description", () => {
    const error = new Error("Something broke");
    const reset = vi.fn();
    render(<DashboardError error={error} reset={reset} />);
    expect(screen.getByText("Something broke")).toBeTruthy();
  });

  it("calls reset when retry button is clicked", () => {
    const error = new Error("Oops");
    const reset = vi.fn();
    render(<DashboardError error={error} reset={reset} />);
    const retryBtn = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(retryBtn);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("shows fallback description when error has no message", () => {
    const error = new Error();
    const reset = vi.fn();
    render(<DashboardError error={error} reset={reset} />);
    // The component falls back to the long description string
    expect(
      screen.getByText(/unexpected error occurred/i),
    ).toBeTruthy();
  });

  it("logs the error to console.error", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Test error");
    const reset = vi.fn();
    render(<DashboardError error={error} reset={reset} />);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[Dashboard Error Boundary]",
      error,
    );
    consoleSpy.mockRestore();
  });
});
