/**
 * Metric Provenance Registry
 *
 * Maps metric keys to their canonical formulas, source systems,
 * and reconciliation rules. Used by MetricProvenanceDrawer.
 *
 * See: /docs/DATA_COHERENCE_CONTRACT.md
 */

export interface MetricProvenanceInfo {
  /** Human-readable metric name */
  label: string;
  /** Canonical formula (code-like) */
  formula: string;
  /** Plain-English explanation */
  description: string;
  /** Which canonical function computes this */
  canonicalFunction: string;
  /** Source data fields used in computation */
  sourceFields: Array<{
    field: string;
    source: string;
    automation: "fully_automated" | "semi_automated" | "manual";
  }>;
  /** Reconciliation rule ID(s) from the coherence contract */
  reconciliationRules: string[];
  /** Which UI surfaces display this metric */
  surfaces: string[];
  /** Tolerance for cross-surface comparisons */
  tolerance: string;
  /** Whether manual overrides are possible */
  overridable: boolean;
}

/** Registry of all portfolio-level metric provenance */
export const METRIC_PROVENANCE: Record<string, MetricProvenanceInfo> = {
  portfolio_monthly_spend: {
    label: "Portfolio Monthly Spend",
    formula: "SUM(product.monthlyCost) for ALL non-retired products",
    description:
      "Total monthly cost across all active data products in the portfolio. Each product's cost is the sum of its compute, storage, pipeline, and human estimate components.",
    canonicalFunction: "computePortfolioMonthlySpend()",
    sourceFields: [
      { field: "product.monthlyCost", source: "Cost connector (Snowflake, Databricks, S3)", automation: "fully_automated" },
      { field: "product.costBreakdown.compute", source: "Platform billing API", automation: "fully_automated" },
      { field: "product.costBreakdown.storage", source: "Platform billing API", automation: "fully_automated" },
      { field: "product.costBreakdown.pipeline", source: "Orchestration logs", automation: "semi_automated" },
      { field: "product.costBreakdown.humanEstimate", source: "Manual entry", automation: "manual" },
    ],
    reconciliationRules: ["R1", "R2"],
    surfaces: ["Portfolio", "Capital Review", "Board View", "Executive Summary"],
    tolerance: "Exact (0%)",
    overridable: false,
  },

  portfolio_average_roi: {
    label: "Portfolio Average ROI",
    formula: "SUM(compositeValue) / SUM(monthlyCost) for active products with cost > 0",
    description:
      "Cost-weighted average ROI across the portfolio. NOT a simple average of product ROIs — products with higher costs contribute more to the portfolio ROI.",
    canonicalFunction: "computePortfolioROI()",
    sourceFields: [
      { field: "product.compositeValue", source: "Canonical: 70% declared + 30% usage-implied", automation: "semi_automated" },
      { field: "product.monthlyCost", source: "Cost connector", automation: "fully_automated" },
      { field: "product.declaredValue", source: "Value declaration (stakeholder)", automation: "manual" },
      { field: "product.usageImpliedValue", source: "Usage analytics", automation: "fully_automated" },
    ],
    reconciliationRules: ["R3", "R5"],
    surfaces: ["Portfolio", "Capital Impact", "Board View", "Capital Review", "Capital Projection"],
    tolerance: "±0.01",
    overridable: false,
  },

  capital_freed: {
    label: "Capital Freed (Monthly)",
    formula: "SUM(capital_event.amount) for all approved events",
    description:
      "Monthly run-rate savings from approved retirement and cost optimization decisions. Created when decisions are approved and capital events are recorded.",
    canonicalFunction: "computeCapitalFreed()",
    sourceFields: [
      { field: "capitalEvent.amount", source: "Decision approval workflow", automation: "semi_automated" },
      { field: "decision.capitalFreed", source: "Decision record", automation: "semi_automated" },
      { field: "capitalEvent.eventType", source: "Decision type classification", automation: "fully_automated" },
    ],
    reconciliationRules: ["R4"],
    surfaces: ["Savings Summary", "Capital Impact", "Board View", "Portfolio"],
    tolerance: "Exact (0%)",
    overridable: false,
  },

  capital_freed_annual: {
    label: "Capital Freed (Annual)",
    formula: "capital_freed_monthly × 12",
    description:
      "Annualized capital freed — simply the monthly run-rate multiplied by 12. Represents projected annual savings if current run-rate holds.",
    canonicalFunction: "computeCapitalFreed() × 12",
    sourceFields: [
      { field: "capitalEvent.amount", source: "Decision approval workflow", automation: "semi_automated" },
    ],
    reconciliationRules: ["R4"],
    surfaces: ["Savings Summary", "Capital Impact", "Board View"],
    tolerance: "Exact (0%)",
    overridable: false,
  },

  capital_misallocated: {
    label: "Capital Misallocated",
    formula: "SUM(monthlyCost) for products WHERE roi < 1.0 AND lifecycle != 'retired'",
    description:
      "Total monthly spend on products that return less value than they cost (ROI below 1.0×). Excludes retired products.",
    canonicalFunction: "computeCapitalMisallocated()",
    sourceFields: [
      { field: "product.roi", source: "Canonical: compositeValue / monthlyCost", automation: "semi_automated" },
      { field: "product.monthlyCost", source: "Cost connector", automation: "fully_automated" },
      { field: "product.lifecycleStage", source: "Product metadata", automation: "semi_automated" },
    ],
    reconciliationRules: [],
    surfaces: ["Portfolio", "Board View"],
    tolerance: "Exact (0%)",
    overridable: false,
  },

  cei_score: {
    label: "Capital Efficiency Index (CEI)",
    formula: "SUM(component_scores) range: [0, 100]",
    description:
      "Composite score measuring how efficiently the organization manages its data capital. Six components: ROI coverage (20), action rate (20), savings accuracy (15), capital freed ratio (15), value governance (15), AI exposure (15).",
    canonicalFunction: "computeCEI()",
    sourceFields: [
      { field: "products (ROI distribution)", source: "Product metrics", automation: "semi_automated" },
      { field: "decisions (action rate)", source: "Decision workflow", automation: "fully_automated" },
      { field: "capitalEvents (freed ratio)", source: "Capital events", automation: "semi_automated" },
      { field: "valueDeclarations (governance)", source: "Stakeholder declarations", automation: "manual" },
    ],
    reconciliationRules: ["R6"],
    surfaces: ["Capital Efficiency", "Board View", "Capital Projection"],
    tolerance: "±0.1",
    overridable: false,
  },

  total_consumers: {
    label: "Total Consumers",
    formula: "SUM(product.monthlyConsumers) for active products",
    description:
      "Aggregate count of unique monthly consumers across all active data products. Each product's consumer count comes from usage analytics.",
    canonicalFunction: "computeTotalConsumers()",
    sourceFields: [
      { field: "product.monthlyConsumers", source: "Usage analytics / query logs", automation: "fully_automated" },
    ],
    reconciliationRules: ["R8"],
    surfaces: ["Portfolio"],
    tolerance: "Exact (0)",
    overridable: false,
  },

  product_composite_value: {
    label: "Composite Value",
    formula: "0.7 × declaredValue + 0.3 × usageImpliedValue",
    description:
      "Blended value metric combining stakeholder-declared value (70% weight) with usage-implied value (30% weight). When declared value is null, only the usage component contributes.",
    canonicalFunction: "computeCompositeValue()",
    sourceFields: [
      { field: "product.declaredValue", source: "Value declaration (stakeholder)", automation: "manual" },
      { field: "product.usageImpliedValue", source: "Usage analytics regression model", automation: "fully_automated" },
    ],
    reconciliationRules: ["R2"],
    surfaces: ["Asset Detail", "Portfolio", "Allocation"],
    tolerance: "Exact (0%)",
    overridable: false,
  },

  product_roi: {
    label: "Product ROI",
    formula: "compositeValue / monthlyCost (null when cost=0 or value=0)",
    description:
      "Return on investment for a single data product. Measures how much value is generated per dollar of cost. Products with zero cost or zero value have null ROI.",
    canonicalFunction: "computeProductROI()",
    sourceFields: [
      { field: "product.compositeValue", source: "Canonical formula", automation: "semi_automated" },
      { field: "product.monthlyCost", source: "Cost connector", automation: "fully_automated" },
    ],
    reconciliationRules: ["R2"],
    surfaces: ["Asset Detail", "Portfolio", "Rebalance"],
    tolerance: "Exact",
    overridable: false,
  },

  decision_velocity: {
    label: "Decision Velocity",
    formula: "AVG(resolvedAt - createdAt) in days for approved/rejected decisions",
    description:
      "Average time from decision creation to resolution. Lower is better — indicates faster governance response to retirement candidates and cost investigations.",
    canonicalFunction: "computeDecisionVelocity()",
    sourceFields: [
      { field: "decision.createdAt", source: "Decision workflow", automation: "fully_automated" },
      { field: "decision.resolvedAt", source: "Decision workflow", automation: "fully_automated" },
    ],
    reconciliationRules: [],
    surfaces: ["Capital Behavior", "Board View"],
    tolerance: "±0.1 days",
    overridable: false,
  },

  confirmed_savings: {
    label: "Confirmed Savings",
    formula: "SUM(amount) for events WHERE validationStatus = 'confirmed'",
    description:
      "Capital freed from decisions that have been validated as delivering their projected savings. Provides the board with confidence in realized value.",
    canonicalFunction: "computeConfirmedSavings()",
    sourceFields: [
      { field: "capitalEvent.amount", source: "Decision approval workflow", automation: "semi_automated" },
      { field: "capitalEvent.validationStatus", source: "Impact validation process", automation: "semi_automated" },
    ],
    reconciliationRules: ["R4"],
    surfaces: ["Board View"],
    tolerance: "Exact (0%)",
    overridable: false,
  },

  projected_savings: {
    label: "Projected Savings",
    formula: "SUM(amount) for events WHERE validationStatus IN ('validating', 'pending')",
    description:
      "Capital freed from decisions still undergoing impact validation. These savings are expected but not yet confirmed.",
    canonicalFunction: "computeProjectedSavings()",
    sourceFields: [
      { field: "capitalEvent.amount", source: "Decision approval workflow", automation: "semi_automated" },
      { field: "capitalEvent.validationStatus", source: "Impact validation process", automation: "semi_automated" },
    ],
    reconciliationRules: ["R4"],
    surfaces: ["Board View"],
    tolerance: "Exact (0%)",
    overridable: false,
  },
};

/** Look up provenance by metric key */
export function getMetricProvenance(
  key: string,
): MetricProvenanceInfo | undefined {
  return METRIC_PROVENANCE[key];
}

/** Get all available metric keys */
export function getMetricKeys(): string[] {
  return Object.keys(METRIC_PROVENANCE);
}
