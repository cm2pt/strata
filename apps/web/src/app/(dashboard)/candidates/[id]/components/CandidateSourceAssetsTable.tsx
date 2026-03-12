import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { Database } from "lucide-react";
import type { CandidateSourceAsset } from "@/lib/types";

const PLATFORM_COLORS: Record<string, { bg: string; text: string }> = {
  snowflake: { bg: "bg-sky-50", text: "text-sky-700" },
  databricks: { bg: "bg-red-50", text: "text-red-700" },
  dbt: { bg: "bg-orange-50", text: "text-orange-700" },
  powerbi: { bg: "bg-yellow-50", text: "text-yellow-700" },
  s3: { bg: "bg-emerald-50", text: "text-emerald-700" },
};

function AssetRow({ asset }: { asset: CandidateSourceAsset }) {
  const platColors = PLATFORM_COLORS[asset.platform ?? ""] ?? {
    bg: "bg-gray-50",
    text: "text-gray-700",
  };
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-gray-900">
              {asset.displayName ?? asset.assetName}
            </div>
            {asset.qualifiedName && (
              <div className="text-xs text-gray-400 font-mono truncate max-w-[300px]">
                {asset.qualifiedName}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="py-2.5 pr-3">
        {asset.platform && (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${platColors.bg} ${platColors.text}`}
          >
            {asset.platform}
          </span>
        )}
      </td>
      <td className="py-2.5 pr-3">
        <span className="text-xs text-gray-500">{asset.assetType}</span>
      </td>
      <td className="py-2.5 pr-3">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            asset.role === "primary"
              ? "bg-blue-50 text-blue-700"
              : asset.role === "consumption"
                ? "bg-amber-50 text-amber-700"
                : "bg-gray-100 text-gray-600"
          }`}
        >
          {asset.role}
        </span>
      </td>
      <td className="py-2.5">
        <div className="flex flex-wrap gap-1">
          {(asset.tags ?? []).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      </td>
    </tr>
  );
}

export interface CandidateSourceAssetsTableProps {
  members: CandidateSourceAsset[];
}

export function CandidateSourceAssetsTable({
  members,
}: CandidateSourceAssetsTableProps) {
  return (
    <Card>
      <SectionHeader
        title="Source Assets"
        subtitle={`${members.length} assets included`}
        icon={Database}
      />
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 font-medium">Asset</th>
              <th className="pb-2 font-medium">Platform</th>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">Role</th>
              <th className="pb-2 font-medium">Tags</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((m) => (
              <AssetRow key={m.id} asset={m} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
