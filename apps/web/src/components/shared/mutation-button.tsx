"use client";

import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { canMutate } from "@/lib/api/client";

export interface MutationButtonProps
  extends React.ComponentProps<typeof Button> {
  /** Whether this specific mutation is in progress */
  mutationLoading?: boolean;
  /** Text to show while loading (replaces children) */
  loadingText?: string;
}

/**
 * Button that is automatically disabled in demo mode (no API).
 * Shows tooltip explaining why mutation is unavailable.
 */
export const MutationButton = forwardRef<HTMLButtonElement, MutationButtonProps>(
  ({ mutationLoading, loadingText, disabled, children, ...props }, ref) => {
    const isDisabled = disabled || !canMutate || mutationLoading;

    return (
      <Button
        ref={ref}
        disabled={isDisabled}
        title={!canMutate ? "API unavailable in offline demo mode" : ""}
        {...props}
      >
        {mutationLoading && loadingText ? loadingText : children}
      </Button>
    );
  },
);
MutationButton.displayName = "MutationButton";
