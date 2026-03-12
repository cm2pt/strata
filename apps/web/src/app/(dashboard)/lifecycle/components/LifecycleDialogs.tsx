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
import { formatCurrency } from "@/lib/format";
import type { DataProduct } from "@/lib/types";

export interface InvestigateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costSpikes: DataProduct[];
  submitting: boolean;
  onInvestigate: () => Promise<void>;
}

export function InvestigateDialog({
  open,
  onOpenChange,
  costSpikes,
  submitting,
  onInvestigate,
}: InvestigateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Investigate Cost Spikes</DialogTitle>
          <DialogDescription>
            Create cost investigation decisions for {costSpikes.length} products with abnormal cost increases.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2 max-h-48 overflow-y-auto">
          {costSpikes.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm rounded-md border border-border p-2">
              <span className="text-gray-700">{p.name}</span>
              <span className="font-mono text-red-600 font-semibold">+{p.costTrend}% MoM</span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            disabled={submitting}
            onClick={async () => {
              await onInvestigate();
              onOpenChange(false);
            }}
          >
            {submitting ? "Creating..." : `Create ${costSpikes.length} Investigations`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface RetirementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: DataProduct[];
  totalSavings: number;
  submitting: boolean;
  onStartReview: () => Promise<void>;
}

export function RetirementDialog({
  open,
  onOpenChange,
  candidates,
  totalSavings,
  submitting,
  onStartReview,
}: RetirementDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Retirement Review</DialogTitle>
          <DialogDescription>
            Create retirement decisions for {candidates.length} products with a combined potential savings of {formatCurrency(totalSavings, true)}/mo ({formatCurrency(totalSavings * 12, true)}/year).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2 max-h-48 overflow-y-auto">
          {candidates.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm rounded-md border border-border p-2">
              <span className="text-gray-700">{p.name}</span>
              <span className="font-mono text-amber-600 font-semibold">{formatCurrency(p.monthlyCost, true)}/mo</span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700"
            disabled={submitting}
            onClick={async () => {
              await onStartReview();
              onOpenChange(false);
            }}
          >
            {submitting ? "Creating..." : `Create ${candidates.length} Retirement Reviews`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
