"use client";

import { useEffect, useRef, useState } from "react";

/** Vrai dès que l'élément entre dans l'écran (une seule fois par défaut). */
export function useVisible<T extends Element>(options: { seuil?: number; marge?: string; unique?: boolean } = {}) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  const { seuil = 0.25, marge = "0px 0px -8% 0px", unique = true } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setVisible(true));
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          if (unique) obs.disconnect();
        } else if (!unique) setVisible(false);
      },
      { threshold: seuil, rootMargin: marge },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [seuil, marge, unique]);

  return [ref, visible] as const;
}
