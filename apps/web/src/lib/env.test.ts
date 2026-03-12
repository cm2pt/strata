import { describe, it, expect } from "vitest";
import { env, logEnvStatus } from "./env";

describe("env", () => {
  it("exports env object with expected keys", () => {
    expect(env).toHaveProperty("NEXT_PUBLIC_API_URL");
    expect(env).toHaveProperty("NEXT_PUBLIC_BUILD_ID");
  });

  it("env values are string or undefined", () => {
    expect(
      typeof env.NEXT_PUBLIC_API_URL === "string" ||
        env.NEXT_PUBLIC_API_URL === undefined,
    ).toBe(true);
    expect(
      typeof env.NEXT_PUBLIC_BUILD_ID === "string" ||
        env.NEXT_PUBLIC_BUILD_ID === undefined,
    ).toBe(true);
  });

  describe("logEnvStatus", () => {
    it("does not throw in test environment", () => {
      expect(() => logEnvStatus()).not.toThrow();
    });
  });
});
