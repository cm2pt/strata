// ============================================================
// Strata — Capital Intelligence Engine
//
// Barrel export for all engine modules.
// ============================================================

export {
  computeEconomicSignals,
  buildSignalIndex,
  computePortfolioSignalSummary,
  ESE_WEIGHTS,
  type EconomicSignalResult,
  type CostSignals,
  type UsageSignals,
  type StructuralSignals,
  type DecisionSignals,
  type StabilitySignals,
  type PortfolioSignalSummary,
} from "./economic-signals";

export {
  computeOpportunityCost,
  OPPORTUNITY_COST_CONFIG,
  type OpportunityCostResult,
  type ProductOpportunityCost,
} from "./opportunity-cost";

export {
  computePortfolioFrontier,
  type FrontierResult,
  type FrontierPoint,
} from "./frontier";

export {
  computeValueAttribution,
  ATTRIBUTION_WEIGHTS,
  type AttributionResult,
  type ProductAttribution,
  type EventAttributionDetail,
} from "./value-attribution";

export {
  computeValueInference,
  INFERENCE_WEIGHTS,
  type ValueInferenceResult,
  type InferredValue,
  type ValueMismatch,
} from "./value-inference";

export {
  computeLearningLoop,
  type LearningLoopResult,
  type ProjectionAccuracy,
  type DomainEfficiencyTrend,
  type OwnerAccuracy,
  type ValueInflationFlag,
  type WeightAdjustmentSuggestion,
  type ConfidenceAdjustment,
} from "./learning-loop";
