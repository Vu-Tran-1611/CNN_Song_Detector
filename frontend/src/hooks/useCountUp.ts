"use client";

import { useEffect, useState } from "react";

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * Animates a number from 0 up to `target` (like LCD digits rolling up).
 * Returns `target` right away when target is null or "reduce motion" is on.
 */
export function useCountUp(target: number | null, durationMs = 700): number | null {
  const [frame, setFrame] = useState<{ target: number | null; value: number }>({ target: null, value: 0 });

  useEffect(() => {
    if (target === null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setFrame({ target, value: target }));
      return () => cancelAnimationFrame(id);
    }
    let id = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setFrame({ target, value: target * easeOutCubic(t) });
      if (t < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, durationMs]);

  if (target === null) return null;
  // Until the first frame for a new target runs, start from 0 (not the old value).
  return frame.target === target ? frame.value : 0;
}
