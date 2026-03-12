"use client";

import { useEffect } from "react";

/**
 * Client component that initialises Web Vitals reporting on mount.
 * Drop this anywhere inside a layout or page tree -- it renders nothing.
 */
export function WebVitalsReporter() {
  useEffect(() => {
    import("@/lib/web-vitals").then(({ reportWebVitals }) => reportWebVitals());
  }, []);

  return null;
}
