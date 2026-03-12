"use client";

import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { LifecyclePill } from "@/components/shared/lifecycle-pill";
import { formatCurrency } from "@/lib/format";
import type { LifecycleStage } from "@/lib/types";

export interface StageDistributionItem {
  stage: LifecycleStage;
  count: number;
  totalCost: number;
}

export interface StageDistributionProps {
  stageDistribution: StageDistributionItem[];
  maxCount: number;
}

export function StageDistribution({ stageDistribution, maxCount }: StageDistributionProps) {
  return (
    <Card>
      <SectionHeader title="Stage Distribution" />
      <div className="space-y-3">
        {stageDistribution.map((s) => (
          <div key={s.stage} className="flex items-center gap-3">
            <div className="w-20 flex-shrink-0">
              <LifecyclePill stage={s.stage} size="xs" />
            </div>
            <div className="flex-1 h-7 bg-gray-50 rounded-md overflow-hidden relative">
              <div
                className="h-full bg-gray-100 rounded-md flex items-center px-3 transition-all"
                style={{ width: `${Math.max((s.count / maxCount) * 100, 5)}%` }}
              >
                <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                  {s.count} products
                </span>
              </div>
            </div>
            <span className="text-xs text-gray-400 font-mono w-20 text-right">
              {formatCurrency(s.totalCost, true)}/mo
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
