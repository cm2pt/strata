"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  Database,
  ShieldCheck,
  Clock,
  Layers,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
} from "lucide-react";
import type { MetricProvenanceInfo } from "@/lib/metrics/provenance";

// ─── Automation badge colors ─────────────────────────────────────────────────

const AUTOMATION_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  fully_automated: {
    label: "Automated",
    className: "bg-teal-50 text-teal-700 border-teal-200",
  },
  semi_automated: {
    label: "Semi-Auto",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  manual: {
    label: "Manual",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

interface MetricProvenanceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provenance: MetricProvenanceInfo | null;
  /** Current display value of the metric */
  currentValue?: string;
  /** ISO timestamp of last computation */
  lastComputed?: string;
}

export function MetricProvenanceDrawer({
  open,
  onOpenChange,
  provenance,
  currentValue,
  lastComputed,
}: MetricProvenanceDrawerProps) {
  if (!provenance) return null;

  const automationCounts = provenance.sourceFields.reduce(
    (acc, f) => {
      acc[f.automation] = (acc[f.automation] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const totalFields = provenance.sourceFields.length;
  const autoFields = automationCounts["fully_automated"] || 0;
  const automationPct =
    totalFields > 0 ? Math.round((autoFields / totalFields) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[420px] sm:max-w-[420px] overflow-y-auto"
      >
        <SheetHeader className="pb-2 border-b">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-teal-600" />
            <SheetTitle className="text-base">
              {provenance.label}
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-gray-500">
            Canonical formula and data sources
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 py-4">
          {/* Current Value */}
          {currentValue && (
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
              <span className="text-xs text-gray-500">Current Value</span>
              <span className="text-lg font-semibold font-mono tabular-nums text-gray-900">
                {currentValue}
              </span>
            </div>
          )}

          {/* Canonical Formula */}
          <section>
            <SectionLabel icon={GitBranch} label="Canonical Formula" />
            <code className="mt-1.5 block rounded-md bg-gray-900 px-3 py-2.5 text-xs text-green-300 font-mono leading-relaxed">
              {provenance.formula}
            </code>
            <p className="mt-2 text-xs text-gray-500 leading-relaxed">
              {provenance.description}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-gray-400">
              <span>Function:</span>
              <code className="font-mono text-teal-600">
                {provenance.canonicalFunction}
              </code>
            </div>
          </section>

          {/* Source Fields */}
          <section>
            <SectionLabel icon={Database} label="Source Fields" />
            <div className="mt-1.5 space-y-1.5">
              {provenance.sourceFields.map((field, i) => {
                const badge = AUTOMATION_BADGE[field.automation];
                return (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-md border border-gray-100 bg-white px-2.5 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <code className="text-[11px] font-mono text-gray-700 break-all">
                        {field.field}
                      </code>
                      <p className="mt-0.5 text-[10px] text-gray-400 truncate">
                        {field.source}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] px-1.5 py-0 ${badge?.className ?? ""}`}
                    >
                      {badge?.label ?? field.automation}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Automation Coverage */}
          <section>
            <SectionLabel icon={ShieldCheck} label="Automation Coverage" />
            <div className="mt-1.5 flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all"
                  style={{ width: `${automationPct}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600 tabular-nums w-10 text-right">
                {automationPct}%
              </span>
            </div>
            <div className="mt-1.5 flex gap-3 text-[10px] text-gray-400">
              {Object.entries(automationCounts).map(([level, count]) => (
                <span key={level}>
                  {AUTOMATION_BADGE[level]?.label ?? level}: {count}
                </span>
              ))}
            </div>
          </section>

          {/* Reconciliation Rules */}
          {provenance.reconciliationRules.length > 0 && (
            <section>
              <SectionLabel icon={CheckCircle2} label="Reconciliation Rules" />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {provenance.reconciliationRules.map((rule) => (
                  <Badge
                    key={rule}
                    variant="outline"
                    className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 border-green-200"
                  >
                    {rule}
                  </Badge>
                ))}
                <span className="text-[10px] text-gray-400 self-center ml-1">
                  Tolerance: {provenance.tolerance}
                </span>
              </div>
            </section>
          )}

          {/* Surfaces */}
          <section>
            <SectionLabel icon={Layers} label="Displayed On" />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {provenance.surfaces.map((surface) => (
                <Badge
                  key={surface}
                  variant="secondary"
                  className="text-[10px] px-2 py-0.5"
                >
                  {surface}
                </Badge>
              ))}
            </div>
          </section>

          {/* Override status */}
          <section>
            <SectionLabel
              icon={provenance.overridable ? AlertTriangle : ShieldCheck}
              label="Override Status"
            />
            <p className="mt-1 text-xs text-gray-500">
              {provenance.overridable
                ? "This metric can be manually overridden by administrators."
                : "This metric is derived from canonical formulas and cannot be overridden."}
            </p>
          </section>

          {/* Last Computed */}
          {lastComputed && (
            <section>
              <SectionLabel icon={Clock} label="Last Computed" />
              <p className="mt-1 text-xs text-gray-500 font-mono">
                {new Date(lastComputed).toLocaleString()}
              </p>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Section Label ───────────────────────────────────────────────────────────

function SectionLabel({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-gray-400" />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </span>
    </div>
  );
}
