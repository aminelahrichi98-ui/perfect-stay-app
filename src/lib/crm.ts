export type Ton = "neutre" | "ok" | "attention" | "danger" | "marque";

export const ETAPES_CRM = [
  { value: "nouveau", label: "Nouveau lead", ton: "marque" },
  { value: "appele", label: "Appelé", ton: "neutre" },
  { value: "rdv", label: "Rendez-vous", ton: "attention" },
  { value: "estimation", label: "Estimation envoyée", ton: "attention" },
  { value: "proposition", label: "Proposition", ton: "attention" },
  { value: "signe", label: "Signé", ton: "ok" },
  { value: "perdu", label: "Perdu", ton: "danger" },
] as const satisfies readonly { value: string; label: string; ton: Ton }[];

export type EtapeCrm = (typeof ETAPES_CRM)[number]["value"];

export const RESULTATS_APPEL = [
  { value: "pas_de_reponse", label: "Pas de réponse" },
  { value: "repondeur", label: "Répondeur" },
  { value: "rappeler", label: "À rappeler" },
  { value: "rdv_pris", label: "Rendez-vous pris" },
  { value: "pas_interesse", label: "Pas intéressé" },
  { value: "autre", label: "Autre" },
] as const;

export const SOURCES = [
  { value: "meta", label: "Meta (formulaire)" },
  { value: "manuel", label: "Saisie manuelle" },
  { value: "import", label: "Import CSV" },
  { value: "recommandation", label: "Recommandation" },
  { value: "autre", label: "Autre" },
] as const;

export const libelleEtape = (v: string) => ETAPES_CRM.find((e) => e.value === v)?.label ?? v;
export const libelleSource = (v: string) => SOURCES.find((s) => s.value === v)?.label ?? v;
export const libelleResultat = (v: string) => RESULTATS_APPEL.find((r) => r.value === v)?.label ?? v;

/** Taux de conversion en % (une décimale), ou null s'il n'y a aucun lead sur la période */
export function tauxConversion(signes: number, recus: number): number | null {
  if (recus <= 0) return null;
  return Math.round((signes / recus) * 1000) / 10;
}

/** « aujourd'hui », « hier », « il y a 5 j » : l'âge d'un lead d'un coup d'œil */
export function ageLead(cree: string, maintenant: Date = new Date()): string {
  const jours = Math.floor((maintenant.getTime() - new Date(cree).getTime()) / 86_400_000);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  if (jours < 60) return `il y a ${jours} j`;
  return `il y a ${Math.floor(jours / 30)} mois`;
}

/** Numéro marocain comparable : 0612345678, +212612345678 et 00212 612 345 678 donnent le même résultat. */
export function normaliserTelephone(brut: string): string {
  let t = brut.replace(/[^\d+]/g, "");
  if (t.startsWith("+")) t = t.slice(1);
  else if (t.startsWith("00")) t = t.slice(2);
  if (t.startsWith("212") && t.length >= 11) t = `0${t.slice(3)}`;
  return t.replace(/\D/g, "");
}

/** Lien « appeler » : le numéro marocain devient international (+212…) pour fonctionner depuis n'importe où. */
export function lienAppel(brut: string): string | null {
  const n = normaliserTelephone(brut);
  if (n.length < 8) return null;
  return n.startsWith("0") ? `tel:+212${n.slice(1)}` : `tel:+${n}`;
}
