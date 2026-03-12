import { Clock, PauseCircle, XCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canMutate } from "@/lib/api/client";
import { formatCurrency } from "./decision-helpers";
import type { Decision } from "@/lib/types";

export interface DecisionActionBarProps {
  decision: Decision;
  canApprove: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDelay: () => void;
}

export function DecisionActionBar({
  decision,
  canApprove,
  onApprove,
  onReject,
  onDelay,
}: DecisionActionBarProps) {
  const isUnderReview = decision.status === "under_review";

  if (!isUnderReview || !canApprove) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
      <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
      <p className="text-sm text-amber-800 flex-1">
        This decision is awaiting review. Estimated impact:{" "}
        <strong>{formatCurrency(decision.estimatedImpact)}/mo</strong>.
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onDelay}
          disabled={!canMutate}
          title={!canMutate ? "API unavailable in offline demo mode" : ""}
        >
          <PauseCircle className="h-4 w-4 mr-1" /> Delay
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onReject}
          disabled={!canMutate}
          title={!canMutate ? "API unavailable in offline demo mode" : ""}
        >
          <XCircle className="h-4 w-4 mr-1" /> Reject
        </Button>
        <Button
          size="sm"
          onClick={onApprove}
          disabled={!canMutate}
          title={!canMutate ? "API unavailable in offline demo mode" : ""}
        >
          <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
        </Button>
      </div>
    </div>
  );
}
