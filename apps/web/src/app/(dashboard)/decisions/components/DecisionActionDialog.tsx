import { formatCurrency } from "@/lib/format";
import type { Decision } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DecisionActionDialogProps {
  actionDialog: { type: "approve" | "reject" | "delay"; decision: Decision } | null;
  submitting: boolean;
  delayReason: string;
  onDelayReasonChange: (value: string) => void;
  onClose: () => void;
  onApprove: (decision: Decision) => void;
  onReject: (decision: Decision) => void;
  onDelay: (decision: Decision) => void;
}

export function DecisionActionDialog({
  actionDialog,
  submitting,
  delayReason,
  onDelayReasonChange,
  onClose,
  onApprove,
  onReject,
  onDelay,
}: DecisionActionDialogProps) {
  return (
    <Dialog open={actionDialog !== null} onOpenChange={() => onClose()}>
      <DialogContent>
        {actionDialog?.type === "approve" && (
          <>
            <DialogHeader>
              <DialogTitle>Approve Decision</DialogTitle>
              <DialogDescription>
                Approve &quot;{actionDialog.decision.title}&quot; for {actionDialog.decision.productName}?
                {actionDialog.decision.type === "retirement" && (
                  <span className="block mt-2 text-emerald-600 font-semibold">This will retire the product and free {formatCurrency(actionDialog.decision.estimatedImpact, true)}/mo in capital.</span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting} onClick={() => onApprove(actionDialog.decision)}>
                {submitting ? "Approving..." : "Confirm Approval"}
              </Button>
            </DialogFooter>
          </>
        )}
        {actionDialog?.type === "reject" && (
          <>
            <DialogHeader>
              <DialogTitle>Reject Decision</DialogTitle>
              <DialogDescription>Reject &quot;{actionDialog.decision.title}&quot;? This cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button variant="destructive" disabled={submitting} onClick={() => onReject(actionDialog.decision)}>
                {submitting ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </DialogFooter>
          </>
        )}
        {actionDialog?.type === "delay" && (
          <>
            <DialogHeader>
              <DialogTitle>Delay Retirement</DialogTitle>
              <DialogDescription>Delay retirement of {actionDialog.decision.productName} for 3 months.</DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Reason for delay</label>
              <input type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. Waiting for Q2 usage data" value={delayReason} onChange={(e) => onDelayReasonChange(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button className="bg-amber-600 hover:bg-amber-700" disabled={submitting} onClick={() => onDelay(actionDialog.decision)}>
                {submitting ? "Delaying..." : "Confirm Delay"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
