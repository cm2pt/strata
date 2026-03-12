import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatCurrency,
  formatROI,
  formatPercent,
  formatTrend,
  formatNumber,
  formatRelativeTime,
  formatDate,
} from "./format";

// ---------- formatCurrency ----------

describe("formatCurrency", () => {
  it("formats positive whole numbers", () => {
    expect(formatCurrency(1000)).toBe("$1,000");
  });

  it("formats negative numbers", () => {
    expect(formatCurrency(-5000)).toBe("-$5,000");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  it("formats millions compact", () => {
    expect(formatCurrency(2_500_000, true)).toBe("$2.5M");
  });

  it("formats thousands compact", () => {
    expect(formatCurrency(18_400, true)).toBe("$18.4K");
  });

  it("formats small numbers compact", () => {
    expect(formatCurrency(500, true)).toBe("$500");
  });

  it("formats negative compact millions", () => {
    expect(formatCurrency(-3_000_000, true)).toBe("-$3.0M");
  });

  it("formats negative compact thousands", () => {
    expect(formatCurrency(-8_200, true)).toBe("-$8.2K");
  });

  it("formats large non-compact numbers with commas", () => {
    expect(formatCurrency(1_234_567)).toBe("$1,234,567");
  });

  it("returns dash for null", () => {
    expect(formatCurrency(null)).toBe("—");
  });

  it("returns dash for undefined", () => {
    expect(formatCurrency(undefined)).toBe("—");
  });
});

// ---------- formatROI ----------

describe("formatROI", () => {
  it("formats positive ROI", () => {
    expect(formatROI(3.4)).toBe("3.4x");
  });

  it("formats zero ROI", () => {
    expect(formatROI(0)).toBe("0.0x");
  });

  it("formats negative ROI", () => {
    expect(formatROI(-1.2)).toBe("-1.2x");
  });

  it("returns dash for null", () => {
    expect(formatROI(null)).toBe("—");
  });

  it("returns dash for undefined", () => {
    expect(formatROI(undefined)).toBe("—");
  });
});

// ---------- formatPercent ----------

describe("formatPercent", () => {
  it("formats decimal as percent", () => {
    expect(formatPercent(0.75)).toBe("75%");
  });

  it("formats with decimals", () => {
    expect(formatPercent(0.753, 1)).toBe("75.3%");
  });

  it("formats zero", () => {
    expect(formatPercent(0)).toBe("0%");
  });

  it("formats greater than 100%", () => {
    expect(formatPercent(1.5)).toBe("150%");
  });

  it("returns dash for null", () => {
    expect(formatPercent(null)).toBe("—");
  });

  it("returns dash for undefined", () => {
    expect(formatPercent(undefined)).toBe("—");
  });
});

// ---------- formatTrend ----------

describe("formatTrend", () => {
  it("formats positive trend with +", () => {
    expect(formatTrend(12)).toBe("+12%");
  });

  it("formats negative trend", () => {
    expect(formatTrend(-5)).toBe("-5%");
  });

  it("formats zero trend", () => {
    expect(formatTrend(0)).toBe("0%");
  });
});

// ---------- formatNumber ----------

describe("formatNumber", () => {
  it("formats with commas", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("formats small numbers", () => {
    expect(formatNumber(42)).toBe("42");
  });

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });
});

// ---------- formatRelativeTime ----------

describe("formatRelativeTime", () => {
  let now: Date;

  beforeEach(() => {
    now = new Date("2026-02-23T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for < 1 hour", () => {
    const recent = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    expect(formatRelativeTime(recent)).toBe("just now");
  });

  it("returns hours for < 24h", () => {
    const hoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(hoursAgo)).toBe("5h ago");
  });

  it("returns days for < 7 days", () => {
    const daysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(daysAgo)).toBe("3d ago");
  });

  it("returns weeks for < 30 days", () => {
    const weeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(weeksAgo)).toBe("2w ago");
  });

  it("returns formatted date for > 30 days", () => {
    const old = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(old);
    // Should be a short date like "Dec 25"
    expect(result).toMatch(/\w{3} \d{1,2}/);
  });

  it("returns \u2014 for invalid date string", () => {
    expect(formatRelativeTime("not-a-date")).toBe("\u2014");
  });

  it("returns \u2014 for empty string", () => {
    expect(formatRelativeTime("")).toBe("\u2014");
  });
});

// ---------- formatDate ----------

describe("formatDate", () => {
  it("formats ISO date string", () => {
    const result = formatDate("2026-02-23T12:00:00Z");
    expect(result).toContain("Feb");
    expect(result).toContain("23");
    expect(result).toContain("2026");
  });

  it("returns \u2014 for invalid date string", () => {
    expect(formatDate("not-a-date")).toBe("\u2014");
  });

  it("returns \u2014 for empty string", () => {
    expect(formatDate("")).toBe("\u2014");
  });

  it("formats a valid date correctly", () => {
    const result = formatDate("2026-02-25T12:00:00Z");
    expect(result).toContain("Feb");
    expect(result).toContain("25");
    expect(result).toContain("2026");
  });
});
