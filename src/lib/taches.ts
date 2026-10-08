import { ajouterJours, jourSemaine, type Jour } from "./dates.ts";

export type Ton = "neutre" | "ok" | "attention" | "danger" | "marque";

export const STATUTS_TACHE = [
  { value: "a_faire", label: "À faire", ton: "neutre" },
  { value: "en_cours", label: "En cours", ton: "attention" },
  { value: "bloque", label: "Bloqué", ton: "danger" },
  { value: "termine", label: "Terminé", ton: "ok" },
] as const satisfies readonly { value: string; label: string; ton: Ton }[];

export type StatutTache = (typeof STATUTS_TACHE)[number]["value"];

export const PRIORITES = [
  { value: "urgent", label: "Urgent", ton: "danger", rang: 0 },
  { value: "important", label: "Important", ton: "attention", rang: 1 },
  { value: "normal", label: "Normal", ton: "neutre", rang: 2 },
] as const satisfies readonly { value: string; label: string; ton: Ton; rang: number }[];

export const libelleStatut = (v: string) => STATUTS_TACHE.find((s) => s.value === v)?.label ?? v;
export const prioriteDe = (v: string) => PRIORITES.find((p) => p.value === v) ?? PRIORITES[2];

/** Lundi de la semaine qui contient ce jour */
export function lundiDe(j: Jour): Jour {
  return ajouterJours(j, -jourSemaine(j));
}

/** Les 7 jours d'une semaine, du lundi au dimanche */
export function joursDeLaSemaine(lundi: Jour): Jour[] {
  return Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i));
}

/** Tri : priorité (urgent d'abord), puis échéance (sans échéance à la fin), puis titre */
export function comparerTaches(a: { priorite: string; echeance: string | null; titre: string }, b: { priorite: string; echeance: string | null; titre: string }) {
  return (
    prioriteDe(a.priorite).rang - prioriteDe(b.priorite).rang ||
    (a.echeance ?? "9999").localeCompare(b.echeance ?? "9999") ||
    a.titre.localeCompare(b.titre, "fr")
  );
}

/** « Amine Lahrichi » → « AL » */
export function initiales(nom: string) {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase())
    .join("");
}

/** Une tâche est en retard si elle n'est ni terminée ni annulée et que son échéance est passée */
export const enRetard = (t: { statut: string; echeance: string | null }, aujourdhui: Jour) =>
  Boolean(t.echeance) && t.echeance! < aujourdhui && t.statut !== "termine" && t.statut !== "annule";

export const VUES_TACHES = ["semaine", "kanban"] as const;
export type VueTaches = (typeof VUES_TACHES)[number];
export const COOKIE_VUE_TACHES = "ps_vue_taches";
