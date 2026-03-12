import { describe, it, expect } from "vitest";
import { getSeedPersonas, createDemoUser } from "./demo-personas";

describe("demo-personas", () => {
  describe("getSeedPersonas", () => {
    it("returns an array of personas", () => {
      const personas = getSeedPersonas();
      expect(Array.isArray(personas)).toBe(true);
      expect(personas.length).toBeGreaterThan(0);
    });

    it("each persona has required fields", () => {
      for (const p of getSeedPersonas()) {
        expect(p.roleId).toBeTruthy();
        expect(p.displayName).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.defaultFocusRoute).toMatch(/^\//);
        expect(p.email).toContain("@");
        expect(p.name).toBeTruthy();
      }
    });

    it("includes the product_owner role", () => {
      const personas = getSeedPersonas();
      expect(personas.some((p) => p.roleId === "product_owner")).toBe(true);
    });

    it("includes the cfo role", () => {
      const personas = getSeedPersonas();
      expect(personas.some((p) => p.roleId === "cfo")).toBe(true);
    });
  });

  describe("createDemoUser", () => {
    it("returns an AuthUser for a valid roleId", () => {
      const user = createDemoUser("product_owner");
      expect(user).not.toBeNull();
      expect(user!.id).toBe("demo-product_owner");
      expect(user!.role).toBe("product_owner");
      expect(user!.orgId).toBe("demo-org");
      expect(user!.name).toBeTruthy();
      expect(user!.email).toContain("@");
      expect(user!.roleMeta).toBeDefined();
      expect(user!.roleMeta.permissions.length).toBeGreaterThan(0);
    });

    it("returns null for unknown roleId", () => {
      expect(createDemoUser("nonexistent_role")).toBeNull();
    });

    it("creates different users for different roles", () => {
      const owner = createDemoUser("product_owner");
      const cfo = createDemoUser("cfo");
      expect(owner!.id).not.toBe(cfo!.id);
      expect(owner!.name).not.toBe(cfo!.name);
    });

    it("roleMeta includes permissions array", () => {
      const user = createDemoUser("cfo");
      expect(Array.isArray(user!.roleMeta.permissions)).toBe(true);
      expect(user!.roleMeta.permissions.length).toBeGreaterThan(0);
    });
  });
});
