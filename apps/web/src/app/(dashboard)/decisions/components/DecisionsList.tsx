import { useRouter } from "next/navigation";
import { Card } from "@/components/shared/card";
import { DecisionStatusBadge } from "@/components/shared/decision-status-badge";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { canMutate } from "@/lib/api/client";
import type { Decision, DecisionType } from "@/lib/types";
import {
  ArrowRight,
  TrendingDown,
  Zap,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  Clock,
  Repeat,
  Brain,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const typeConfig: Record<DecisionType, { label: string; icon: typeof TrendingDown; color: string; bg: string }> = {
  retirement: { label: "Retirement", icon: TrendingDown, color: "text-amber-600", bg: "bg-amber-50" },
  cost_investigation: { label: "Cost Investigation", icon: Zap, color: "text-red-600", bg: "bg-red-50" },
  value_revalidation: { label: "Value Revalidation", icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-50" },
  low_roi_review: { label: "Low ROI Review", icon: AlertTriangle, color: "text-gray-600", bg: "bg-gray-100" },
  capital_reallocation: { label: "Reallocation", icon: Repeat, color: "text-purple-600", bg: "bg-purple-50" },
  pricing_activation: { label: "Pricing", icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-50" },
  ai_project_review: { label: "AI Review", icon: Brain, color: "text-indigo-600", bg: "bg-indigo-50" },
  portfolio_change: { label: "Portfolio Change", icon: ArrowRight, color: "text-teal-600", bg: "bg-teal-50" },
};

const impactStatusStyles: Record<string, { label: string; bg: string; text: string }> = {
  confirmed:       { label: "Confirmed",       bg: "bg-emerald-100", text: "text-emerald-700" },
  validating:      { label: "Validating",      bg: "bg-blue-100",    text: "text-blue-700" },
  underperforming: { label: "Underperforming", bg: "bg-amber-100",   text: "text-amber-700" },
  pending:         { label: "Pending",         bg: "bg-gray-100",    text: "text-gray-600" },
};

function ImpactStatusBadge({ status }: { status: string }) {
  const s = impactStatusStyles[status] ?? impactStatusStyles.pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.bg} ${s.text}`}>
      <ShieldCheck className="h-3 w-3" />{s.label}
    </span>
  );
}

interface DecisionsListProps {
  decisions: Decision[];
  canApprove: boolean;
  onAction: (type: "approve" | "reject" | "delay", decision: Decision) => void;
}

export function DecisionsList({ decisions, canApprove, onAction }: DecisionsListProps) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      {decisions.map((d) => {
        const cfg = typeConfig[d.type];
        const TypeIcon = cfg.icon;
        const isActionable = d.status === "under_review";
        return (
          <Card key={d.id} hover>
            <div className="flex items-start gap-4">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${cfg.bg}`}>
                <TypeIcon className={`h-4.5 w-4.5 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <DecisionStatusBadge status={d.status} size="xs" />
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{cfg.label}</span>
                  <span className="text-[10px] text-gray-300">·</span>
                  <span className="text-[10px] text-gray-400">{formatRelativeTime(d.createdAt)}</span>
                  {d.capitalFreed > 0 && (
                    <>
                      <span className="text-[10px] text-gray-300">·</span>
                      <span className="text-[10px] font-semibold text-emerald-600">Freed: {formatCurrency(d.capitalFreed, true)}/mo</span>
                    </>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{d.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                  {d.description}
                  {d.productId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/assets/${d.productId}`); }}
                      className="ml-1.5 text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      View {d.productName} &rarr;
                    </button>
                  )}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400">Est. Impact</span>
                    <span className={`text-xs font-semibold font-mono ml-1.5 ${d.estimatedImpact > 0 ? "text-emerald-600" : d.estimatedImpact < 0 ? "text-red-600" : "text-gray-500"}`}>
                      {d.estimatedImpact > 0 ? "+" : ""}{formatCurrency(d.estimatedImpact, true)}/mo
                    </span>
                  </div>
                  {d.actualImpact !== null && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400">Actual</span>
                      <span className={`text-xs font-semibold font-mono ml-1.5 ${d.actualImpact > 0 ? "text-emerald-600" : "text-gray-500"}`}>
                        {d.actualImpact > 0 ? "+" : ""}{formatCurrency(d.actualImpact, true)}/mo
                      </span>
                    </div>
                  )}
                  <span className="text-[10px] text-gray-300">·</span>
                  <span className="text-[10px] text-gray-400">Assigned: {d.assignedTo}</span>
                  {d.impactValidationStatus && d.status === "approved" && (
                    <>
                      <span className="text-[10px] text-gray-300">·</span>
                      <ImpactStatusBadge status={d.impactValidationStatus} />
                    </>
                  )}
                  {d.actualImpact !== null && d.estimatedImpact !== 0 && d.status === "approved" && (
                    <>
                      <span className="text-[10px] text-gray-300">·</span>
                      <span className={`text-[10px] font-semibold ${Math.abs(d.actualImpact / d.estimatedImpact) >= 0.9 ? "text-emerald-600" : Math.abs(d.actualImpact / d.estimatedImpact) >= 0.7 ? "text-amber-600" : "text-red-600"}`}>
                        {Math.round((d.actualImpact / d.estimatedImpact) * 100)}% of projection
                      </span>
                    </>
                  )}
                </div>
                {d.status === "delayed" && d.delayReason && (
                  <div className="mt-2 pt-2 border-t border-border flex items-center gap-1.5 text-amber-600">
                    <Clock className="h-3 w-3" />
                    <span className="text-[11px] font-medium">{d.delayReason}</span>
                    {d.delayedUntil && <span className="text-[10px] text-amber-500">until {new Date(d.delayedUntil).toLocaleDateString()}</span>}
                  </div>
                )}
                {d.resolution && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-[11px] text-gray-500 italic">&quot;{d.resolution}&quot;</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isActionable && canApprove && (
                  <>
                    <Button variant="default" size="sm" className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => onAction("approve", d)} disabled={!canMutate} title={!canMutate ? "API unavailable in offline demo mode" : ""}>
                      <Check className="h-3 w-3 mr-1" />Approve
                    </Button>
                    {d.type === "retirement" && (
                      <Button variant="outline" size="sm" className="text-xs h-8 text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => onAction("delay", d)} disabled={!canMutate} title={!canMutate ? "API unavailable in offline demo mode" : ""}>
                        <Clock className="h-3 w-3 mr-1" />Delay
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50" onClick={() => onAction("reject", d)} disabled={!canMutate} title={!canMutate ? "API unavailable in offline demo mode" : ""}>
                      <X className="h-3 w-3 mr-1" />Reject
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="sm" className="text-xs h-8 text-gray-400 hover:text-gray-700" onClick={() => router.push(`/decisions/${d.id}`)}>
                  View<ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
