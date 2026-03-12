"use client";

import { useEffect, useRef, useState } from "react";

interface UseFadeInOnScrollOptions {
  /** Visibility threshold (0–1). Default: 0.1 */
  threshold?: number;
  /** Root margin for early/late trigger. Default: "0px 0px -40px 0px" */
  rootMargin?: string;
  /** Animate only once (true) or re-trigger on exit (false). Default: true */
  once?: boolean;
}

/**
 * Scroll-triggered fade-in via IntersectionObserver.
 *
 * Returns a ref to attach to the element and an `isVisible` flag.
 * Pair with the `.fade-in-up` / `.visible` CSS classes in globals.css.
 */
export function useFadeInOnScroll(options?: UseFadeInOnScrollOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (options?.once !== false) observer.unobserve(el);
        }
      },
      {
        threshold: options?.threshold ?? 0.1,
        rootMargin: options?.rootMargin ?? "0px 0px -40px 0px",
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [options?.threshold, options?.rootMargin, options?.once]);

  return { ref, isVisible };
}
