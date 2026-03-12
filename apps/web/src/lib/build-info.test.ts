import { describe, it, expect } from "vitest";
import { BUILD_ID } from "./build-info";

describe("build-info", () => {
  it("exports BUILD_ID as a string", () => {
    expect(typeof BUILD_ID).toBe("string");
  });

  it("defaults to 'development' when env var is not set", () => {
    expect(BUILD_ID).toBe("development");
  });
});
