"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { FileText, CheckCircle2 } from "lucide-react";
import type { DataProduct } from "@/lib/types";

export interface StalledDraftsProps {
  stalledDrafts: DataProduct[];
  onNotifyOwners: () => void;
}

export function StalledDrafts({ stalledDrafts, onNotifyOwners }: StalledDraftsProps) {
  const router = useRouter();

  return (
    <Card>
      <SectionHeader title="Stalled in Draft" subtitle="No consumers after creation" icon={FileText} iconColor="text-gray-600" iconBg="bg-gray-100" />
      {stalledDrafts.length > 0 ? (
        <div className="space-y-2">
          {stalledDrafts.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/assets/${p.id}`)}
              className="w-full flex items-center justify-between rounded-lg border border-border p-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                <p className="text-xs text-gray-400">{p.owner?.name ?? "Unassigned"}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className="text-xs text-gray-400 font-mono">{formatCurrency(p.monthlyCost, true)}/mo</p>
              </div>
            </button>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8 mt-2"
            onClick={onNotifyOwners}
          >
            Notify Owners
          </Button>
        </div>
      ) : (
        <EmptyState icon={CheckCircle2} title="No stalled drafts" description="All draft products are progressing." className="p-6 border-0" />
      )}
    </Card>
  );
}
