import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { DollarSign } from "lucide-react";
import { formatCurrency } from "./decision-helpers";
import type { DecisionEconomicEffect } from "@/lib/types";

export interface DecisionEconomicEffectsProps {
  effects: DecisionEconomicEffect[];
}

export function DecisionEconomicEffects({
  effects,
}: DecisionEconomicEffectsProps) {
  if (effects.length === 0) return null;

  return (
    <Card>
      <SectionHeader
        title="Economic Effects"
        subtitle={`${effects.length} effects tracked`}
        icon={DollarSign}
      />
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 font-medium">Effect Type</th>
              <th className="pb-2 font-medium text-right">Monthly</th>
              <th className="pb-2 font-medium text-right">Annual</th>
              <th className="pb-2 font-medium text-right">Confidence</th>
              <th className="pb-2 font-medium">Explainer</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {effects.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="py-2.5 pr-3">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium capitalize">
                    {e.effectType.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="py-2.5 text-right font-mono text-sm">
                  {formatCurrency(e.amountUsdMonthly)}
                </td>
                <td className="py-2.5 text-right font-mono text-sm">
                  {formatCurrency(e.amountUsdAnnual)}
                </td>
                <td className="py-2.5 text-right">
                  <span
                    className={`text-sm font-medium ${
                      e.confidence >= 0.9
                        ? "text-emerald-600"
                        : e.confidence >= 0.7
                          ? "text-blue-600"
                          : "text-amber-600"
                    }`}
                  >
                    {Math.round(e.confidence * 100)}%
                  </span>
                </td>
                <td className="py-2.5 text-sm text-gray-500 max-w-[300px] truncate">
                  {e.calcExplainer ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
