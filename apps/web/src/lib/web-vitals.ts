/**
 * Strata -- Web Vitals Reporting
 *
 * Captures Core Web Vitals (LCP, CLS, INP, TTFB)
 * and reports them to the console in development
 * and to the API in production.
 */

import type { MetricType } from "web-vitals";

const isDev = process.env.NODE_ENV === "development";

function sendToAnalytics(metric: MetricType) {
  if (isDev) {
    const color =
      metric.rating === "good"
        ? "#10b981"
        : metric.rating === "needs-improvement"
          ? "#f59e0b"
          : "#ef4444";
    console.log(
      `%c[Web Vital] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`,
      `color: ${color}; font-weight: bold`,
    );
    return;
  }

  // In production, send to API endpoint (when available)
  // navigator.sendBeacon("/api/v1/analytics/vitals", JSON.stringify({
  //   name: metric.name,
  //   value: metric.value,
  //   rating: metric.rating,
  //   delta: metric.delta,
  //   id: metric.id,
  //   navigationType: metric.navigationType,
  // }));
}

/**
 * Initialize web vitals reporting.
 * Call this once in the root layout or _app.
 */
export async function reportWebVitals() {
  try {
    const { onCLS, onINP, onLCP, onTTFB } = await import("web-vitals");
    onCLS(sendToAnalytics);
    onINP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  } catch {
    // web-vitals not available
  }
}
