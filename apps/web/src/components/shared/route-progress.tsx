"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Thin progress bar at the top of the page during route transitions.
 * Shows automatically when navigation takes >200ms.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Reset on navigation complete
    setLoading(false);
    setProgress(0);
  }, [pathname]);

  useEffect(() => {
    if (!loading) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + (90 - prev) * 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [loading]);

  // Listen for navigation start via click on links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (href && href.startsWith("/") && href !== pathname) {
        setLoading(true);
        setProgress(10);
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[1.5px]">
      <div
        className="h-full bg-teal-500 transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: "0 0 8px rgba(15, 118, 110, 0.4)",
        }}
      />
    </div>
  );
}
