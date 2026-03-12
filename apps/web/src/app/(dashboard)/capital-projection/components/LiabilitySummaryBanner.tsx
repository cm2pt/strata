import { Card } from "@/components/shared/card";
import { formatCurrency } from "@/lib/format";
import { AlertTriangle } from "lucide-react";
import type { LiabilityEstimate } from "@/lib/types";

interface LiabilitySummaryBannerProps {
  liabilityEstimate: LiabilityEstimate;
}

export function LiabilitySummaryBanner({ liabilityEstimate }: LiabilitySummaryBannerProps) {
  return (
    <Card className="bg-gradient-to-r from-red-50 to-amber-50 border-red-200">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-800" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">36-Month Liability Summary</h3>
          <p className="text-xs text-gray-600 mt-1">
            If no capital events are executed for 36 months, the portfolio accumulates{" "}
            <span className="font-semibold text-red-900">{formatCurrency(liabilityEstimate.totalPassiveLiability36m, true)}</span>{" "}
            in capital liability. Governance-only mode still leaves a{" "}
            <span className="font-semibold text-amber-700">{formatCurrency(liabilityEstimate.totalGovernanceGap36m, true)}</span>{" "}
            gap. Full active capital management frees{" "}
            <span className="font-semibold text-teal-700">{formatCurrency(liabilityEstimate.capitalFreedActive36m, true)}</span>{" "}
            and closes the liability entirely.
          </p>
        </div>
      </div>
    </Card>
  );
}
