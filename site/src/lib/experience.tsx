"use client";

/*
  État partagé de l'expérience : profil locatif choisi dans le hero et ouverture du tunnel.
  Le profil est gardé pour la session afin de pré-remplir le tunnel et de garder le parcours
  personnalisé après un rechargement.
*/
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Profil } from "./content";
import { capturerAttribution, track } from "./analytics";

type Experience = {
  profil: Profil | null;
  choisirProfil: (p: Profil | null) => void;
  tunnelOuvert: boolean;
  ouvrirTunnel: (source: string) => void;
  fermerTunnel: () => void;
};

const Contexte = createContext<Experience | null>(null);
const CLE = "ps_profil";

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [tunnelOuvert, setTunnelOuvert] = useState(false);

  useEffect(() => {
    capturerAttribution();
    track("PageView", { page: window.location.pathname });
    try {
      const p = sessionStorage.getItem(CLE);
      // Lecture différée : le rendu serveur ne connaît pas la session
      if (p === "longue" || p === "courte" || p === "vacant") queueMicrotask(() => setProfil(p));
    } catch {
      /* stockage indisponible */
    }
  }, []);

  const choisirProfil = useCallback((p: Profil | null) => {
    setProfil(p);
    try {
      if (p) sessionStorage.setItem(CLE, p);
      else sessionStorage.removeItem(CLE);
    } catch {
      /* stockage indisponible */
    }
    if (p) {
      track("RentalProfileSelected", { profil: p });
      track("CinematicJourneyStarted", { profil: p });
    }
  }, []);

  const ouvrirTunnel = useCallback((source: string) => {
    setTunnelOuvert(true);
    track("FunnelStarted", { source });
  }, []);
  const fermerTunnel = useCallback(() => setTunnelOuvert(false), []);

  const valeur = useMemo(() => ({ profil, choisirProfil, tunnelOuvert, ouvrirTunnel, fermerTunnel }), [profil, choisirProfil, tunnelOuvert, ouvrirTunnel, fermerTunnel]);
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useExperience() {
  const c = useContext(Contexte);
  if (!c) throw new Error("useExperience doit être utilisé dans <ExperienceProvider>.");
  return c;
}
