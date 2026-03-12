import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock canMutate as false (no NEXT_PUBLIC_API_URL in test env = demo mode)
vi.mock("@/lib/api/client", () => ({
  canMutate: false,
  isAPIEnabled: false,
}));

import { MutationButton } from "./mutation-button";

describe("MutationButton", () => {
  it("renders children text", () => {
    render(<MutationButton>Save</MutationButton>);
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  });

  it("is disabled in demo mode (no API URL)", () => {
    render(<MutationButton>Save</MutationButton>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toBeDisabled();
  });

  it("shows loading text when mutationLoading is true", () => {
    render(
      <MutationButton mutationLoading loadingText="Saving...">
        Save
      </MutationButton>,
    );
    expect(screen.getByRole("button", { name: "Saving..." })).toBeTruthy();
  });

  it("shows title tooltip in demo mode", () => {
    render(<MutationButton>Save</MutationButton>);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("title")).toContain("API unavailable");
  });

  it("is also disabled when mutationLoading is true", () => {
    render(
      <MutationButton mutationLoading loadingText="Saving...">
        Save
      </MutationButton>,
    );
    const btn = screen.getByRole("button", { name: "Saving..." });
    expect(btn).toBeDisabled();
  });

  it("is disabled when disabled prop is explicitly passed", () => {
    render(<MutationButton disabled>Save</MutationButton>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toBeDisabled();
  });

  it("renders children when mutationLoading is true but no loadingText", () => {
    render(<MutationButton mutationLoading>Save</MutationButton>);
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  });
});
