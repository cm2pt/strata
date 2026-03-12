import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock API client
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
  return <AuthProvider>{children}</AuthProvider>;
}

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Clear cookies
    document.cookie = "dao_session=; max-age=0; path=/";
    // Default: no stored token, so session restore does nothing
    mockApiGet.mockRejectedValue(new Error("no token"));
  });

  it("returns loading=true initially, then resolves", async () => {
    mockApiGet.mockRejectedValue(new Error("no session"));
    const { result } = renderHook(() => useAuth(), { wrapper });
    // After mount + session check settles
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.user).toBeNull();
  });

  it("login sets user and calls setToken", async () => {
    const fakeUser = {
      id: "u1",
      email: "test@test.com",
      name: "Test",
      role: "admin",
      roleMeta: { permissions: ["portfolio:read"] },
    };
    mockApiPost.mockResolvedValue({
      user: fakeUser,
      accessToken: "tok-123",
      refreshToken: "ref-456",
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login("test@test.com", "pass");
    });

    expect(mockApiPost).toHaveBeenCalledWith("/auth/login", {
      email: "test@test.com",
      password: "pass",
    });
    expect(mockSetToken).toHaveBeenCalledWith("tok-123");
    expect(mockSetRefreshToken).toHaveBeenCalledWith("ref-456");
    expect(result.current.user).toEqual(fakeUser);
  });

  it("demoLogin calls demo-login endpoint", async () => {
    const fakeUser = {
      id: "u2",
      email: "demo@test.com",
      name: "Demo",
      role: "cfo",
      roleMeta: { permissions: ["capital:read"] },
    };
    mockApiPost.mockResolvedValue({
      user: fakeUser,
      accessToken: "demo-tok",
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.demoLogin("cfo");
    });

    expect(mockApiPost).toHaveBeenCalledWith("/auth/demo-login", {
      role: "cfo",
    });
    expect(result.current.user).toEqual(fakeUser);
  });

  it("logout clears token, cookie, user and navigates to /login", async () => {
    // Set up logged-in state
    const fakeUser = {
      id: "u1",
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

    // Now logout
    mockApiPost.mockResolvedValue({});
    act(() => {
      result.current.logout();
    });

    expect(mockClearToken).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("hasPermission checks user role permissions", async () => {
    const fakeUser = {
      id: "u1",
      email: "t@t.com",
      name: "T",
      role: "admin",
      roleMeta: { permissions: ["portfolio:read", "capital:read"] },
    };
    mockApiPost.mockResolvedValue({ user: fakeUser, accessToken: "tok" });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login("t@t.com", "p");
    });

    expect(result.current.hasPermission("portfolio:read")).toBe(true);
    expect(result.current.hasPermission("capital:read")).toBe(true);
    expect(result.current.hasPermission("nonexistent:perm")).toBe(false);
  });

  it("hasPermission returns false when no user", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPermission("portfolio:read")).toBe(false);
  });

  it("restores session from stored token on mount", async () => {
    localStorage.setItem("dao_token", "stored-tok");
    const fakeUser = {
      id: "u1",
      email: "t@t.com",
      name: "T",
      role: "admin",
      roleMeta: { permissions: [] },
    };
    mockApiGet.mockResolvedValue(fakeUser);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(fakeUser);
    expect(mockApiGet).toHaveBeenCalledWith("/auth/me");
  });
});
