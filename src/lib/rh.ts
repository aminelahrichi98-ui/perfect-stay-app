export const TYPES_CONTRAT = [
  { value: "cdi", label: "CDI" },
  { value: "cdd", label: "CDD" },
  { value: "freelance", label: "Freelance" },
  { value: "prestation", label: "Prestation de service" },
  { value: "stage", label: "Stage" },
  { value: "autre", label: "Autre" },
] as const;

export const CATEGORIES_MEMBRE = [
  { value: "equipe", label: "Équipe" },
  { value: "prestataire", label: "Prestataire" },
] as const;

export const ETAPES_CANDIDAT = [
  { value: "nouveau", label: "Nouveau", ton: "marque" },
  { value: "entretien", label: "Entretien", ton: "attention" },
  { value: "test", label: "Test", ton: "attention" },
  { value: "offre", label: "Offre", ton: "attention" },
  { value: "embauche", label: "Embauché", ton: "ok" },
  { value: "refuse", label: "Refusé", ton: "danger" },
] as const;

export const STATUTS_POSTE = [
  { value: "ouvert", label: "Ouvert", ton: "ok" },
  { value: "en_pause", label: "En pause", ton: "attention" },
  { value: "pourvu", label: "Pourvu", ton: "marque" },
  { value: "clos", label: "Clos", ton: "neutre" },
] as const;

export const libelleContrat = (v: string) => TYPES_CONTRAT.find((c) => c.value === v)?.label ?? v;

/** « 2 ans et 3 mois », « 5 mois », « moins d'un mois » : l'ancienneté d'un membre */
export function anciennete(arrivee: string, jusqua: Date = new Date()): string {
  const [a, m, j] = arrivee.split("-").map(Number);
  let mois = (jusqua.getUTCFullYear() - a) * 12 + (jusqua.getUTCMonth() + 1 - m);
  if (jusqua.getUTCDate() < j) mois -= 1;
  if (mois < 1) return "moins d'un mois";
  const ans = Math.floor(mois / 12);
  const reste = mois % 12;
  const parties = [ans ? `${ans} an${ans > 1 ? "s" : ""}` : "", reste ? `${reste} mois` : ""].filter(Boolean);
  return parties.join(" et ");
}
