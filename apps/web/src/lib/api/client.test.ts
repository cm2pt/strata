import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  setToken,
  clearToken,
  setRefreshToken,
  getRefreshToken,
  APIError,
  apiFetch,
  apiGet,
  apiPost,
  apiPatch,
  isAPIEnabled,
} from "./client";
import { circuitBreaker } from "./circuit-breaker";

// ---------- Token management ----------

describe("token management", () => {
  beforeEach(() => {
    localStorage.removeItem("dao_token");
    localStorage.removeItem("dao_refresh_token");
  });

  it("setToken stores in localStorage", () => {
    setToken("abc123");
    expect(localStorage.getItem("dao_token")).toBe("abc123");
  });

  it("clearToken removes both access and refresh tokens", () => {
    localStorage.setItem("dao_token", "abc123");
    localStorage.setItem("dao_refresh_token", "refresh123");
    clearToken();
    expect(localStorage.getItem("dao_token")).toBeNull();
    expect(localStorage.getItem("dao_refresh_token")).toBeNull();
  });

  it("setToken overwrites previous token", () => {
    setToken("first");
    setToken("second");
    expect(localStorage.getItem("dao_token")).toBe("second");
  });

  it("setRefreshToken stores in localStorage", () => {
    setRefreshToken("rt_abc");
    expect(localStorage.getItem("dao_refresh_token")).toBe("rt_abc");
  });

  it("getRefreshToken retrieves from localStorage", () => {
    localStorage.setItem("dao_refresh_token", "rt_xyz");
    expect(getRefreshToken()).toBe("rt_xyz");
  });

  it("getRefreshToken returns null when not set", () => {
    expect(getRefreshToken()).toBeNull();
  });
});

// ---------- APIError ----------

describe("APIError", () => {
  it("creates error with status and message", () => {
    const err = new APIError(404, "Not found");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.name).toBe("APIError");
  });

  it("is an instance of Error", () => {
    const err = new APIError(500, "Server error");
    expect(err).toBeInstanceOf(Error);
  });
});

// ---------- apiFetch ----------

describe("apiFetch", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    localStorage.removeItem("dao_token");
    localStorage.removeItem("dao_refresh_token");
    circuitBreaker.reset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("makes a fetch call with Content-Type header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: "test" }),
    });

    const result = await apiFetch("/test");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/test"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
    expect(result).toEqual({ data: "test" });
  });

  it("includes Authorization header when token is set", async () => {
    setToken("my-token");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/test");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my-token",
        }),
      }),
    );
  });

  it("does not include Authorization header when no token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/test");

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined();
  });

  it("throws APIError on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: () => Promise.resolve({ detail: "Invalid input" }),
    });

    try {
      await apiFetch("/test");
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(APIError);
      expect((e as APIError).status).toBe(400);
      expect((e as APIError).message).toBe("Invalid request");
    }
  });

  it("attempts silent refresh on 401 when refresh token exists", async () => {
    setToken("old-access-token");
    setRefreshToken("my-refresh-token");

    // First call: 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.resolve({ detail: "Token expired" }),
    });

    // Refresh call: success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
        }),
    });

    // Retry with new token: success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: "refreshed" }),
    });

    const result = await apiFetch("/test");
    expect(result).toEqual({ data: "refreshed" });
    expect(localStorage.getItem("dao_token")).toBe("new-access-token");
    expect(localStorage.getItem("dao_refresh_token")).toBe("new-refresh-token");
  });

  it("clears tokens when refresh also fails", async () => {
    setToken("old-token");
    setRefreshToken("bad-refresh");

    // First call: 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.resolve({ detail: "Unauthorized" }),
    });

    // Refresh call: also fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ detail: "Invalid refresh token" }),
    });

    try {
      await apiFetch("/test");
    } catch {
      // expected
    }

    expect(localStorage.getItem("dao_token")).toBeNull();
    expect(localStorage.getItem("dao_refresh_token")).toBeNull();
  });

  it("clears token on 401 when no refresh token exists", async () => {
    setToken("old-token");
    // No refresh token set
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.resolve({ detail: "Unauthorized" }),
    });

    try {
      await apiFetch("/test");
    } catch {
      // expected
    }

    expect(localStorage.getItem("dao_token")).toBeNull();
  });

  it("handles json parse failure in error response", async () => {
    // Provide responses for initial attempt + 2 retries (5xx retry logic)
    const error500 = {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.reject(new Error("not json")),
    };
    mockFetch
      .mockResolvedValueOnce(error500)
      .mockResolvedValueOnce(error500)
      .mockResolvedValueOnce(error500);

    await expect(apiFetch("/test")).rejects.toThrow("Server error — please try again");
  });
});

// ---------- Convenience methods ----------

describe("apiGet", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    localStorage.removeItem("dao_token");
    localStorage.removeItem("dao_refresh_token");
    circuitBreaker.reset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls fetch with GET method", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    await apiGet("/items");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/items"),
      expect.objectContaining({ method: "GET" }),
    );
  });
});

describe("apiPost", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    localStorage.removeItem("dao_token");
    localStorage.removeItem("dao_refresh_token");
    circuitBreaker.reset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls fetch with POST method and stringified body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "new" }),
    });

    await apiPost("/items", { name: "test" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/items"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "test" }),
      }),
    );
  });
});

describe("apiPatch", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    localStorage.removeItem("dao_token");
    localStorage.removeItem("dao_refresh_token");
    circuitBreaker.reset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls fetch with PATCH method", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ updated: true }),
    });

    await apiPatch("/items/1", { name: "updated" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/items/1"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ name: "updated" }),
      }),
    );
  });
});

// ---------- isAPIEnabled ----------

describe("isAPIEnabled", () => {
  it("is a boolean", () => {
    expect(typeof isAPIEnabled).toBe("boolean");
  });
});
