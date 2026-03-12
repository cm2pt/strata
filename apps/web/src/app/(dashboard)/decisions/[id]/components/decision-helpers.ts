import type { DecisionType } from "@/lib/types";
import {
  DollarSign,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  BarChart3,
  ArrowUpRight,
  Plus,
  CheckCircle2,
  XCircle,
  PauseCircle,
  MessageSquare,
} from "lucide-react";

// ── Type / Icon Maps ──────────────────────────────────────────────────────────

export const TYPE_LABELS: Record<DecisionType, string> = {
  retirement: "Retirement",
  cost_investigation: "Cost Investigation",
  value_revalidation: "Value Revalidation",
  low_roi_review: "Low ROI Review",
  capital_reallocation: "Capital Reallocation",
  pricing_activation: "Pricing Activation",
  ai_project_review: "AI Project Review",
  portfolio_change: "Portfolio Change",
};

export const TYPE_ICONS: Record<DecisionType, typeof DollarSign> = {
  retirement: AlertTriangle,
  cost_investigation: TrendingUp,
  value_revalidation: ShieldCheck,
  low_roi_review: BarChart3,
  capital_reallocation: DollarSign,
  pricing_activation: DollarSign,
  ai_project_review: BarChart3,
  portfolio_change: ArrowUpRight,
};

export const impactStatusStyles: Record<
  string,
  { label: string; border: string; bg: string; text: string }
> = {
  confirmed: {
    label: "Confirmed",
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
  },
  validating: {
    label: "Validating",
    border: "border-blue-200",
    bg: "bg-blue-50",
    text: "text-blue-700",
  },
  underperforming: {
    label: "Underperforming",
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-700",
  },
  pending: {
    label: "Pending",
    border: "border-gray-200",
    bg: "bg-gray-100",
    text: "text-gray-600",
  },
};

export const ACTION_ICONS: Record<string, typeof Plus> = {
  created: Plus,
  approved: CheckCircle2,
  rejected: XCircle,
  delayed: PauseCircle,
  commented: MessageSquare,
};

export const ACTION_LABELS: Record<string, string> = {
  created: "Decision created",
  approved: "Decision approved",
  rejected: "Decision rejected",
  delayed: "Decision delayed",
  commented: "Left a comment",
};

// ── Formatters ────────────────────────────────────────────────────────────────

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatCurrency(v: number) {
  return `$${Math.abs(v).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}
