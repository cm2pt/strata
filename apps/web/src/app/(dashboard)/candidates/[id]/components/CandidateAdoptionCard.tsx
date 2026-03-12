import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import {
  Users,
  Layers,
  BarChart3,
  ShieldCheck,
  Database,
} from "lucide-react";
import type { CandidateDetail } from "@/lib/types";

export interface CandidateAdoptionCardProps {
  candidate: CandidateDetail;
}

export function CandidateAdoptionCard({
  candidate,
}: CandidateAdoptionCardProps) {
  return (
    <Card className="lg:col-span-2">
      <SectionHeader title="Adoption & Evidence" icon={Users} />
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Consumer Teams */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Consumer Teams
          </h4>
          {(candidate.consumerTeams ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">No usage data available</p>
          ) : (
            <div className="space-y-2">
              {(candidate.consumerTeams ?? []).map((t) => (
                <div
                  key={t.team}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-gray-700">{t.team}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {t.consumers} users
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evidence */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Evidence Sources
          </h4>
          <div className="space-y-2">
            {!!candidate.evidence["dbt_exposure"] && (
              <div className="flex items-center gap-2 text-sm">
                <Layers className="h-4 w-4 text-orange-500" />
                <span className="text-gray-700">dbt Exposure: </span>
                <span className="font-mono text-xs text-gray-500">
                  {String(candidate.evidence["dbt_exposure"])}
                </span>
              </div>
            )}
            {!!candidate.evidence["powerbi_dataset"] && (
              <div className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4 text-yellow-600" />
                <span className="text-gray-700">Power BI Dataset</span>
              </div>
            )}
            {!!candidate.evidence["certified_asset"] && (
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-gray-700">Certified Asset</span>
              </div>
            )}
            {Array.isArray(candidate.evidence["warehouse_tables"]) && (
              <div className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4 text-sky-500" />
                <span className="text-gray-700">
                  {
                    (candidate.evidence["warehouse_tables"] as string[])
                      .length
                  }{" "}
                  Warehouse Tables
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
