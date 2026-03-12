import { useState } from "react";
import { CheckCircle2, Clock, Database, GitBranch, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TabsContent } from "@/components/ui/tabs";
import { apiPost, canMutate } from "@/lib/api/client";
import { useToast } from "@/components/shared/toast";
import { formatCurrency, formatPercent, formatDate } from "@/lib/format";
import { ValueDeclarationDialog } from "./ValueDeclarationDialog";
import dynamic from "next/dynamic";
import type { DataProduct, ValueMethod } from "@/lib/types";

const CostBreakdownDonut = dynamic(
  () =>
    import("@/components/charts/cost-breakdown-donut").then((m) => ({
      default: m.CostBreakdownDonut,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[140px] animate-pulse bg-gray-100 rounded-lg" />
    ),
  }
);

const methodLabels: Record<ValueMethod, string> = {
  revenue_attribution: "Revenue Attribution",
  cost_avoidance: "Cost Avoidance",
  efficiency_gain: "Efficiency Gain",
  compliance: "Compliance Requirement",
  strategic: "Strategic Enabler",
};

export interface AssetOverviewTabProps {
  product: DataProduct;
  productId: string;
  onRefresh?: () => void;
}

export function AssetOverviewTab({ product, productId, onRefresh }: AssetOverviewTabProps) {
  const { toastSuccess, toastError } = useToast();
  const [revalidateLoading, setRevalidateLoading] = useState(false);
  const [vdDialogOpen, setVdDialogOpen] = useState(false);
  const vd = product.valueDeclaration;

  return (
    <TabsContent value="overview" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Breakdown */}
        <div className="rounded-xl border border-border bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Cost Breakdown
            </h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-[11px] text-blue-600 hover:text-blue-800 font-medium">
                  How this is calculated →
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-xs">
                Cost = Compute + Storage + Pipeline + Human effort estimate.
                Coverage indicates how much cost data is captured from platform
                connectors.
              </TooltipContent>
            </Tooltip>
          </div>
          {product.costBreakdown ? (
            <CostBreakdownDonut
              breakdown={product.costBreakdown}
              total={product.monthlyCost}
            />
          ) : (
            <p className="text-sm text-gray-400">No breakdown data available</p>
          )}
        </div>

        {/* Value Declaration */}
        <div className="rounded-xl border border-border bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Value Declaration
            </h3>
          </div>
          {vd ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-semibold text-gray-900 font-mono">
                  {formatCurrency(vd.value, true)}
                </span>
                <span className="text-xs text-gray-400">/month</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 w-20 flex-shrink-0">
                    Declared by
                  </span>
                  <span className="text-gray-700 font-medium">
                    {vd.declaredBy}, {vd.declaredByTitle}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 w-20 flex-shrink-0">
                    Method
                  </span>
                  <span className="text-gray-700">
                    {methodLabels[vd.method]}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 w-20 flex-shrink-0">
                    Basis
                  </span>
                  <span className="text-gray-600 italic">
                    &ldquo;{vd.basis}&rdquo;
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                {vd.status.includes("peer_reviewed") && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-emerald-50 text-emerald-700"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-0.5" /> Peer reviewed
                  </Badge>
                )}
                {vd.status.includes("cfo_acknowledged") && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-blue-50 text-blue-700"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-0.5" /> CFO
                    acknowledged
                  </Badge>
                )}
                {vd.isExpiring && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-amber-50 text-amber-700"
                  >
                    <Clock className="h-3 w-3 mr-0.5" /> Review due{" "}
                    {formatDate(vd.nextReview)}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  disabled={!canMutate || revalidateLoading}
                  title={
                    !canMutate ? "API unavailable in offline demo mode" : ""
                  }
                  onClick={async () => {
                    if (!canMutate) return;
                    setRevalidateLoading(true);
                    try {
                      await apiPost(
                        `/products/${productId}/value/revalidate`,
                        {}
                      );
                      toastSuccess("Value revalidation requested");
                    } catch (e: unknown) {
                      toastError(
                        e instanceof Error ? e.message : "An error occurred"
                      );
                    } finally {
                      setRevalidateLoading(false);
                    }
                  }}
                >
                  {revalidateLoading ? "Revalidating\u2026" : "Revalidate"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8"
                  disabled={!canMutate}
                  title={
                    !canMutate ? "API unavailable in offline demo mode" : ""
                  }
                  onClick={() => setVdDialogOpen(true)}
                >
                  Edit
                </Button>
              </div>
              <ValueDeclarationDialog
                open={vdDialogOpen}
                onOpenChange={setVdDialogOpen}
                productId={productId}
                productName={product.name}
                existing={vd}
                onSuccess={() => onRefresh?.()}
              />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 text-center">
              <p className="text-sm font-medium text-amber-800">
                No value declared yet
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Without a value declaration, ROI cannot be calculated.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs h-8 border-amber-300 text-amber-700 hover:bg-amber-100"
                disabled={!canMutate}
                title={!canMutate ? "API unavailable in offline demo mode" : ""}
                onClick={() => setVdDialogOpen(true)}
              >
                Declare Value
              </Button>
              <ValueDeclarationDialog
                open={vdDialogOpen}
                onOpenChange={setVdDialogOpen}
                productId={productId}
                productName={product.name}
                existing={null}
                onSuccess={() => onRefresh?.()}
              />
            </div>
          )}
        </div>
      </div>

      {/* Dependencies */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Downstream Dependencies
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <Database className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {product.downstreamProducts}
              </p>
              <p className="text-xs text-gray-400">Data products</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <GitBranch className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {product.downstreamModels}
              </p>
              <p className="text-xs text-gray-400">ML models</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <BarChart3 className="h-5 w-5 text-teal-500" />
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {product.downstreamDashboards}
              </p>
              <p className="text-xs text-gray-400">Dashboards</p>
            </div>
          </div>
        </div>
      </div>

      {/* SLA & Quality */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Quality & Reliability
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-gray-400 mb-1">Delivery Freshness</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-gray-900 font-mono">
                {product.freshnessHours}h
              </span>
              <span className="text-xs text-gray-400">
                SLA: {product.freshnessSLA}h
              </span>
              <Badge
                variant="secondary"
                className={`text-[10px] ${
                  product.freshnessHours <= product.freshnessSLA
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {product.freshnessHours <= product.freshnessSLA
                  ? "Meeting"
                  : "Breaching"}
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Completeness</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-gray-900 font-mono">
                {formatPercent(product.completeness, 1)}
              </span>
              <Badge
                variant="secondary"
                className="text-[10px] bg-emerald-50 text-emerald-700"
              >
                Meeting
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Accuracy</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-gray-900 font-mono">
                {formatPercent(product.accuracy, 1)}
              </span>
              <Badge
                variant="secondary"
                className="text-[10px] bg-emerald-50 text-emerald-700"
              >
                Meeting
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </TabsContent>
  );
}
