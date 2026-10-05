import { ajouterJours, jourSemaine, nbJoursDuMois, premierDuMois, type Jour, type Mois } from "./dates.ts";

export type ReservationCalendrier = {
  id: string;
  arrivee: Jour;
  depart: Jour;
  type: "reservation" | "blocage";
};

export type EtatJour = {
  jour: Jour;
  etat: "libre" | "nuit" | "blocage";
  reservationId?: string;
  /** première nuit du séjour (bord arrondi à gauche) */
  debut?: boolean;
  /** dernière nuit du séjour (bord arrondi à droite) */
  fin?: boolean;
  /** un séjour se termine ce jour-là : jour de ménage */
  depart?: boolean;
};

/** Jours d'un mois, de 1 à 28/29/30/31 */
export function joursDuMois(mois: Mois): Jour[] {
  const premier = premierDuMois(mois);
  return Array.from({ length: nbJoursDuMois(mois) }, (_, i) => ajouterJours(premier, i));
}

/**
 * État de chaque jour d'un mois pour un logement.
 * Une nuit appartient à une réservation si arrivée ≤ jour < départ (le jour du départ n'est pas une nuit).
 * Si une réservation et un blocage se chevauchent, la réservation l'emporte.
 */
export function etatsDuMois(mois: Mois, reservations: ReservationCalendrier[]): EtatJour[] {
  return joursDuMois(mois).map((jour) => {
    const couvrantes = reservations.filter((r) => r.arrivee <= jour && jour < r.depart);
    const choisie = couvrantes.find((r) => r.type === "reservation") ?? couvrantes[0];
    const depart = reservations.some((r) => r.type === "reservation" && r.depart === jour);
    if (!choisie) return { jour, etat: "libre", depart };
    return {
      jour,
      etat: choisie.type === "reservation" ? "nuit" : "blocage",
      reservationId: choisie.id,
      debut: choisie.arrivee === jour,
      fin: ajouterJours(jour, 1) === choisie.depart,
      depart,
    };
  });
}

/** Part des nuits du mois occupées par de vraies réservations (les blocages ne comptent pas). */
export function tauxOccupation(etats: EtatJour[]): number {
  if (!etats.length) return 0;
  return etats.filter((e) => e.etat === "nuit").length / etats.length;
}

export function nuitsReservees(etats: EtatJour[]): number {
  return etats.filter((e) => e.etat === "nuit").length;
}

/** Semaines (lundi → dimanche) qui couvrent le mois ; les jours hors mois valent `null`. */
export function grilleMois(mois: Mois): (Jour | null)[][] {
  const jours = joursDuMois(mois);
  const vides = jourSemaine(jours[0]);
  const cases: (Jour | null)[] = [...Array(vides).fill(null), ...jours];
  while (cases.length % 7 !== 0) cases.push(null);
  return Array.from({ length: cases.length / 7 }, (_, i) => cases.slice(i * 7, i * 7 + 7));
}
