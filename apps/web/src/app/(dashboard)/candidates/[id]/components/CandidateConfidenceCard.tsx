import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { Sparkles } from "lucide-react";
import type { CandidateDetail } from "@/lib/types";

function ConfidenceBreakdown({
  breakdown,
}: {
  breakdown: Record<string, number>;
}) {
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => {
        const label = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        const isNeg = value < 0;
        return (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{label}</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                {!isNeg ? (
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{
                      width: `${(Math.min(value, 45) / 45) * 100}%`,
                    }}
                  />
                ) : (
                  <div
                    className="h-full bg-red-400 rounded-full float-right"
                    style={{
                      width: `${(Math.min(Math.abs(value), 20) / 20) * 100}%`,
                    }}
                  />
                )}
              </div>
              <span
                className={`font-mono text-xs font-medium ${isNeg ? "text-red-600" : "text-emerald-600"}`}
              >
                {isNeg ? "" : "+"}
                {value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface CandidateConfidenceCardProps {
  candidate: CandidateDetail;
}

export function CandidateConfidenceCard({
  candidate,
}: CandidateConfidenceCardProps) {
  const confidenceColor =
    candidate.confidenceScore >= 80
      ? "text-emerald-600"
      : candidate.confidenceScore >= 60
        ? "text-blue-600"
        : candidate.confidenceScore >= 40
          ? "text-amber-600"
          : "text-red-600";

  return (
    <Card className="lg:col-span-1">
      <SectionHeader title="Confidence Breakdown" icon={Sparkles} />
      <div className="mt-4">
        <div className="flex items-center justify-center mb-6">
          <div className="relative flex items-center justify-center">
            <svg
              className="h-24 w-24 -rotate-90"
              viewBox="0 0 36 36"
            >
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke={
                  candidate.confidenceScore >= 80
                    ? "#10b981"
                    : candidate.confidenceScore >= 60
                      ? "#3b82f6"
                      : candidate.confidenceScore >= 40
                        ? "#f59e0b"
                        : "#ef4444"
                }
                strokeWidth="3"
                strokeDasharray={`${candidate.confidenceScore * 0.9735} 100`}
                strokeLinecap="round"
              />
            </svg>
            <span
              className={`absolute text-xl font-bold ${confidenceColor}`}
            >
              {candidate.confidenceScore}
            </span>
          </div>
        </div>
        <ConfidenceBreakdown breakdown={candidate.confidenceBreakdown} />
      </div>
    </Card>
  );
}
