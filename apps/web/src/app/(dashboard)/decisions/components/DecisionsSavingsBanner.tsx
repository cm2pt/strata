import { Card } from "@/components/shared/card";
import { formatCurrency } from "@/lib/format";
import { DollarSign } from "lucide-react";

interface DecisionsSavingsBannerProps {
  totalCapitalFreed: number;
  approvedCount: number;
  pendingCount: number;
}

export function DecisionsSavingsBanner({ totalCapitalFreed, approvedCount, pendingCount }: DecisionsSavingsBannerProps) {
  if (totalCapitalFreed <= 0) return null;

  return (
    <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-emerald-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Capital Freed</p>
            <p className="text-2xl font-bold text-emerald-900 font-mono">{formatCurrency(totalCapitalFreed, true)}<span className="text-sm font-normal text-emerald-600">/mo</span></p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-emerald-600">Annual Savings</p>
            <p className="text-lg font-bold text-emerald-800 font-mono">{formatCurrency(totalCapitalFreed * 12, true)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-emerald-600">Approved</p>
            <p className="text-lg font-bold text-emerald-800">{approvedCount}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-amber-600">Pending</p>
            <p className="text-lg font-bold text-amber-700">{pendingCount}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
