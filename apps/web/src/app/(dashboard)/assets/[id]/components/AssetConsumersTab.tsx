import { Users } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import dynamic from "next/dynamic";
import type { DataProduct, UsageTrendPoint } from "@/lib/types";

const UsageTrendChart = dynamic(
  () =>
    import("@/components/charts/usage-trend-chart").then((m) => ({
      default: m.UsageTrendChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[180px] animate-pulse bg-gray-100 rounded-lg" />
    ),
  }
);

export interface AssetConsumersTabProps {
  product: DataProduct;
  usageTrend: UsageTrendPoint[] | null | undefined;
}

export function AssetConsumersTab({
  product,
  usageTrend,
}: AssetConsumersTabProps) {
  return (
    <TabsContent value="consumers" className="space-y-6">
      <div className="rounded-xl border border-border bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-semibold text-gray-900 mb-0.5">
          Consumer Map
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          {product.monthlyConsumers} monthly active consumers across{" "}
          {(product.consumerTeams ?? []).length} teams
        </p>
        {(product.consumerTeams ?? []).length > 0 ? (
          <div className="space-y-3">
            {(product.consumerTeams ?? []).map((team) => (
              <div key={team.name} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-40 flex-shrink-0 truncate">
                  {team.name}
                </span>
                <div className="flex-1 h-6 bg-gray-50 rounded-md overflow-hidden">
                  <div
                    className="h-full bg-blue-100 rounded-md flex items-center px-2"
                    style={{
                      width: `${Math.max(team.percentage, 8)}%`,
                    }}
                  >
                    <span className="text-[11px] font-medium text-blue-700 whitespace-nowrap">
                      {team.consumers} users
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-400 w-10 text-right">
                  {team.percentage}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
            <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No active consumers</p>
            <p className="text-xs text-gray-400 mt-1">
              This product has no recorded queries in the last 30 days.
            </p>
          </div>
        )}
      </div>
      {(usageTrend ?? []).length > 0 && (
        <div className="rounded-xl border border-border bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Usage Trend
          </h3>
          <UsageTrendChart data={usageTrend!} />
        </div>
      )}
    </TabsContent>
  );
}
