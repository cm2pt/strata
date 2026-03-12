import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "./confirm-dialog";

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  title: "Delete Item",
  onConfirm: vi.fn(),
};

describe("ConfirmDialog", () => {
  it("renders the title when open", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText("Delete Item")).toBeTruthy();
  });

  it("renders the description when provided", () => {
    render(
      <ConfirmDialog {...defaultProps} description="Are you sure?" />,
    );
    expect(screen.getByText("Are you sure?")).toBeTruthy();
  });

  it("does not render description when not provided", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.queryByText("Are you sure?")).toBeNull();
  });

  it("renders default button labels", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeTruthy();
  });

  it("renders custom button labels", () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmLabel="Yes, delete"
        cancelLabel="No, keep"
      />,
    );
    expect(screen.getByRole("button", { name: "Yes, delete" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, keep" })).toBeTruthy();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onOpenChange(false) when cancel button is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows impact summary when impact prop is provided", () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        impact={{ label: "Cost Savings", value: "$1,200/mo", variant: "positive" }}
      />,
    );
    expect(screen.getByText("Cost Savings:")).toBeTruthy();
    expect(screen.getByText("$1,200/mo")).toBeTruthy();
  });

  it("shows 'Processing…' text when loading is true", () => {
    render(<ConfirmDialog {...defaultProps} loading />);
    expect(screen.getByRole("button", { name: "Processing…" })).toBeTruthy();
  });

  it("disables both buttons when loading is true", () => {
    render(<ConfirmDialog {...defaultProps} loading />);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Processing…" })).toBeDisabled();
  });
});
