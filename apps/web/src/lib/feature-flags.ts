/**
 * Strata -- Feature Flags
 *
 * Simple environment-variable-based feature flags.
 * In production, these could be backed by LaunchDarkly, Unleash, etc.
 */

type FeatureFlag =
  | "COMMAND_PALETTE"
  | "WEB_VITALS"
  | "OFFLINE_INDICATOR"
  | "ROUTE_PROGRESS"
  | "DEMO_BANNER";

/** Default flag values */
const DEFAULTS: Record<FeatureFlag, boolean> = {
  COMMAND_PALETTE: true,
  WEB_VITALS: true,
  OFFLINE_INDICATOR: true,
  ROUTE_PROGRESS: true,
  DEMO_BANNER: true,
};

/** Runtime overrides from environment variables */
function getEnvOverride(flag: FeatureFlag): boolean | null {
  if (typeof window === "undefined") return null;
  const key = `NEXT_PUBLIC_FF_${flag}`;
  const val = process.env[key];
  if (val === "true") return true;
  if (val === "false") return false;
  return null;
}

/**
 * Check if a feature flag is enabled.
 * Resolution order: environment variable override (`NEXT_PUBLIC_FF_<FLAG>`) > default value.
 * @param flag - The feature flag name to check
 * @returns `true` if the flag is enabled, `false` otherwise
 * @example
 * if (isEnabled("COMMAND_PALETTE")) {
 *   registerCommandPalette();
 * }
 */
export function isEnabled(flag: FeatureFlag): boolean {
  const override = getEnvOverride(flag);
  if (override !== null) return override;
  return DEFAULTS[flag];
}

/**
 * React hook for checking feature flags in components.
 * Reads the flag value once on mount (flags are static per build).
 * @param flag - The feature flag name to check
 * @returns `true` if the flag is enabled, `false` otherwise
 * @example
 * function App() {
 *   const showPalette = useFeatureFlag("COMMAND_PALETTE");
 *   return showPalette ? <CommandPalette /> : null;
 * }
 */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  return isEnabled(flag);
}
