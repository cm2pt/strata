"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from its previous value to its current value.
 * Uses requestAnimationFrame for smooth 60fps transitions.
 *
 * @param target - The current target number
 * @param duration - Animation duration in ms (default: 600)
 * @returns The animated display value
 */
export function useAnimatedNumber(target: number, duration = 600): number {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    prevRef.current = target;

    // Skip animation if values are the same or for the initial render
    if (from === to) {
      setDisplay(to);
      return;
    }

    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;

      setDisplay(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(to); // Ensure exact final value
      }
    }

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [target, duration]);

  return display;
}
