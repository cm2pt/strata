"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { TrendingDown, ArrowRight, CheckCircle2 } from "lucide-react";
import { canMutate } from "@/lib/api/client";
import type { DataProduct } from "@/lib/types";

export interface RetirementCandidatesProps {
  candidates: DataProduct[];
  totalSavings: number;
  canCreateDecision: boolean;
  submitted: boolean;
  onStartRetirementReview: () => void;
}

export function RetirementCandidates({
  candidates,
  totalSavings,
  canCreateDecision,
  submitted,
  onStartRetirementReview,
}: RetirementCandidatesProps) {
  const router = useRouter();

  return (
    <Card>
      <SectionHeader
        title="Retirement Candidates"
        subtitle="Usage <20% of peak for 90+ days"
        icon={TrendingDown}
        iconColor="text-amber-600"
        iconBg="bg-amber-50"
      />
      {candidates.length > 0 ? (
        <div className="space-y-2">
          {candidates.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/assets/${p.id}`)}
              className="w-full flex items-center justify-between rounded-lg border border-border p-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                <p className="text-xs text-gray-400">
                  {p.monthlyConsumers} consumers (peak: {p.peakConsumers})
                </p>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className="text-sm font-semibold text-amber-600 font-mono">
                  {formatCurrency(p.monthlyCost, true)}
                </p>
              </div>
            </button>
          ))}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Total potential savings</span>
              <span className="font-semibold text-amber-600 font-mono">
                {formatCurrency(totalSavings, true)}/mo
              </span>
            </div>
          </div>
          {canCreateDecision && (
            <Button
              size="sm"
              className="w-full text-xs h-8 bg-amber-600 hover:bg-amber-700 mt-2"
              onClick={onStartRetirementReview}
              disabled={submitted || !canMutate}
              title={!canMutate ? "API unavailable in offline demo mode" : ""}
            >
              {submitted ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" />Reviews Created — Go to Decisions</>
              ) : (
                <><ArrowRight className="h-3 w-3 mr-1" />Start Retirement Review</>
              )}
            </Button>
          )}
          {submitted && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8 mt-1"
              onClick={() => router.push("/decisions")}
            >
              View in Decision Log
            </Button>
          )}
        </div>
      ) : (
        <EmptyState
          icon={CheckCircle2}
          title="No retirement candidates"
          description="All products are showing healthy usage."
          className="p-6 border-0"
        />
      )}
    </Card>
  );
}
