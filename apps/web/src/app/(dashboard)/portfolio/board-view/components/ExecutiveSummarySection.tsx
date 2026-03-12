import { formatCurrency, formatROI } from "@/lib/format";
import type { ExecutiveInsight, PortfolioSummary } from "@/lib/types";

interface ExecutiveSummarySectionProps {
  summary: PortfolioSummary;
  insights: ExecutiveInsight[];
  previousROI: number | null;
  realizedSavings: number;
}

/**
 * Auto-generated narrative paragraph for the board report.
 * Produces 3-4 sentences summarizing portfolio position,
 * ROI trajectory, retirement candidates, and value coverage.
 */
export function ExecutiveSummarySection({
  summary,
  insights,
  previousROI,
  realizedSavings,
}: ExecutiveSummarySectionProps) {
  const s = summary;

  // Compute value coverage
  const valueCoverage = s.totalProducts > 0
    ? Math.round((s.productsWithValue / s.totalProducts) * 100)
    : 0;

  // ROI trajectory sentence
  const roiDirection = previousROI !== null
    ? s.averageROI > previousROI
      ? `improved from ${formatROI(previousROI)} to ${formatROI(s.averageROI)}`
      : s.averageROI < previousROI
        ? `declined from ${formatROI(previousROI)} to ${formatROI(s.averageROI)}`
        : `remained stable at ${formatROI(s.averageROI)}`
    : `stands at ${formatROI(s.averageROI)}`;

  // Retirement / opportunity count
  const opportunities = insights.filter((i) => i.type === "opportunity");
  const risks = insights.filter((i) => i.type === "risk");
  const totalOpportunityImpact = opportunities.reduce(
    (sum, o) => sum + (o.financialImpact ?? 0),
    0,
  );

  // Build the narrative
  const sentences: string[] = [];

  sentences.push(
    `The portfolio comprises ${s.totalProducts} data products with a combined monthly cost of ${formatCurrency(s.totalCost, true)}.`,
  );

  sentences.push(
    `Portfolio ROI has ${roiDirection} over the prior period${realizedSavings > 0 ? `, with ${formatCurrency(realizedSavings, true)}/mo in realized savings from executed decisions` : ""}.`,
  );

  if (s.retirementCandidates > 0) {
    sentences.push(
      `${s.retirementCandidates} product${s.retirementCandidates > 1 ? "s" : ""} ${s.retirementCandidates > 1 ? "are" : "is"} flagged for retirement review, representing ${formatCurrency(s.estimatedSavings, true)}/mo in recoverable spend.`,
    );
  }

  if (opportunities.length > 0 && totalOpportunityImpact > 0) {
    sentences.push(
      `${opportunities.length} capital optimization opportunit${opportunities.length > 1 ? "ies" : "y"} have been identified, with a combined impact of ${formatCurrency(totalOpportunityImpact, true)}/mo.`,
    );
  } else if (risks.length > 0) {
    sentences.push(
      `${risks.length} risk${risks.length > 1 ? "s" : ""} ${risks.length > 1 ? "require" : "requires"} attention to prevent capital erosion.`,
    );
  }

  sentences.push(
    `Value declaration coverage is at ${valueCoverage}% (${s.productsWithValue} of ${s.totalProducts} products)${valueCoverage < 60 ? " — improving coverage will increase forecast accuracy" : ""}.`,
  );

  return (
    <section className="mb-10">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
        Executive Summary
      </h2>
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
        <p className="text-sm text-gray-700 leading-relaxed">
          {sentences.join(" ")}
        </p>
      </div>
    </section>
  );
}
