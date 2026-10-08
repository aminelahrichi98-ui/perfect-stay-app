export const CANAUX = [
  { value: "meta", label: "Meta" },
  { value: "google", label: "Google" },
  { value: "autre", label: "Autre" },
] as const;

export const RESEAUX = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "autre", label: "Autre" },
] as const;

export const STATUTS_PUBLICATION = [
  { value: "idee", label: "Idée", ton: "neutre" },
  { value: "a_rediger", label: "À rédiger", ton: "attention" },
  { value: "pret", label: "Prêt", ton: "marque" },
  { value: "publie", label: "Publié", ton: "ok" },
] as const;

export const libelleCanal = (v: string) => CANAUX.find((c) => c.value === v)?.label ?? v;
export const libelleReseau = (v: string) => RESEAUX.find((r) => r.value === v)?.label ?? v;

/** Coût d'un lead en MAD (dépenses ÷ leads reçus), ou null quand aucun lead n'a été reçu. */
export function coutParLead(depenses: number, leads: number): number | null {
  if (leads <= 0) return null;
  return Math.round((depenses / leads) * 100) / 100;
}
