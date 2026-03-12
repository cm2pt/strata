import Link from "next/link";
import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import {
  FileText,
  User,
  Calendar,
  PauseCircle,
  ArrowUpRight,
} from "lucide-react";
import { formatDate } from "./decision-helpers";
import type { Decision } from "@/lib/types";

export interface DecisionInfoCardProps {
  decision: Decision;
}

export function DecisionInfoCard({ decision }: DecisionInfoCardProps) {
  return (
    <Card>
      <SectionHeader title="Decision Information" icon={FileText} />
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500">Description</p>
            <p className="text-sm text-gray-700 mt-1">{decision.description}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Impact Basis</p>
            <p className="text-sm text-gray-700 mt-1">
              {decision.impactBasis || "Not specified"}
            </p>
          </div>
          {decision.resolution && (
            <div>
              <p className="text-xs text-gray-500">Resolution</p>
              <p className="text-sm text-gray-700 mt-1">
                {decision.resolution}
              </p>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Initiated By</p>
              <p className="text-sm font-medium text-gray-900">
                {decision.initiatedBy}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Assigned To</p>
              <p className="text-sm font-medium text-gray-900">
                {decision.assignedTo}
                {decision.assignedToTitle && (
                  <span className="text-gray-500 font-normal">
                    {" "}
                    ({decision.assignedToTitle})
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p className="text-sm text-gray-700">
                {formatDate(decision.createdAt)}
              </p>
            </div>
          </div>
          {decision.resolvedAt && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Resolved</p>
                <p className="text-sm text-gray-700">
                  {formatDate(decision.resolvedAt)}
                </p>
              </div>
            </div>
          )}
          {decision.delayedUntil && (
            <div className="flex items-center gap-2">
              <PauseCircle className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-xs text-gray-500">Delayed Until</p>
                <p className="text-sm text-orange-700">
                  {formatDate(decision.delayedUntil)}
                </p>
                {decision.delayReason && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {decision.delayReason}
                  </p>
                )}
              </div>
            </div>
          )}
          <Link
            href={`/assets/${decision.productId}`}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            View Product <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
