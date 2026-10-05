export const TYPES_LOGEMENT = [
  { value: "appartement", label: "Appartement" },
  { value: "villa", label: "Villa" },
  { value: "riad", label: "Riad" },
  { value: "studio", label: "Studio" },
  { value: "autre", label: "Autre" },
] as const;

export const STATUTS_LOGEMENT = [
  { value: "actif", label: "Actif", ton: "ok" },
  { value: "en_pause", label: "En pause", ton: "attention" },
  { value: "onboarding", label: "Onboarding", ton: "marque" },
] as const;

export type TypeLogement = (typeof TYPES_LOGEMENT)[number]["value"];
export type StatutLogement = (typeof STATUTS_LOGEMENT)[number]["value"];

export const ROLES_CONTACT = [
  { value: "concierge", label: "Concierge de l'immeuble" },
  { value: "securite", label: "Sécurité" },
  { value: "syndic", label: "Syndic" },
  { value: "autre", label: "Autre" },
] as const;

export const TYPES_DOCUMENT = [
  { value: "contrat_gestion", label: "Contrat de gestion" },
  { value: "fiche_police", label: "Fiches de police", sensible: true },
  { value: "contrat_location", label: "Contrats de location" },
  { value: "etat_des_lieux", label: "États des lieux (photos horodatées)" },
  { value: "autre", label: "Autres documents" },
] as const;

export type TypeDocument = (typeof TYPES_DOCUMENT)[number]["value"];

export const PLATEFORMES = ["Airbnb", "Booking.com", "Vrbo", "Autre"] as const;

export const TAUX_COMMISSION_DEFAUT = 20;

export const TAILLE_MAX_DOCUMENT = 25 * 1024 * 1024; // 25 Mo
export const TAILLE_MAX_PHOTO = 20 * 1024 * 1024; // 20 Mo (réduites ensuite par le serveur)

export function libelleStatut(valeur: string) {
  return STATUTS_LOGEMENT.find((s) => s.value === valeur);
}
export function libelleType(valeur: string) {
  return TYPES_LOGEMENT.find((t) => t.value === valeur)?.label ?? valeur;
}

export function formatTaille(octets: number) {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}
