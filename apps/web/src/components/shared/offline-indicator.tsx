"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Shows a banner when the browser loses network connectivity.
 * Automatically dismisses when connection is restored.
 */
export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);

    // Check initial state
    if (!navigator.onLine) setOffline(true);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 shadow-lg animate-in slide-in-from-left-5 fade-in">
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <span>You&apos;re offline. Some features may be unavailable.</span>
    </div>
  );
}
