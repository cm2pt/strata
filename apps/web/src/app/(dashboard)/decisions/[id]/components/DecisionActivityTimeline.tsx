import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { Clock, Plus } from "lucide-react";
import { ACTION_ICONS, ACTION_LABELS, formatDateTime } from "./decision-helpers";
import type { DecisionAction } from "@/lib/types";

export interface DecisionActivityTimelineProps {
  actions: DecisionAction[];
}

export function DecisionActivityTimeline({
  actions,
}: DecisionActivityTimelineProps) {
  if (actions.length === 0) return null;

  return (
    <Card>
      <SectionHeader title="Activity Timeline" icon={Clock} />
      <div className="mt-4 relative">
        {/* Vertical connector line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

        <div className="space-y-4">
          {actions.map((a) => {
            const Icon = ACTION_ICONS[a.actionType] ?? Plus;
            const label = ACTION_LABELS[a.actionType] ?? a.actionType;
            const iconColor =
              a.actionType === "approved"
                ? "text-emerald-600 bg-emerald-50"
                : a.actionType === "rejected"
                  ? "text-red-600 bg-red-50"
                  : a.actionType === "delayed"
                    ? "text-orange-600 bg-orange-50"
                    : a.actionType === "commented"
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-600 bg-gray-100";

            return (
              <div key={a.id} className="relative flex items-start gap-3 pl-1">
                <div
                  className={`z-10 flex h-7 w-7 items-center justify-center rounded-full ${iconColor}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{label}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDateTime(a.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
