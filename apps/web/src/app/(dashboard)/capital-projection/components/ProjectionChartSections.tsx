import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { TrendingDown, AlertTriangle, Brain } from "lucide-react";
import dynamic from "next/dynamic";

const ROIDriftChart = dynamic(
  () => import("@/components/charts/roi-drift-chart").then(m => ({ default: m.ROIDriftChart })),
  { ssr: false, loading: () => <div className="h-[320px] animate-pulse bg-gray-100 rounded-lg" /> }
);
const LiabilityAccumulationChart = dynamic(
  () => import("@/components/charts/liability-accumulation-chart").then(m => ({ default: m.LiabilityAccumulationChart })),
  { ssr: false, loading: () => <div className="h-[320px] animate-pulse bg-gray-100 rounded-lg" /> }
);
const AIExposureChart = dynamic(
  () => import("@/components/charts/ai-exposure-chart").then(m => ({ default: m.AIExposureChart })),
  { ssr: false, loading: () => <div className="h-[280px] animate-pulse bg-gray-100 rounded-lg" /> }
);

interface ROIDriftChartDataPoint {
  month: number;
  Passive: number;
  Governance: number;
  Active: number;
}

interface LiabilityChartDataPoint {
  month: number;
  "AI Exposure": number;
  "Decline Waste": number;
  "Missed Retirement": number;
  "Governance Erosion": number;
}

interface AIExposureDataPoint {
  month: number;
  "AI Spend": number;
  "Governance Score": number;
}

interface ROIDriftSectionProps {
  data: ROIDriftChartDataPoint[];
}

export function ROIDriftSection({ data }: ROIDriftSectionProps) {
  return (
    <>
      <SectionHeader
        title="Portfolio ROI Drift"
        subtitle="Projected ROI trajectory across 36 months"
        icon={TrendingDown}
      />
      <Card>
        {data.length > 0 ? (
          <ROIDriftChart data={data} />
        ) : (
          <div className="flex items-center justify-center h-[320px] text-sm text-gray-400">No data available</div>
        )}
        <p className="text-[11px] text-gray-400 mt-3">
          Portfolio erosion under passive governance vs. ROI improvement under active capital management. The widening gap represents compounding cost of inaction.
        </p>
      </Card>
    </>
  );
}

interface LiabilityAccumulationSectionProps {
  data: LiabilityChartDataPoint[];
}

export function LiabilityAccumulationSection({ data }: LiabilityAccumulationSectionProps) {
  return (
    <>
      <SectionHeader
        title="Capital Liability Accumulation"
        subtitle="Cumulative cost of inaction under passive governance"
        icon={AlertTriangle}
      />
      <Card>
        {data.length > 0 ? (
          <LiabilityAccumulationChart data={data} />
        ) : (
          <div className="flex items-center justify-center h-[320px] text-sm text-gray-400">No data available</div>
        )}
        <p className="text-[11px] text-gray-400 mt-3">
          Projected liability if capital events are not executed. AI exposure growth, capital trapped in decline-stage assets, missed retirement savings, and governance erosion compound over 36 months.
        </p>
      </Card>
    </>
  );
}

interface AIExposureSectionProps {
  data: AIExposureDataPoint[];
}

export function AIExposureSection({ data }: AIExposureSectionProps) {
  return (
    <>
      <SectionHeader
        title="AI Exposure Risk"
        subtitle="AI spend growth vs governance score under passive governance"
        icon={Brain}
      />
      <Card>
        {data.length > 0 ? (
          <AIExposureChart data={data} />
        ) : (
          <div className="flex items-center justify-center h-[280px] text-sm text-gray-400">No data available</div>
        )}
        <p className="text-[11px] text-gray-400 mt-3">
          ROI compression driven by AI spend growth. Unmanaged AI model costs grow 8%/month while governance capacity erodes without active intervention.
        </p>
      </Card>
    </>
  );
}
