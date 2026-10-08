/** Règles et libellés des Opérations (sans accès à la base : testables et utilisables partout). */

export type Ton = "neutre" | "ok" | "attention" | "danger" | "marque";

/* ------------------------------------ Ménage ------------------------------------ */

export type EtatMenage = {
  cle: "a_faire" | "en_cours" | "bloque" | "a_controler" | "valide" | "a_refaire" | "annule";
  libelle: string;
  ton: Ton;
};

/** L'état affiché d'un ménage : l'avancement (prestataire) et le contrôle qualité (équipe) réunis. */
export function etatMenage(t: { statut: string; controle: string }): EtatMenage {
  if (t.statut === "annule") return { cle: "annule", libelle: "Annulé", ton: "neutre" };
  if (t.statut === "termine") {
    return t.controle === "valide"
      ? { cle: "valide", libelle: "Validé", ton: "ok" }
      : { cle: "a_controler", libelle: "À contrôler", ton: "marque" };
  }
  if (t.controle === "a_refaire") return { cle: "a_refaire", libelle: "À refaire", ton: "danger" };
  if (t.statut === "en_cours") return { cle: "en_cours", libelle: "En cours", ton: "attention" };
  if (t.statut === "bloque") return { cle: "bloque", libelle: "Bloqué", ton: "danger" };
  return { cle: "a_faire", libelle: "À faire", ton: "neutre" };
}

/* ------------------------------------ Check-lists ------------------------------------ */

export const TYPES_MODELE = [
  { value: "menage", label: "Ménage" },
  { value: "controle", label: "Contrôle qualité" },
  { value: "checkin", label: "Check-in" },
  { value: "autre", label: "Autre" },
] as const;

export function progression(faits: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((faits / total) * 100);
}

/** Points obligatoires encore à traiter avant de pouvoir terminer : photo requise mais absente, point non coché. */
export function pointsManquants(points: { id: string; fait: boolean; photo_requise: boolean }[], pointsAvecPhoto: Set<string>) {
  return {
    nonCoches: points.filter((p) => !p.fait).length,
    photosManquantes: points.filter((p) => p.photo_requise && !pointsAvecPhoto.has(p.id)).length,
  };
}

/* ------------------------------------ Maintenance ------------------------------------ */

export const TYPES_INCIDENT = [
  { value: "panne", label: "Panne" },
  { value: "degat", label: "Dégât" },
  { value: "plainte", label: "Plainte" },
  { value: "autre", label: "Autre" },
] as const;

export const STATUTS_INCIDENT: { value: "signale" | "en_cours" | "resolu"; label: string; ton: Ton }[] = [
  { value: "signale", label: "Signalé", ton: "danger" },
  { value: "en_cours", label: "En cours", ton: "attention" },
  { value: "resolu", label: "Résolu", ton: "ok" },
];

export const REMBOURSEMENTS: { value: "a_rembourser" | "rembourse" | "sans_objet"; label: string; ton: Ton }[] = [
  { value: "a_rembourser", label: "À rembourser", ton: "attention" },
  { value: "rembourse", label: "Remboursé", ton: "ok" },
  { value: "sans_objet", label: "Sans remboursement", ton: "neutre" },
];

export const libelleType = (liste: readonly { value: string; label: string }[], v: string) => liste.find((x) => x.value === v)?.label ?? v;

const centimes = (mad: number) => Math.round(mad * 100);

/** Somme en MAD, calculée en centimes pour éviter les écarts d'arrondi */
export function sommeMad(montants: number[]) {
  return montants.reduce((s, m) => s + centimes(m), 0) / 100;
}

export type IncidentAvecFrais = {
  logement_id: string;
  remboursement: string;
  frais: number;
};

/** Ce que chaque logement doit encore à Perfect Stay (frais avancés non remboursés) et ce qui a déjà été remboursé. */
export function soldesParLogement(incidents: IncidentAvecFrais[]) {
  const parLogement = new Map<string, { logementId: string; aRembourser: number; rembourse: number; nb: number }>();
  for (const i of incidents) {
    if (i.remboursement === "sans_objet") continue;
    const ligne = parLogement.get(i.logement_id) ?? { logementId: i.logement_id, aRembourser: 0, rembourse: 0, nb: 0 };
    if (i.remboursement === "rembourse") ligne.rembourse += centimes(i.frais);
    else {
      ligne.aRembourser += centimes(i.frais);
      ligne.nb += 1;
    }
    parLogement.set(i.logement_id, ligne);
  }
  return [...parLogement.values()].map((l) => ({ ...l, aRembourser: l.aRembourser / 100, rembourse: l.rembourse / 100 }));
}

/* ------------------------------------ Stock ------------------------------------ */

export const CATEGORIES_STOCK = [
  { value: "linge", label: "Linge" },
  { value: "accueil", label: "Produits d'accueil" },
  { value: "consommable", label: "Consommables" },
  { value: "autre", label: "Autre" },
] as const;

export type AlerteStock = "ok" | "bas" | "rupture";

/** Alerte quand le total (réserve + logements) passe sous le seuil ; rupture quand il n'y en a plus. */
export function alerteStock(total: number, seuil: number): AlerteStock {
  if (seuil <= 0) return total < 0 ? "rupture" : "ok";
  if (total <= 0) return "rupture";
  return total < seuil ? "bas" : "ok";
}

/* ------------------------------------ Onboarding ------------------------------------ */

export const ETAPES_ONBOARDING = [
  { cle: "visite", libelle: "Visite du logement", aide: "Rencontrer le propriétaire et visiter le bien." },
  { cle: "inventaire", libelle: "Inventaire", aide: "Lister le mobilier, l'équipement et le linge présents." },
  { cle: "photos", libelle: "Photos", aide: "Photos du logement, ajoutées dans sa fiche." },
  { cle: "achats", libelle: "Achats d'équipement", aide: "Ce qu'il manque pour accueillir des voyageurs." },
  { cle: "contrat", libelle: "Contrat de gestion signé", aide: "Contrat signé, ajouté dans les documents de la fiche." },
  { cle: "annonce", libelle: "Création de l'annonce", aide: "Annonce rédigée sur la plateforme." },
  { cle: "ical", libelle: "Lien iCal ajouté", aide: "Le calendrier de l'annonce est relié dans la fiche." },
  { cle: "en_ligne", libelle: "Mise en ligne", aide: "L'annonce est publiée et réservable." },
] as const;

export type CleEtape = (typeof ETAPES_ONBOARDING)[number]["cle"];

/** Étapes que l'app sait reconnaître toute seule à partir de la fiche du logement. */
export function etapesDetectees(f: { nbPhotos: number; nbIcal: number; aContrat: boolean }): Set<CleEtape> {
  const s = new Set<CleEtape>();
  if (f.nbPhotos > 0) s.add("photos");
  if (f.nbIcal > 0) s.add("ical");
  if (f.aContrat) s.add("contrat");
  return s;
}

/** Une étape compte comme faite si elle est cochée à la main ou reconnue dans la fiche. */
export function etapesFaites(cochees: Set<string>, detectees: Set<CleEtape>) {
  return ETAPES_ONBOARDING.filter((e) => cochees.has(e.cle) || detectees.has(e.cle)).map((e) => e.cle);
}
