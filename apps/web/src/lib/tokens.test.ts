import { describe, it, expect } from "vitest";
import {
  card,
  chartColors,
  roiBandColors,
  statusColors,
  typography,
  spacing,
  buttonSize,
  chartAxis,
  spacingScale,
  elevationScale,
  animationDurations,
  animationCurves,
  marketingTypography,
  brand,
} from "./tokens";

describe("card tokens", () => {
  it("base includes rounded-xl", () => {
    expect(card.base).toContain("rounded-xl");
  });

  it("hover includes transition", () => {
    expect(card.hover).toContain("transition");
  });

  it("interactive includes cursor-pointer", () => {
    expect(card.interactive).toContain("cursor-pointer");
  });

  it("container combines base and padding", () => {
    expect(card.container).toContain("rounded-xl");
    expect(card.container).toContain("p-6");
  });

  it("clickable combines interactive and padding", () => {
    expect(card.clickable).toContain("cursor-pointer");
    expect(card.clickable).toContain("p-6");
  });

  it("padding is p-6", () => {
    expect(card.padding).toBe("p-6");
  });
});

describe("chartColors", () => {
  it("has lifecycle colors for all stages", () => {
    expect(chartColors.lifecycle).toHaveProperty("draft");
    expect(chartColors.lifecycle).toHaveProperty("active");
    expect(chartColors.lifecycle).toHaveProperty("growth");
    expect(chartColors.lifecycle).toHaveProperty("mature");
    expect(chartColors.lifecycle).toHaveProperty("decline");
    expect(chartColors.lifecycle).toHaveProperty("retired");
  });

  it("lifecycle colors are hex strings", () => {
    Object.values(chartColors.lifecycle).forEach((color) => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it("has cost breakdown array", () => {
    expect(Array.isArray(chartColors.costBreakdown)).toBe(true);
    expect(chartColors.costBreakdown.length).toBeGreaterThan(0);
  });

  it("has trend line colors", () => {
    expect(chartColors.cost).toBeDefined();
    expect(chartColors.value).toBeDefined();
    expect(chartColors.usage).toBeDefined();
  });
});

describe("roiBandColors", () => {
  it("has all ROI bands", () => {
    expect(roiBandColors).toHaveProperty("high");
    expect(roiBandColors).toHaveProperty("healthy");
    expect(roiBandColors).toHaveProperty("underperforming");
    expect(roiBandColors).toHaveProperty("critical");
    expect(roiBandColors).toHaveProperty("none");
  });

  it("colors are tailwind text classes", () => {
    Object.values(roiBandColors).forEach((cls) => {
      expect(cls).toMatch(/^text-/);
    });
  });
});

describe("statusColors", () => {
  it("has all status types", () => {
    const expected = ["positive", "warning", "negative", "info", "purple", "neutral"];
    expected.forEach((key) => {
      expect(statusColors).toHaveProperty(key);
    });
  });

  it("each status has bg, border, text, icon, badge", () => {
    Object.values(statusColors).forEach((status) => {
      expect(status).toHaveProperty("bg");
      expect(status).toHaveProperty("border");
      expect(status).toHaveProperty("text");
      expect(status).toHaveProperty("icon");
      expect(status).toHaveProperty("badge");
    });
  });
});

describe("typography tokens", () => {
  it("has sectionTitle", () => {
    expect(typography.sectionTitle).toBeDefined();
    expect(typeof typography.sectionTitle).toBe("string");
  });

  it("has displayMono with font-mono and tabular-nums", () => {
    expect(typography.displayMono).toContain("font-mono");
    expect(typography.displayMono).toContain("tabular-nums");
  });

  it("financial figures include tabular-nums", () => {
    expect(typography.displayMono).toContain("tabular-nums");
    expect(typography.valueMono).toContain("tabular-nums");
    expect(typography.tableMono).toContain("tabular-nums");
  });

  it("has all expected keys", () => {
    const keys = [
      "sectionTitle",
      "sectionSubtitle",
      "metricLabel",
      "tableHeader",
      "displayMono",
      "valueMono",
      "tableMono",
    ];
    keys.forEach((key) => {
      expect(typography).toHaveProperty(key);
    });
  });
});

describe("spacing tokens", () => {
  it("has sectionGap", () => {
    expect(spacing.sectionGap).toBeDefined();
  });

  it("has pageGap", () => {
    expect(spacing.pageGap).toBeDefined();
  });

  it("pageShell includes max-width", () => {
    expect(spacing.pageShell).toContain("max-w-");
  });
});

describe("buttonSize tokens", () => {
  it("has sm, md, lg sizes", () => {
    expect(buttonSize).toHaveProperty("sm");
    expect(buttonSize).toHaveProperty("md");
    expect(buttonSize).toHaveProperty("lg");
  });

  it("each size includes height class", () => {
    Object.values(buttonSize).forEach((size) => {
      expect(size).toMatch(/h-\d+/);
    });
  });
});

describe("chartAxis", () => {
  it("has tick config with fontSize", () => {
    expect(chartAxis.tick).toHaveProperty("fontSize");
    expect(typeof chartAxis.tick.fontSize).toBe("number");
  });

  it("has axisLine config", () => {
    expect(chartAxis.axisLine).toHaveProperty("stroke");
  });

  it("has cartesianGrid config", () => {
    expect(chartAxis.cartesianGrid).toHaveProperty("strokeDasharray");
    expect(chartAxis.cartesianGrid).toHaveProperty("stroke");
  });
});

// ── Extended Design Tokens (Visual Identity Sprint) ──

describe("spacingScale", () => {
  it("is an array of 8 values", () => {
    expect(spacingScale).toHaveLength(8);
  });

  it("starts at 4 and ends at 96", () => {
    expect(spacingScale[0]).toBe(4);
    expect(spacingScale[spacingScale.length - 1]).toBe(96);
  });

  it("all values are numbers", () => {
    spacingScale.forEach((v) => expect(typeof v).toBe("number"));
  });
});

describe("elevationScale", () => {
  it("has levels 0, 1, 2", () => {
    expect(elevationScale).toHaveProperty("0");
    expect(elevationScale).toHaveProperty("1");
    expect(elevationScale).toHaveProperty("2");
  });

  it("level 0 is shadow-none", () => {
    expect(elevationScale[0]).toBe("shadow-none");
  });

  it("levels 1 and 2 contain shadow", () => {
    expect(elevationScale[1]).toContain("shadow-");
    expect(elevationScale[2]).toContain("shadow-");
  });
});

describe("animationDurations", () => {
  it("has fast, normal, slow", () => {
    expect(animationDurations).toHaveProperty("fast");
    expect(animationDurations).toHaveProperty("normal");
    expect(animationDurations).toHaveProperty("slow");
  });

  it("values end with ms", () => {
    Object.values(animationDurations).forEach((d) => {
      expect(d).toMatch(/^\d+ms$/);
    });
  });
});

describe("animationCurves", () => {
  it("has default, enter, exit", () => {
    expect(animationCurves).toHaveProperty("default");
    expect(animationCurves).toHaveProperty("enter");
    expect(animationCurves).toHaveProperty("exit");
  });

  it("values are cubic-bezier functions", () => {
    Object.values(animationCurves).forEach((c) => {
      expect(c).toMatch(/^cubic-bezier\(/);
    });
  });
});

describe("marketingTypography", () => {
  it("has hero and section scales", () => {
    expect(marketingTypography).toHaveProperty("heroHeadline");
    expect(marketingTypography).toHaveProperty("heroSubheadline");
    expect(marketingTypography).toHaveProperty("sectionLabel");
    expect(marketingTypography).toHaveProperty("sectionHeadline");
    expect(marketingTypography).toHaveProperty("metricDisplay");
    expect(marketingTypography).toHaveProperty("metricCaption");
  });

  it("metricDisplay includes tabular-nums", () => {
    expect(marketingTypography.metricDisplay).toContain("tabular-nums");
  });
});

describe("brand colors", () => {
  it("has all primary and accent colors", () => {
    expect(brand).toHaveProperty("deepNavy");
    expect(brand).toHaveProperty("offWhite");
    expect(brand).toHaveProperty("graphite");
    expect(brand).toHaveProperty("accentGreen");
    expect(brand).toHaveProperty("alertAmber");
    expect(brand).toHaveProperty("riskRed");
  });

  it("all values are hex colors", () => {
    Object.values(brand).forEach((color) => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it("deepNavy is #0B1220", () => {
    expect(brand.deepNavy).toBe("#0B1220");
  });
});
