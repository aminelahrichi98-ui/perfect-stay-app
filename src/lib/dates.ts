/*
  Dates « calendaires » : toujours des textes AAAA-MM-JJ, calculés en UTC pour éviter tout décalage
  d'heure (fuseau Africa/Casablanca, changement d'heure du Ramadan…).
*/
const FUSEAU = "Africa/Casablanca";

export type Jour = string; // AAAA-MM-JJ

const versUtc = (j: Jour) => {
  const [a, m, d] = j.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
};
const depuisUtc = (t: number): Jour => new Date(t).toISOString().slice(0, 10);

export function ajouterJours(j: Jour, n: number): Jour {
  return depuisUtc(versUtc(j) + n * 86_400_000);
}

/** Nombre de nuits entre deux jours (départ exclu) */
export function nbNuits(arrivee: Jour, depart: Jour): number {
  return Math.round((versUtc(depart) - versUtc(arrivee)) / 86_400_000);
}

/** Aujourd'hui à Casablanca */
export function aujourdhui(maintenant: Date = new Date()): Jour {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSEAU, year: "numeric", month: "2-digit", day: "2-digit" }).format(maintenant);
}

/** Jour de la semaine, lundi = 0 … dimanche = 6 */
export function jourSemaine(j: Jour): number {
  return (new Date(versUtc(j)).getUTCDay() + 6) % 7;
}

export type Mois = string; // AAAA-MM

export function moisDe(j: Jour): Mois {
  return j.slice(0, 7);
}
export function premierDuMois(m: Mois): Jour {
  return `${m}-01`;
}
export function moisSuivant(m: Mois): Mois {
  const [a, mm] = m.split("-").map(Number);
  return mm === 12 ? `${a + 1}-01` : `${a}-${String(mm + 1).padStart(2, "0")}`;
}
export function moisPrecedent(m: Mois): Mois {
  const [a, mm] = m.split("-").map(Number);
  return mm === 1 ? `${a - 1}-12` : `${a}-${String(mm - 1).padStart(2, "0")}`;
}
export function nbJoursDuMois(m: Mois): number {
  return nbNuits(premierDuMois(m), premierDuMois(moisSuivant(m)));
}
export function moisValide(texte: string | undefined): texte is Mois {
  return !!texte && /^\d{4}-(0[1-9]|1[0-2])$/.test(texte);
}

/** « octobre 2026 » */
export function libelleMois(m: Mois): string {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(versUtc(premierDuMois(m))));
}

/** JJ/MM/AAAA */
export function formatJour(j: Jour): string {
  const [a, m, d] = j.split("-");
  return `${d}/${m}/${a}`;
}

/** « lun. 5 » */
export function libelleJourCourt(j: Jour): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(versUtc(j)));
}

/** Date ISO (avec heure, éventuellement en UTC) → jour à Casablanca */
export function jourDepuisInstant(iso: string): Jour {
  return aujourdhui(new Date(iso));
}
