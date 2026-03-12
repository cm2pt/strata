import { describe, it, expect } from "vitest";
import {
  CHART_COLORS,
  CHART_SEMANTIC,
  PIE_COLORS,
  CHART_GRID,
  CHART_TOOLTIP,
} from "./chart-colors";

describe("chart-colors", () => {
  it("exports primary series colors as hex strings", () => {
    expect(CHART_COLORS.primary).toMatch(/^#[0-9a-f]{6}$/);
    expect(CHART_COLORS.secondary).toMatch(/^#[0-9a-f]{6}$/);
    expect(CHART_COLORS.tertiary).toMatch(/^#[0-9a-f]{6}$/);
    expect(CHART_COLORS.quaternary).toMatch(/^#[0-9a-f]{6}$/);
    expect(CHART_COLORS.quinary).toMatch(/^#[0-9a-f]{6}$/);
    expect(CHART_COLORS.senary).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("exports semantic colors for data types", () => {
    expect(CHART_SEMANTIC.revenue).toBeDefined();
    expect(CHART_SEMANTIC.cost).toBeDefined();
    expect(CHART_SEMANTIC.roi).toBeDefined();
    expect(CHART_SEMANTIC.positive).not.toBe(CHART_SEMANTIC.negative);
  });

  it("exports at least 6 pie chart colors", () => {
    expect(PIE_COLORS.length).toBeGreaterThanOrEqual(6);
    PIE_COLORS.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/));
  });

  it("exports grid styling with stroke and dash", () => {
    expect(CHART_GRID.stroke).toMatch(/^#/);
    expect(CHART_GRID.strokeDasharray).toBeDefined();
  });

  it("exports tooltip content styling", () => {
    expect(CHART_TOOLTIP.contentStyle.backgroundColor).toBe("white");
    expect(CHART_TOOLTIP.contentStyle.borderRadius).toBeDefined();
    expect(CHART_TOOLTIP.contentStyle.fontSize).toBeDefined();
  });
});
