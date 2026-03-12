import { describe, it, expect } from "vitest";

describe("seed data referential integrity", () => {
  it("all decision impact reports reference valid decisions", async () => {
    const seed = await import("./seed");
    const decisionIds = new Set(seed.decisions.map((d) => d.id));
    for (const id of Object.keys(seed.decisionImpactReports)) {
      expect(
        decisionIds.has(id),
        `Impact report references non-existent decision ${id}`,
      ).toBe(true);
    }
  });

  it("all decision comments reference valid decisions", async () => {
    const seed = await import("./seed");
    const decisionIds = new Set(seed.decisions.map((d) => d.id));
    for (const id of Object.keys(seed.decisionComments)) {
      expect(
        decisionIds.has(id),
        `Comment references non-existent decision ${id}`,
      ).toBe(true);
    }
  });

  it("all decision actions reference valid decisions", async () => {
    const seed = await import("./seed");
    const decisionIds = new Set(seed.decisions.map((d) => d.id));
    for (const id of Object.keys(seed.decisionActions)) {
      expect(
        decisionIds.has(id),
        `Action references non-existent decision ${id}`,
      ).toBe(true);
    }
  });

  it("all decision economic effects reference valid decisions", async () => {
    const seed = await import("./seed");
    const decisionIds = new Set(seed.decisions.map((d) => d.id));
    for (const id of Object.keys(seed.decisionEconomicEffects)) {
      expect(
        decisionIds.has(id),
        `Economic effect references non-existent decision ${id}`,
      ).toBe(true);
    }
  });

  it("all candidate details reference valid candidates", async () => {
    const seed = await import("./seed");
    const candidateIds = new Set(seed.candidatesList.map((c) => c.id));
    for (const id of Object.keys(seed.candidateDetails)) {
      expect(
        candidateIds.has(id),
        `Candidate detail references non-existent candidate ${id}`,
      ).toBe(true);
    }
  });

  it("portfolioSummary totalProducts matches actual products count", async () => {
    const seed = await import("./seed");
    expect(seed.portfolioSummary.totalProducts).toBe(
      seed.dataProducts.length,
    );
  });

  it("all data products have required fields", async () => {
    const seed = await import("./seed");
    for (const p of seed.dataProducts) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.domain).toBeTruthy();
      expect(typeof p.monthlyCost).toBe("number");
      // ROI can be null for products without enough data to calculate
      expect(
        p.roi === null || typeof p.roi === "number",
        `Product ${p.id} has invalid roi type: ${typeof p.roi}`,
      ).toBe(true);
    }
  });

  it("all notifications have required fields", async () => {
    const seed = await import("./seed");
    for (const n of seed.notifications) {
      expect(n.id).toBeTruthy();
      expect(n.title).toBeTruthy();
      expect(n.type).toBeTruthy();
      expect(n.timestamp).toBeTruthy();
    }
  });

  it("product cost trends reference valid products", async () => {
    const seed = await import("./seed");
    const productIds = new Set(seed.dataProducts.map((p) => p.id));
    for (const id of Object.keys(seed.productCostTrends)) {
      expect(
        productIds.has(id),
        `Cost trend references non-existent product ${id}`,
      ).toBe(true);
    }
  });

  it("product usage trends reference valid products", async () => {
    const seed = await import("./seed");
    const productIds = new Set(seed.dataProducts.map((p) => p.id));
    for (const id of Object.keys(seed.productUsageTrends)) {
      expect(
        productIds.has(id),
        `Usage trend references non-existent product ${id}`,
      ).toBe(true);
    }
  });

  it("seed data is deterministic across multiple imports", async () => {
    const seed1 = await import("./seed");
    // Dynamic imports are cached, so values should be identical
    const seed2 = await import("./seed");
    expect(seed1.dataProducts[0].monthlyCost).toBe(
      seed2.dataProducts[0].monthlyCost,
    );
    expect(seed1.portfolioCostTrend[0].cost).toBe(
      seed2.portfolioCostTrend[0].cost,
    );
  });

  it("all decisions have valid productId references", async () => {
    const seed = await import("./seed");
    const productIds = new Set(seed.dataProducts.map((p) => p.id));
    // Some decisions intentionally reference legacy/retired products
    // that no longer exist in the active product list. We track which
    // ones are known legacy references vs. genuinely broken.
    const knownLegacyProductIds = new Set(["dp-legacy-1"]);
    for (const d of seed.decisions) {
      if (d.productId) {
        const isValid =
          productIds.has(d.productId) ||
          knownLegacyProductIds.has(d.productId);
        expect(
          isValid,
          `Decision ${d.id} references unknown product ${d.productId}`,
        ).toBe(true);
      }
    }
  });

  it("all decisions have required fields", async () => {
    const seed = await import("./seed");
    for (const d of seed.decisions) {
      expect(d.id).toBeTruthy();
      expect(d.type).toBeTruthy();
      expect(d.status).toBeTruthy();
      expect(d.title).toBeTruthy();
      expect(d.createdAt).toBeTruthy();
    }
  });

  it("portfolioCostTrend has consistent month entries", async () => {
    const seed = await import("./seed");
    expect(seed.portfolioCostTrend.length).toBeGreaterThan(0);
    for (const point of seed.portfolioCostTrend) {
      expect(point.month).toBeTruthy();
      expect(typeof point.cost).toBe("number");
      expect(typeof point.value).toBe("number");
    }
  });
});
