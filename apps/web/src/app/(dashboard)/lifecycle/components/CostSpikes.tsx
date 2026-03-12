"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { Zap, CheckCircle2 } from "lucide-react";
import { canMutate } from "@/lib/api/client";
import type { DataProduct } from "@/lib/types";

export interface CostSpikesProps {
  costSpikes: DataProduct[];
  investigateSubmitted: boolean;
  onInvestigate: () => void;
}

export function CostSpikes({
  costSpikes,
  investigateSubmitted,
  onInvestigate,
}: CostSpikesProps) {
  const router = useRouter();

  return (
    <Card>
      <SectionHeader
        title="Cost Spikes"
        subtitle=">30% MoM cost increase"
        icon={Zap}
        iconColor="text-red-600"
        iconBg="bg-red-50"
      />
      {costSpikes.length > 0 ? (
        <div className="space-y-2">
          {costSpikes.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/assets/${p.id}`)}
              className="w-full flex items-center justify-between rounded-lg border border-red-100 bg-red-50/30 p-3 text-left hover:bg-red-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                <p className="text-xs text-red-500">+{p.costTrend}% MoM</p>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className="text-sm font-semibold text-gray-900 font-mono">
                  {formatCurrency(p.monthlyCost, true)}
                </p>
              </div>
            </button>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8 text-red-600 border-red-200 hover:bg-red-50 mt-2"
            disabled={investigateSubmitted || !canMutate}
            title={!canMutate ? "API unavailable in offline demo mode" : ""}
            onClick={onInvestigate}
          >
            {investigateSubmitted ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" />Investigations Created</>
            ) : (
              <>Investigate All</>
            )}
          </Button>
          {investigateSubmitted && (
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
        <EmptyState icon={CheckCircle2} title="No cost spikes detected" description="All products within normal cost ranges." className="p-6 border-0" />
      )}
    </Card>
  );
}
