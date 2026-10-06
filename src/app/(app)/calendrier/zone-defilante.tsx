"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Zone à défilement horizontal : s'ouvre centrée sur la colonne d'aujourd'hui quand elle existe. */
export function ZoneDefilante({ children }: { children: ReactNode }) {
  const zone = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = zone.current;
    const cible = el?.querySelector<HTMLElement>("[data-jour-courant]");
    // La colonne des noms reste collée à gauche : on laisse sa largeur libre pour voir « aujourd'hui » juste à côté
    const largeurNoms = el?.querySelector<HTMLElement>("th")?.offsetWidth ?? 0;
    if (el && cible) el.scrollLeft = Math.max(0, cible.offsetLeft - largeurNoms - 12);
  }, []);
  return (
    <div ref={zone} className="relative overflow-x-auto overscroll-x-contain rounded-2xl border border-line bg-surface shadow-card">
      {children}
    </div>
  );
}
