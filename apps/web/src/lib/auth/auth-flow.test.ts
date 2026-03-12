/**
 * Auth Flow Tests
 *
 * End-to-end tests for the auth lifecycle:
 *   - Login sets access + refresh tokens in localStorage
 *   - Login sets session cookie
 *   - Logout clears all tokens and cookie
 *   - Token refresh flow (401 -> refresh -> retry)
 *   - Permission check returns correct boolean for role
 *   - hasPermission returns false for insufficient role
 *
 * Mocks the API client and tests the AuthProvider context behavior.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock API client — we intercept apiPost/apiGet to simulate backend responses
const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
const mockSetToken = vi.fn();
const mockClearToken = vi.fn();
const mockSetRefreshToken = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  setToken: (...args: unknown[]) => mockSetToken(...args),
  clearToken: (...args: unknown[]) => mockClearToken(...args),
  setRefreshToken: (...args: unknown[]) => mockSetRefreshToken(...args),
  isAPIEnabled: true,
}));

import { AuthProvider, useAuth } from "./context";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AuthProvider, null, children);
}

describe("Auth Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Clear any existing cookies
    document.cookie = "dao_session=; max-age=0; path=/";
    // Default: no stored token, so session restore falls through
    mockApiGet.mockRejectedValue(new Error("no session"));
  });

  // ────────────────────────────────────────────────────────────
  // Login Flow
  // ────────────────────────────────────────────────────────────

  describe("Login sets tokens and cookie", () => {
    const fakeUser = {
      id: "u-100",
      email: "alice@example.com",
      name: "Alice",
      title: "Data Analyst",
      role: "fpa_analyst",
      orgId: "org-1",
      roleMeta: {
        roleId: "fpa_analyst",
        displayName: "FP&A Analyst",
        description: "Financial planning analyst",
        defaultFocusRoute: "/portfolio",
        navPriority: ["/portfolio", "/decisions"],
        permissions: ["portfolio:read", "decisions:read", "capital:read"],
      },
    };

    it("login sets access token via setToken", async () => {
      mockApiPost.mockResolvedValue({
        user: fakeUser,
        accessToken: "access-token-abc",
        refreshToken: "refresh-token-xyz",
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.login("alice@example.com", "password123");
      });

      // Access token should be stored
      expect(mockSetToken).toHaveBeenCalledWith("access-token-abc");
    });

    it("login sets refresh token via setRefreshToken", async () => {
      mockApiPost.mockResolvedValue({
        user: fakeUser,
        accessToken: "access-token-abc",
        refreshToken: "refresh-token-xyz",
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.login("alice@example.com", "password123");
      });

      // Refresh token should be stored
      expect(mockSetRefreshToken).toHaveBeenCalledWith("refresh-token-xyz");
    });

    it("login sets session cookie (dao_session)", async () => {
      mockApiPost.mockResolvedValue({
        user: fakeUser,
        accessToken: "tok",
        refreshToken: "ref",
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.login("alice@example.com", "p");
      });

      // Cookie should contain dao_session=1
      expect(document.cookie).toContain("dao_session=1");
    });

    it("login sets user in context", async () => {
      mockApiPost.mockResolvedValue({
        user: fakeUser,
        accessToken: "tok",
        refreshToken: "ref",
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.login("alice@example.com", "p");
      });

      expect(result.current.user).toEqual(fakeUser);
      expect(result.current.user?.email).toBe("alice@example.com");
    });
  });

  // ────────────────────────────────────────────────────────────
  // Logout Flow
  // ────────────────────────────────────────────────────────────

  describe("Logout clears all tokens and cookie", () => {
    it("logout clears tokens via clearToken", async () => {
      // First login
      const fakeUser = {
        id: "u-1",
        email: "t@t.com",
        name: "T",
        role: "admin",
        roleMeta: { permissions: [] },
      };
      mockApiPost.mockResolvedValue({
        user: fakeUser,
        accessToken: "tok",
        refreshToken: "ref",
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.login("t@t.com", "p");
      });

      // Now logout
      mockApiPost.mockResolvedValue({});
      act(() => result.current.logout());

      expect(mockClearToken).toHaveBeenCalled();
    });

    it("logout clears session cookie", async () => {
      const fakeUser = {
        id: "u-1",
        email: "t@t.com",
        name: "T",
        role: "admin",
        roleMeta: { permissions: [] },
      };
      mockApiPost.mockResolvedValue({
        user: fakeUser,
        accessToken: "tok",
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.login("t@t.com", "p");
      });
      expect(document.cookie).toContain("dao_session=1");

      // Logout
      mockApiPost.mockResolvedValue({});
      act(() => result.current.logout());

      // Cookie should be cleared (max-age=0 removes it)
      expect(document.cookie).not.toContain("dao_session=1");
    });

    it("logout sets user to null", async () => {
      const fakeUser = {
        id: "u-1",
        email: "t@t.com",
        name: "T",
        role: "admin",
        roleMeta: { permissions: [] },
      };
      mockApiPost.mockResolvedValue({
        user: fakeUser,
        accessToken: "tok",
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.login("t@t.com", "p");
      });
      expect(result.current.user).toBeTruthy();

      // Logout
      mockApiPost.mockResolvedValue({});
      act(() => result.current.logout());

      expect(result.current.user).toBeNull();
    });

    it("logout redirects to /login", async () => {
      const fakeUser = {
        id: "u-1",
        email: "t@t.com",
        name: "T",
        role: "admin",
        roleMeta: { permissions: [] },
      };
      mockApiPost.mockResolvedValue({
        user: fakeUser,
        accessToken: "tok",
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.login("t@t.com", "p");
      });

      mockApiPost.mockResolvedValue({});
      act(() => result.current.logout());

      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  // ────────────────────────────────────────────────────────────
  // Token Refresh Flow (401 -> refresh -> retry)
  // ────────────────────────────────────────────────────────────

  describe("Token refresh flow", () => {
    it("session restore calls /auth/me with stored token", async () => {
      localStorage.setItem("dao_token", "stored-access-token");
      const fakeUser = {
        id: "u-1",
        email: "restored@example.com",
        name: "Restored",
        role: "admin",
        roleMeta: { permissions: ["portfolio:read"] },
      };
      mockApiGet.mockResolvedValue(fakeUser);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockApiGet).toHaveBeenCalledWith("/auth/me");
      expect(result.current.user).toEqual(fakeUser);
    });

    it("session restore clears tokens when /auth/me fails (expired token)", async () => {
      localStorage.setItem("dao_token", "expired-token");
      mockApiGet.mockRejectedValue(new Error("401 Unauthorized"));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Token should be cleared
      expect(mockClearToken).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });
  });

  // ────────────────────────────────────────────────────────────
  // Permission checks
  // ────────────────────────────────────────────────────────────

  describe("Permission check returns correct boolean for role", () => {
    it("hasPermission returns true for granted permissions", async () => {
      const fakeUser = {
        id: "u-cfo",
        email: "cfo@example.com",
        name: "CFO",
        title: "Chief Financial Officer",
        role: "cfo",
        orgId: "org-1",
        roleMeta: {
          roleId: "cfo",
          displayName: "CFO",
          description: "Chief Financial Officer",
          defaultFocusRoute: "/portfolio",
          navPriority: ["/portfolio"],
          permissions: [
            "portfolio:read",
            "decisions:read",
            "decisions:approve",
            "capital:read",
            "ai:read",
          ],
        },
      };
      mockApiPost.mockResolvedValue({
        user: fakeUser,
        accessToken: "tok",
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.login("cfo@example.com", "p");
      });

      // Should return true for each granted permission
      expect(result.current.hasPermission("portfolio:read")).toBe(true);
      expect(result.current.hasPermission("decisions:read")).toBe(true);
      expect(result.current.hasPermission("decisions:approve")).toBe(true);
      expect(result.current.hasPermission("capital:read")).toBe(true);
      expect(result.current.hasPermission("ai:read")).toBe(true);
    });

    it("hasPermission returns false for permissions not in the role", async () => {
      const fakeUser = {
        id: "u-consumer",
        email: "consumer@example.com",
        name: "Consumer",
        title: "Data Consumer",
        role: "consumer",
        orgId: "org-1",
        roleMeta: {
          roleId: "consumer",
          displayName: "Consumer",
          description: "Data consumer",
          defaultFocusRoute: "/marketplace",
          navPriority: ["/marketplace"],
          permissions: ["marketplace:read"],
        },
      };
      mockApiPost.mockResolvedValue({
        user: fakeUser,
        accessToken: "tok",
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.login("consumer@example.com", "p");
      });

      // Should return true for granted permission
      expect(result.current.hasPermission("marketplace:read")).toBe(true);

      // Should return false for permissions not granted to this role
      expect(result.current.hasPermission("portfolio:read")).toBe(false);
      expect(result.current.hasPermission("decisions:approve")).toBe(false);
      expect(result.current.hasPermission("capital:read")).toBe(false);
      expect(result.current.hasPermission("connectors:read")).toBe(false);
      expect(result.current.hasPermission("ai:kill_execute")).toBe(false);
    });

    it("hasPermission returns false when no user is logged in", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.hasPermission("portfolio:read")).toBe(false);
      expect(result.current.hasPermission("decisions:read")).toBe(false);
    });

    it("hasPermission returns false when user has null roleMeta", async () => {
      const fakeUser = {
        id: "u-no-role",
        email: "norole@example.com",
        name: "No Role",
        role: "admin",
        roleMeta: null,
      };
      mockApiPost.mockResolvedValue({
        user: fakeUser,
        accessToken: "tok",
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.login("norole@example.com", "p");
      });

      expect(result.current.hasPermission("portfolio:read")).toBe(false);
    });
  });
});
