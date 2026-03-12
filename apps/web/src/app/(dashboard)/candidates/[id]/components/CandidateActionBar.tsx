import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { canMutate } from "@/lib/api/client";
import type { CandidateDetail } from "@/lib/types";

export interface CandidateActionBarProps {
  candidate: CandidateDetail;
  canPromote: boolean;
  canIgnore: boolean;
  canCreateDecision: boolean;
  onPromote: () => void;
  onIgnore: () => void;
  onRetire: () => void;
}

export function CandidateActionBar({
  candidate,
  canPromote,
  canIgnore,
  canCreateDecision,
  onPromote,
  onIgnore,
  onRetire,
}: CandidateActionBarProps) {
  const isActionable =
    candidate.status === "new" || candidate.status === "under_review";
  const isLowConfidence = candidate.confidenceScore < 40;
  const costDisplay =
    candidate.monthlyCostEstimate > 0
      ? `$${candidate.monthlyCostEstimate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo`
      : "N/A";

  return (
    <>
      {/* Action bar -- low confidence: flag for retirement */}
      {isActionable &&
        isLowConfidence &&
        (canIgnore || canCreateDecision) && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 flex-1">
              Low confidence score (
              <strong>{candidate.confidenceScore}%</strong>).
              {candidate.monthlyCostEstimate > 0 && (
                <>
                  {" "}
                  Estimated cost: <strong>{costDisplay}</strong>.
                </>
              )}{" "}
              Consider flagging for retirement to free capital.
            </p>
            <div className="flex items-center gap-2">
              {canIgnore && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onIgnore}
                  disabled={!canMutate}
                  title={
                    !canMutate ? "API unavailable in offline demo mode" : ""
                  }
                >
                  <XCircle className="h-4 w-4 mr-1" /> Ignore
                </Button>
              )}
              {canCreateDecision && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onRetire}
                  disabled={!canMutate}
                  title={
                    !canMutate ? "API unavailable in offline demo mode" : ""
                  }
                >
                  <AlertTriangle className="h-4 w-4 mr-1" /> Flag for
                  Retirement
                </Button>
              )}
            </div>
          </div>
        )}

      {/* Action bar -- high confidence: promote */}
      {isActionable && !isLowConfidence && (canPromote || canIgnore) && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-800 flex-1">
            This candidate has a{" "}
            <strong>{candidate.confidenceScore}%</strong> confidence score.
            Review the evidence below and promote to a Data Product or dismiss.
          </p>
          <div className="flex items-center gap-2">
            {canIgnore && (
              <Button
                size="sm"
                variant="outline"
                onClick={onIgnore}
                disabled={!canMutate}
                title={
                  !canMutate ? "API unavailable in offline demo mode" : ""
                }
              >
                <XCircle className="h-4 w-4 mr-1" /> Ignore
              </Button>
            )}
            {canPromote && (
              <Button
                size="sm"
                onClick={onPromote}
                disabled={!canMutate}
                title={
                  !canMutate ? "API unavailable in offline demo mode" : ""
                }
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Promote to Product
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Promoted banner */}
      {candidate.status === "promoted" && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="text-sm text-emerald-800">
            This candidate has been promoted to a Data Product.
          </p>
          {candidate.promotedProductId && (
            <Link href={`/assets/${candidate.promotedProductId}`}>
              <Button size="sm" variant="outline">
                View Product <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      )}
    </>
  );
}
