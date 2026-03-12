import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Strata — Data Capital Management";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic Open Graph image — rendered at the edge via satori.
 * Deep Navy background, centered diamond mark, wordmark, tagline.
 */
export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0E1A2B",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Diamond mark */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="40" height="40" rx="8" fill="rgba(255,255,255,0.1)" />
          <path d="M20 9L29 20L20 31L11 20Z" fill="white" />
        </svg>

        {/* Wordmark */}
        <div
          style={{
            marginTop: 24,
            fontSize: 48,
            fontWeight: 600,
            color: "white",
            letterSpacing: "-0.025em",
          }}
        >
          Strata
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: 12,
            fontSize: 20,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "-0.01em",
          }}
        >
          Govern Data as Capital
        </div>

        {/* Category */}
        <div
          style={{
            marginTop: 32,
            fontSize: 13,
            color: "rgba(255,255,255,0.3)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
          }}
        >
          Data Capital Management
        </div>
      </div>
    ),
    { ...size },
  );
}
