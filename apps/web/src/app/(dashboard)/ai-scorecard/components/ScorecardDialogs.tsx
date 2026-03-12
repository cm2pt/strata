import { formatCurrency } from "@/lib/format";
import { canMutate } from "@/lib/api/client";
import type { AIProjectScorecard } from "@/lib/types";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ScorecardDialogsProps {
  flagTarget: AIProjectScorecard | null;
  killTarget: AIProjectScorecard | null;
  actionLoading: boolean;
  onFlagClose: () => void;
  onKillClose: () => void;
  onFlag: () => void;
  onKill: () => void;
}

export function ScorecardDialogs({ flagTarget, killTarget, actionLoading, onFlagClose, onKillClose, onFlag, onKill }: ScorecardDialogsProps) {
  return (
    <>
      {/* Flag Dialog */}
      <Dialog open={!!flagTarget} onOpenChange={() => onFlagClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag for Review</DialogTitle>
            <DialogDescription>
              Flag <strong>{flagTarget?.productName}</strong> (composite score: {flagTarget?.compositeScore.toFixed(0)}) for management review.
              This will create a decision record for tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-700">
              Monthly cost: <strong>{formatCurrency(flagTarget?.monthlyCost ?? 0, true)}</strong> ·
              Risk level: <strong>{flagTarget?.riskLevel}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onFlagClose}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={onFlag} disabled={actionLoading || !canMutate} title={!canMutate ? "API unavailable in offline demo mode" : ""}>
              {actionLoading ? "Flagging..." : "Flag for Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kill Dialog */}
      <Dialog open={!!killTarget} onOpenChange={() => onKillClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700">Kill Project</DialogTitle>
            <DialogDescription>
              This will retire <strong>{killTarget?.productName}</strong> and log an AI spend reduction of{" "}
              <strong>{formatCurrency(killTarget?.monthlyCost ?? 0, true)}/mo</strong>.
              This action creates a decision record and capital event.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-700">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              This action will mark the product as retired. It cannot be undone from this interface.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onKillClose}>Cancel</Button>
            <Button variant="destructive" onClick={onKill} disabled={actionLoading || !canMutate} title={!canMutate ? "API unavailable in offline demo mode" : ""}>
              {actionLoading ? "Retiring..." : "Kill Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
