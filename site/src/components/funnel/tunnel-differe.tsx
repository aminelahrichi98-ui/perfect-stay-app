"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useExperience } from "@/lib/experience";

const charger = () => import("./tunnel").then((m) => m.Tunnel);
const Tunnel = dynamic(charger, {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-charbon/70 backdrop-blur-sm">
      <span className="h-10 w-10 animate-spin rounded-full border border-or/20 border-t-or" aria-label="Chargement" />
    </div>
  ),
});

/**
 * Le tunnel (et sa validation) n'alourdit pas le premier affichage : il est téléchargé
 * pendant que la page est au repos, ou au premier clic sur un bouton d'estimation.
 */
export function TunnelDiffere() {
  const { tunnelOuvert } = useExperience();
  useEffect(() => {
    const prechargement = () => void charger();
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(prechargement, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(prechargement, 3000);
    return () => clearTimeout(t);
  }, []);
  return tunnelOuvert ? <Tunnel /> : null;
}
