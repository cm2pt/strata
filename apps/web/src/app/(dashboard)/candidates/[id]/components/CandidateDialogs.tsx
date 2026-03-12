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
import type { CandidateDetail } from "@/lib/types";

// ── Promote Dialog ───────────────────────────────────────────────────────────

export interface PromoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: CandidateDetail;
  actionLoading: boolean;
  promoteName: string;
  promoteDomain: string;
  promoteBU: string;
  promotePlatform: string;
  onPromoteNameChange: (v: string) => void;
  onPromoteDomainChange: (v: string) => void;
  onPromoteBUChange: (v: string) => void;
  onPromotePlatformChange: (v: string) => void;
  onConfirm: () => void;
}

export function PromoteDialog({
  open,
  onOpenChange,
  candidate,
  actionLoading,
  promoteName,
  promoteDomain,
  promoteBU,
  promotePlatform,
  onPromoteNameChange,
  onPromoteDomainChange,
  onPromoteBUChange,
  onPromotePlatformChange,
  onConfirm,
}: PromoteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote to Data Product</DialogTitle>
          <DialogDescription>
            This will create a new Data Product with {candidate.sourceCount}{" "}
            source assets, log a portfolio change decision, and update portfolio
            metrics.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Product Name
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={promoteName}
              onChange={(e) => onPromoteNameChange(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Domain</label>
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={promoteDomain}
              onChange={(e) => onPromoteDomainChange(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">
              Business Unit
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={promoteBU}
              onChange={(e) => onPromoteBUChange(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">
              Platform
            </label>
            <select
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={promotePlatform}
              onChange={(e) => onPromotePlatformChange(e.target.value)}
            >
              <option value="snowflake">Snowflake</option>
              <option value="databricks">Databricks</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={actionLoading || !canMutate}
            title={!canMutate ? "API unavailable in offline demo mode" : ""}
          >
            {actionLoading ? "Promoting..." : "Promote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Ignore Dialog ────────────────────────────────────────────────────────────

export interface IgnoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLoading: boolean;
  ignoreReason: string;
  onIgnoreReasonChange: (v: string) => void;
  onConfirm: () => void;
}

export function IgnoreDialog({
  open,
  onOpenChange,
  actionLoading,
  ignoreReason,
  onIgnoreReasonChange,
  onConfirm,
}: IgnoreDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ignore Candidate</DialogTitle>
          <DialogDescription>
            This candidate will be dismissed and moved to the ignored list.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <label className="text-sm font-medium text-gray-700">
            Reason (optional)
          </label>
          <textarea
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
            value={ignoreReason}
            onChange={(e) => onIgnoreReasonChange(e.target.value)}
            placeholder="e.g., Duplicate of existing product, Not relevant..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={actionLoading || !canMutate}
            title={!canMutate ? "API unavailable in offline demo mode" : ""}
          >
            {actionLoading ? "Ignoring..." : "Ignore Candidate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Retire Dialog ────────────────────────────────────────────────────────────

export interface RetireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: CandidateDetail;
  actionLoading: boolean;
  onConfirm: () => void;
}

export function RetireDialog({
  open,
  onOpenChange,
  candidate,
  actionLoading,
  onConfirm,
}: RetireDialogProps) {
  const costDisplay =
    candidate.monthlyCostEstimate > 0
      ? `$${candidate.monthlyCostEstimate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo`
      : "N/A";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Flag for Retirement</DialogTitle>
          <DialogDescription>
            This will create a retirement decision for &ldquo;
            {candidate.nameSuggested}&rdquo;. Once approved, the product will be
            retired and{" "}
            {candidate.monthlyCostEstimate > 0
              ? `$${candidate.monthlyCostEstimate.toLocaleString()}/mo in capital will be freed.`
              : "associated costs will be freed."}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Confidence Score</span>
            <span className="font-medium text-red-600">
              {candidate.confidenceScore}%
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Estimated Monthly Cost</span>
            <span className="font-medium">{costDisplay}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Annual Savings if Retired</span>
            <span className="font-medium text-emerald-600">
              $
              {(candidate.monthlyCostEstimate * 12).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
              /yr
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={actionLoading || !canMutate}
            title={!canMutate ? "API unavailable in offline demo mode" : ""}
          >
            {actionLoading ? "Creating..." : "Create Retirement Decision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
