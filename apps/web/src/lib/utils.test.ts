import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (className merge utility)", () => {
  it("merges simple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    expect(cn("base", isActive && "active")).toContain("active");
  });

  it("deduplicates tailwind classes", () => {
    // tailwind-merge deduplicates conflicting utility classes
    const result = cn("p-4", "p-8");
    expect(result).toBe("p-8");
  });

  it("handles undefined and null", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("handles empty call", () => {
    expect(cn()).toBe("");
  });

  it("merges conflicting tailwind utilities", () => {
    // tailwind-merge resolves conflicts by keeping the last one
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });
});
