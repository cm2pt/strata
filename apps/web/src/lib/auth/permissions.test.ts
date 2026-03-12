import { describe, it, expect } from "vitest";
import { ROUTE_PERMISSIONS, getRequiredPermission } from "./permissions";

describe("ROUTE_PERMISSIONS", () => {
  it("maps known routes to permissions", () => {
    expect(ROUTE_PERMISSIONS["/portfolio"]).toBe("portfolio:read");
    expect(ROUTE_PERMISSIONS["/candidates"]).toBe("candidates:read");
    expect(ROUTE_PERMISSIONS["/assets"]).toBe("products:read");
    expect(ROUTE_PERMISSIONS["/lifecycle"]).toBe("lifecycle:read");
    expect(ROUTE_PERMISSIONS["/decisions"]).toBe("decisions:read");
    expect(ROUTE_PERMISSIONS["/allocation"]).toBe("allocation:read");
    expect(ROUTE_PERMISSIONS["/ai-scorecard"]).toBe("ai:read");
    expect(ROUTE_PERMISSIONS["/marketplace"]).toBe("marketplace:read");
    expect(ROUTE_PERMISSIONS["/simulate"]).toBe("pricing:simulate");
    expect(ROUTE_PERMISSIONS["/setup"]).toBe("connectors:read");
  });

  it("maps capital routes to capital:read", () => {
    expect(ROUTE_PERMISSIONS["/capital-impact"]).toBe("capital:read");
    expect(ROUTE_PERMISSIONS["/capital-review"]).toBe("capital:read");
    expect(ROUTE_PERMISSIONS["/capital-projection"]).toBe("capital:read");
  });
});

describe("getRequiredPermission", () => {
  it("returns exact match for known routes", () => {
    expect(getRequiredPermission("/portfolio")).toBe("portfolio:read");
    expect(getRequiredPermission("/assets")).toBe("products:read");
    expect(getRequiredPermission("/decisions")).toBe("decisions:read");
  });

  it("matches sub-paths via prefix", () => {
    expect(getRequiredPermission("/assets/some-uuid")).toBe("products:read");
    expect(getRequiredPermission("/decisions/123")).toBe("decisions:read");
  });

  it("returns null for unknown routes", () => {
    expect(getRequiredPermission("/unknown")).toBeNull();
    expect(getRequiredPermission("/")).toBeNull();
    expect(getRequiredPermission("/random/path")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getRequiredPermission("")).toBeNull();
  });

  it("matches longest prefix for nested routes", () => {
    // /capital-impact should match before /capital- prefix of /capital-projection
    expect(getRequiredPermission("/capital-impact")).toBe("capital:read");
    expect(getRequiredPermission("/capital-impact/details")).toBe(
      "capital:read"
    );
  });
});
