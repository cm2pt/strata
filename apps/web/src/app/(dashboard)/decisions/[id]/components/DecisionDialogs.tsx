import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { canMutate } from "@/lib/api/client";
import { formatCurrency } from "./decision-helpers";
import type { Decision } from "@/lib/types";

// ── Approve Dialog ───────────────────────────────────────────────────────────

export interface ApproveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  decision: Decision;
  typeLabel: string;
  actionLoading: boolean;
  onConfirm: () => void;
}

export function ApproveDialog({
  open,
  onOpenChange,
  decision,
  typeLabel,
  actionLoading,
  onConfirm,
}: ApproveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Decision</DialogTitle>
          <DialogDescription>
            Approving this {typeLabel.toLowerCase()} decision will execute the
            action and record the financial impact.
            {decision.type === "retirement" && (
              <>
                {" "}
                The product will be retired and{" "}
                <strong>{formatCurrency(decision.estimatedImpact)}/mo</strong> in
                capital will be freed.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={actionLoading || !canMutate}
          >
            {actionLoading ? "Approving..." : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Reject Dialog ────────────────────────────────────────────────────────────

export interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLoading: boolean;
  onConfirm: () => void;
}

export function RejectDialog({
  open,
  onOpenChange,
  actionLoading,
  onConfirm,
}: RejectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Decision</DialogTitle>
          <DialogDescription>
            This will reject the decision. No financial action will be taken.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={actionLoading || !canMutate}
          >
            {actionLoading ? "Rejecting..." : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delay Dialog ─────────────────────────────────────────────────────────────

export interface DelayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLoading: boolean;
  delayReason: string;
  delayDate: string;
  onDelayReasonChange: (value: string) => void;
  onDelayDateChange: (value: string) => void;
  onConfirm: () => void;
}

export function DelayDialog({
  open,
  onOpenChange,
  actionLoading,
  delayReason,
  delayDate,
  onDelayReasonChange,
  onDelayDateChange,
  onConfirm,
}: DelayDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delay Decision</DialogTitle>
          <DialogDescription>
            Provide a reason and target date for revisiting this decision.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Reason</label>
            <textarea
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={3}
              value={delayReason}
              onChange={(e) => onDelayReasonChange(e.target.value)}
              placeholder="e.g., Waiting for Q2 usage data..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">
              Revisit Date
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={delayDate}
              onChange={(e) => onDelayDateChange(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={actionLoading || !canMutate || !delayReason}
          >
            {actionLoading ? "Delaying..." : "Delay Decision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
