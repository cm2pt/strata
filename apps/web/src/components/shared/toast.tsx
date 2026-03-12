"use client";

/**
 * Strata — Lightweight Toast Notifications
 *
 * Minimal toast system with no external dependencies.
 * Shows success, error, and warning notifications.
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, XCircle, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "warning";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
  toastSuccess: (message: string) => void;
  toastError: (message: string) => void;
  toastWarning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let _nextId = 0;

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
};

const STYLES: Record<ToastType, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
};

const ICON_STYLES: Record<ToastType, string> = {
  success: "text-emerald-500",
  error: "text-red-500",
  warning: "text-amber-500",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++_nextId;
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto-dismiss after 5s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    toast: addToast,
    toastSuccess: useCallback((msg: string) => addToast("success", msg), [addToast]),
    toastError: useCallback((msg: string) => addToast("error", msg), [addToast]),
    toastWarning: useCallback((msg: string) => addToast("warning", msg), [addToast]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast container — fixed bottom-right */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map((t) => {
            const Icon = ICONS[t.type];
            return (
              <div
                key={t.id}
                className={cn(
                  "flex items-start gap-2 rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-right-5 fade-in",
                  STYLES[t.type],
                )}
              >
                <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", ICON_STYLES[t.type])} />
                <p className="text-sm flex-1">{t.message}</p>
                <button
                  onClick={() => removeToast(t.id)}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                  aria-label="Dismiss notification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
