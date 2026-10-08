import { ajouterJours, jourSemaine, moisDe, moisSuivant, nbJoursDuMois, premierDuMois, type Jour } from "./dates.ts";

/** Règle de répétition d'une tâche. Jour de semaine : lundi = 0 … dimanche = 6. */
export type Regle = {
  frequence: "jour" | "semaine" | "mois" | "dernier_jour_mois";
  jour_semaine: number | null;
  jour_mois: number | null;
};

export const FREQUENCES = [
  { value: "jour", label: "Chaque jour" },
  { value: "semaine", label: "Chaque semaine" },
  { value: "mois", label: "Chaque mois, à un jour précis" },
  { value: "dernier_jour_mois", label: "Le dernier jour de chaque mois" },
] as const;

export const JOURS_SEMAINE = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] as const;

/** Dernier jour du mois d'un jour donné (28, 29, 30 ou 31 selon le mois et l'année) */
export function dernierJourDuMois(j: Jour): Jour {
  const m = moisDe(j);
  return ajouterJours(premierDuMois(moisSuivant(m)), -1);
}

export function correspond(regle: Regle, j: Jour): boolean {
  switch (regle.frequence) {
    case "jour":
      return true;
    case "semaine":
      return jourSemaine(j) === (regle.jour_semaine ?? 0);
    case "mois": {
      // Un jour demandé après la fin du mois (ex. 31 en février) tombe sur le dernier jour
      const voulu = Math.min(regle.jour_mois ?? 1, nbJoursDuMois(moisDe(j)));
      return Number(j.slice(8)) === voulu;
    }
    case "dernier_jour_mois":
      return j === dernierJourDuMois(j);
  }
}

/** Dates d'échéance d'une règle entre deux jours inclus */
export function occurrences(regle: Regle, depuis: Jour, jusqua: Jour): Jour[] {
  const sortie: Jour[] = [];
  for (let j = depuis, garde = 0; j <= jusqua && garde < 800; j = ajouterJours(j, 1), garde++) {
    if (correspond(regle, j)) sortie.push(j);
  }
  return sortie;
}

export function libelleRegle(r: Regle): string {
  switch (r.frequence) {
    case "jour":
      return "Chaque jour";
    case "semaine":
      return `Chaque ${JOURS_SEMAINE[r.jour_semaine ?? 0]}`;
    case "mois":
      return `Le ${r.jour_mois === 1 ? "1er" : r.jour_mois} de chaque mois`;
    case "dernier_jour_mois":
      return "Le dernier jour de chaque mois";
  }
}
