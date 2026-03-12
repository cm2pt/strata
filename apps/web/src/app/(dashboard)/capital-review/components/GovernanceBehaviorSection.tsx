"use client";

import { SectionHeader } from "@/components/shared/section-header";
import { Card } from "@/components/shared/card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Shield,
  Activity,
  Zap,
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import type { CapitalBehavior } from "@/lib/types";

export interface GovernanceBehaviorSectionProps {
  behavior: CapitalBehavior | null;
}

export function GovernanceBehaviorSection({ behavior }: GovernanceBehaviorSectionProps) {
  return (
    <>
      <SectionHeader title="Governance Behavior" icon={Shield} />

      {behavior ? (
        <>
          {/* Health Score Banner */}
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-blue-200">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wider">Governance Health Score</p>
                <p className="text-3xl font-bold text-blue-900 font-mono">
                  {behavior.governanceHealthScore}
                  <span className="text-sm font-normal text-blue-600">/100</span>
                </p>
              </div>
            </div>
          </Card>

          {/* 5 Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-blue-500" />
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Decision Velocity</span>
              </div>
              <p className="text-xl font-bold font-mono text-gray-900">{behavior.avgDecisionVelocityDays}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">days avg to resolve</p>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-emerald-500" />
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Value Coverage</span>
              </div>
              <p className="text-xl font-bold font-mono text-gray-900">{behavior.valueDeclarationCoveragePct}%</p>
              <p className="text-[10px] text-gray-500 mt-0.5">products with declarations</p>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Review Overdue</span>
              </div>
              <p className={`text-xl font-bold font-mono ${behavior.reviewOverduePct > 20 ? "text-amber-600" : "text-gray-900"}`}>
                {behavior.reviewOverduePct}%
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">declarations past due</p>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Enforcement Rate</span>
              </div>
              <p className={`text-xl font-bold font-mono ${behavior.enforcementTriggerRate > 30 ? "text-red-600" : "text-gray-900"}`}>
                {behavior.enforcementTriggerRate}%
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">products flagged</p>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Impact Confirmed</span>
              </div>
              <p className="text-xl font-bold font-mono text-gray-900">{behavior.impactConfirmationRate}%</p>
              <p className="text-[10px] text-gray-500 mt-0.5">decisions verified</p>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <EmptyState
            icon={Shield}
            title="No governance behavior data"
            description="Governance metrics appear once decisions and value declarations are tracked in the system."
          />
        </Card>
      )}
    </>
  );
}
