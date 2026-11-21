"use client";

import { useEffect } from "react";
import { useExperience } from "@/lib/experience";

/** Ouvre directement le formulaire quand l'adresse contient ?demande=1 (liens de campagne). */
export function OuvertureAudit() {
  const { ouvrirTunnel } = useExperience();
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("demande") === "1") ouvrirTunnel("lien-direct");
  }, [ouvrirTunnel]);
  return null;
}
