import { ajouterJours, formatJour } from "./dates.ts";

export const CANAUX_RESERVATION = [
  { value: "airbnb", label: "Airbnb" },
  { value: "booking", label: "Booking" },
  { value: "expedia", label: "Expedia" },
  { value: "agoda", label: "Agoda" },
  { value: "almosafer", label: "Almosafer" },
  { value: "direct", label: "Réservation en direct" },
] as const;

export type CanalReservation = (typeof CANAUX_RESERVATION)[number]["value"];

export const libelleCanal = (v: string | null | undefined) => CANAUX_RESERVATION.find((c) => c.value === v)?.label ?? "";

/** Canal correspondant à la plateforme lue dans le calendrier (Airbnb, Booking.com…), ou « » si inconnue. */
export function canalDepuisPlateforme(plateforme: string | null | undefined): CanalReservation | "" {
  const p = (plateforme ?? "").toLowerCase();
  if (p.includes("airbnb")) return "airbnb";
  if (p.includes("booking")) return "booking";
  if (p.includes("expedia")) return "expedia";
  if (p.includes("agoda")) return "agoda";
  if (p.includes("almosafer")) return "almosafer";
  return "";
}

const court = (j: string) => formatJour(j).slice(0, 5);

/** Nom abrégé pour les listes et les PDF (la colonne est étroite) */
const libelleCourt = (v: string | null | undefined) => (v === "direct" ? "Direct" : libelleCanal(v));

/**
 * « 05/10 → 08/10 · Airbnb » : le séjour en un coup d'œil.
 * Pour un ancien versement sans dates de séjour, on garde l'ancienne date.
 */
export function libelleSejour(v: { arrivee?: string | null; depart?: string | null; canal?: string | null; date_versement: string }): string {
  const canal = libelleCourt(v.canal);
  const dates = v.arrivee && v.depart ? `${court(v.arrivee)} → ${court(v.depart)}` : formatJour(v.depart ?? v.date_versement);
  return canal ? `${dates} · ${canal}` : dates;
}

/** La plateforme verse le lendemain du check-in : c'est le jour où le versement est comptabilisé. */
export const dateDeVersement = (arrivee: string) => ajouterJours(arrivee, 1);
