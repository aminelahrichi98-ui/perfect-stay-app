/*
  Abstraction analytics. Aucun outil externe n'est branché pour l'instant : les événements
  sont poussés dans `window.dataLayer` UNIQUEMENT après consentement (prêt pour Google Tag
  Manager / GA4 / Meta Pixel), et affichés dans la console en développement.
*/

export type Evenement =
  | "PageView"
  | "RentalProfileSelected"
  | "CtaClicked"
  | "CinematicJourneyStarted"
  | "ServiceHotspotClicked"
  | "InvestorDashboardViewed"
  | "FunnelStarted"
  | "FunnelStepCompleted"
  | "LeadSubmitted"
  | "QualifiedLead"
  | "AppointmentRequested";

type Proprietes = Record<string, string | number | boolean | undefined>;

const CLE_CONSENTEMENT = "ps_consentement";
const CLE_ATTRIBUTION = "ps_attribution";
const PARAMS_ATTRIBUTION = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"];

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export type Consentement = "accepte" | "refuse" | null;

export function lireConsentement(): Consentement {
  try {
    const v = localStorage.getItem(CLE_CONSENTEMENT);
    return v === "accepte" || v === "refuse" ? v : null;
  } catch {
    return null;
  }
}

export function enregistrerConsentement(v: Exclude<Consentement, null>) {
  try {
    localStorage.setItem(CLE_CONSENTEMENT, v);
  } catch {
    /* navigation privée : le choix vaut pour la page en cours */
  }
  window.dispatchEvent(new CustomEvent("ps:consentement", { detail: v }));
}

export function track(evenement: Evenement, proprietes: Proprietes = {}) {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "production") console.info("[analytics]", evenement, proprietes);
  if (lireConsentement() !== "accepte") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: evenement, ...proprietes });
}

/** Conserve les paramètres de campagne de la première visite de la session, pour les joindre au lead. */
export function capturerAttribution() {
  try {
    if (sessionStorage.getItem(CLE_ATTRIBUTION)) return;
    const url = new URL(window.location.href);
    const attribution: Record<string, string> = {};
    for (const p of PARAMS_ATTRIBUTION) {
      const v = url.searchParams.get(p);
      if (v) attribution[p] = v.slice(0, 200);
    }
    if (document.referrer && !document.referrer.startsWith(window.location.origin)) attribution.referrer = document.referrer.slice(0, 200);
    attribution.page = url.pathname;
    sessionStorage.setItem(CLE_ATTRIBUTION, JSON.stringify(attribution));
  } catch {
    /* stockage indisponible : pas d'attribution */
  }
}

export function lireAttribution(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(CLE_ATTRIBUTION) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}
