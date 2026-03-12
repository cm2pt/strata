import { describe, it, expect } from "vitest";
import {
  METRIC_PROVENANCE,
  getMetricProvenance,
  getMetricKeys,
} from "./provenance";

describe("provenance", () => {
  describe("METRIC_PROVENANCE registry", () => {
    it("contains expected metric keys", () => {
      const keys = Object.keys(METRIC_PROVENANCE);
      expect(keys).toContain("portfolio_monthly_spend");
      expect(keys).toContain("portfolio_average_roi");
      expect(keys).toContain("capital_freed");
      expect(keys).toContain("capital_freed_annual");
      expect(keys).toContain("capital_misallocated");
      expect(keys).toContain("cei_score");
      expect(keys).toContain("total_consumers");
      expect(keys).toContain("product_composite_value");
      expect(keys).toContain("product_roi");
      expect(keys).toContain("decision_velocity");
      expect(keys).toContain("confirmed_savings");
      expect(keys).toContain("projected_savings");
    });

    it("each entry has required fields", () => {
      for (const [key, info] of Object.entries(METRIC_PROVENANCE)) {
        expect(info.label, `${key}.label`).toBeTruthy();
        expect(info.formula, `${key}.formula`).toBeTruthy();
        expect(info.description, `${key}.description`).toBeTruthy();
        expect(info.canonicalFunction, `${key}.canonicalFunction`).toBeTruthy();
        expect(Array.isArray(info.sourceFields), `${key}.sourceFields`).toBe(true);
        expect(info.sourceFields.length, `${key}.sourceFields.length`).toBeGreaterThan(0);
        expect(Array.isArray(info.reconciliationRules), `${key}.reconciliationRules`).toBe(true);
        expect(Array.isArray(info.surfaces), `${key}.surfaces`).toBe(true);
        expect(info.surfaces.length, `${key}.surfaces.length`).toBeGreaterThan(0);
        expect(typeof info.tolerance, `${key}.tolerance`).toBe("string");
        expect(typeof info.overridable, `${key}.overridable`).toBe("boolean");
      }
    });

    it("source fields have valid automation levels", () => {
      const validLevels = ["fully_automated", "semi_automated", "manual"];
      for (const [key, info] of Object.entries(METRIC_PROVENANCE)) {
        for (const sf of info.sourceFields) {
          expect(validLevels, `${key} → ${sf.field}`).toContain(sf.automation);
        }
      }
    });

    it("no metric is overridable", () => {
      for (const info of Object.values(METRIC_PROVENANCE)) {
        expect(info.overridable).toBe(false);
      }
    });
  });

  describe("getMetricProvenance", () => {
    it("returns info for known metric", () => {
      const info = getMetricProvenance("portfolio_monthly_spend");
      expect(info).toBeDefined();
      expect(info!.label).toBe("Portfolio Monthly Spend");
    });

    it("returns undefined for unknown metric", () => {
      expect(getMetricProvenance("nonexistent")).toBeUndefined();
    });
  });

  describe("getMetricKeys", () => {
    it("returns all keys from the registry", () => {
      const keys = getMetricKeys();
      expect(keys.length).toBe(Object.keys(METRIC_PROVENANCE).length);
      expect(keys).toContain("portfolio_monthly_spend");
      expect(keys).toContain("cei_score");
    });
  });
});
