import type { NextConfig } from "next";
import path from "path";
import { execSync } from "child_process";
import withBundleAnalyzer from "@next/bundle-analyzer";

// ---------------------------------------------------------------------------
// Validate API rewrite destination URL
// ---------------------------------------------------------------------------
function getValidatedApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:8000";

  // Must start with http:// or https://
  if (!/^https?:\/\//.test(raw)) {
    throw new Error(
      `[next.config] NEXT_PUBLIC_API_URL has an invalid protocol: "${raw}". Must start with http:// or https://`,
    );
  }

  // Reject suspicious characters (newlines, spaces, semicolons, backticks, angle brackets)
  if (/[\s;<>`\\{}|^~[\]]/.test(raw)) {
    throw new Error(
      `[next.config] NEXT_PUBLIC_API_URL contains suspicious characters: "${raw}".`,
    );
  }

  // Verify it parses as a valid URL
  try {
    new URL(raw);
  } catch {
    throw new Error(
      `[next.config] NEXT_PUBLIC_API_URL is not a valid URL: "${raw}".`,
    );
  }

  return raw;
}

const API_REWRITE_BASE = getValidatedApiBase();

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  generateBuildId() {
    try {
      return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
    } catch {
      return `build-${Date.now()}`;
    }
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_REWRITE_BASE}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "connect-src 'self' " + API_REWRITE_BASE,
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

const analyzer = withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

export default analyzer(nextConfig);
