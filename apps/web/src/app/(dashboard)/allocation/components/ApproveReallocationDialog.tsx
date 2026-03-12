"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatROI } from "@/lib/format";
import { apiPost, canMutate } from "@/lib/api/client";
import type { DataProduct } from "@/lib/types";

export interface ApproveReallocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reallocationAmount: number;
  currentPortfolioROI: number;
  projectedROI: number;
  bottomQuartile: DataProduct[];
  topQuartile: DataProduct[];
  approveLoading: boolean;
  setApproveLoading: (loading: boolean) => void;
  setApproveSuccess: (success: boolean) => void;
  toastSuccess: (msg: string) => void;
  toastError: (msg: string) => void;
}

export function ApproveReallocationDialog({
  open,
  onOpenChange,
  reallocationAmount,
  currentPortfolioROI,
  projectedROI,
  bottomQuartile,
  topQuartile,
  approveLoading,
  setApproveLoading,
  setApproveSuccess,
  toastSuccess,
  toastError,
}: ApproveReallocationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Capital Reallocation</DialogTitle>
          <DialogDescription>
            Move <strong>{formatCurrency(reallocationAmount, true)}/mo</strong> from bottom ROI quartile to top ROI quartile.
            This creates a decision record and capital event.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
            <p className="text-xs text-purple-700">
              <strong>From:</strong> {bottomQuartile.map(p => p.name).join(", ")}
            </p>
            <p className="text-xs text-purple-700 mt-1">
              <strong>To:</strong> {topQuartile.map(p => p.name).join(", ")}
            </p>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Projected ROI improvement</span>
            <span className="font-semibold text-emerald-600">
              {formatROI(currentPortfolioROI)} &rarr; {formatROI(projectedROI)} (+{((projectedROI - currentPortfolioROI) / currentPortfolioROI * 100).toFixed(0)}%)
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={approveLoading || !canMutate}
            title={!canMutate ? "API unavailable in offline demo mode" : ""}
            onClick={async () => {
              setApproveLoading(true);
              try {
                await apiPost("/allocation/approve-reallocation", {
                  fromProducts: bottomQuartile.map(p => p.id),
                  toProducts: topQuartile.map(p => p.id),
                  amount: reallocationAmount,
                  projectedRoiImpact: (projectedROI - currentPortfolioROI) / currentPortfolioROI,
                });
                setApproveSuccess(true);
                toastSuccess("Reallocation approved — capital event logged");
              } catch (e) {
                const msg = e instanceof Error ? e.message : "Failed to approve reallocation";
                toastError(msg);
              } finally {
                setApproveLoading(false);
                onOpenChange(false);
              }
            }}
          >
            {approveLoading ? "Approving..." : "Approve & Log"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
