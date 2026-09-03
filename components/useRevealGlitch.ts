"use client";

import { useEffect, useRef, useState } from "react";

/**
 * True for `durationMs` every time the returned ref's element scrolls into
 * view — including re-entering after scrolling away and back, not just on
 * first mount. Callers toggle a CSS class off this to play a glitch-in burst.
 */
export function useRevealGlitch(durationMs = 650, threshold = 0.35) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setRevealing(true);
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => setRevealing(false), durationMs);
      },
      { threshold },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timeout) clearTimeout(timeout);
    };
  }, [durationMs, threshold]);

  return { ref, revealing };
}
