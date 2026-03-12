import { describe, it, expect } from "vitest";
import { isEnabled, useFeatureFlag } from "./feature-flags";

describe("feature-flags", () => {
  describe("isEnabled", () => {
    it("returns true for COMMAND_PALETTE by default", () => {
      expect(isEnabled("COMMAND_PALETTE")).toBe(true);
    });

    it("returns true for WEB_VITALS by default", () => {
      expect(isEnabled("WEB_VITALS")).toBe(true);
    });

    it("returns true for OFFLINE_INDICATOR by default", () => {
      expect(isEnabled("OFFLINE_INDICATOR")).toBe(true);
    });

    it("returns true for ROUTE_PROGRESS by default", () => {
      expect(isEnabled("ROUTE_PROGRESS")).toBe(true);
    });

    it("returns true for DEMO_BANNER by default", () => {
      expect(isEnabled("DEMO_BANNER")).toBe(true);
    });
  });

  describe("useFeatureFlag", () => {
    it("delegates to isEnabled", () => {
      expect(useFeatureFlag("COMMAND_PALETTE")).toBe(isEnabled("COMMAND_PALETTE"));
    });
  });
});
