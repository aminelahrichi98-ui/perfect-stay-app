/*
  Estimation v2 : ce que le navigateur envoie (SchemaSaisie) et ce que le serveur fige (Snapshot).
  Le serveur recharge lui-même les données de marché, les paramètres, l'offre, les comparables et les
  témoignages depuis la base, puis refait le calcul : aucun chiffre envoyé par le navigateur n'est repris tel quel.
*/
import { z } from "zod";
import type { Charges, LongueDuree, ParametresFinanciers, ResultatCalcul } from "./calcul.ts";

export const TYPES_LOGEMENT = ["studio", "appartement", "duplex", "penthouse", "villa", "riad", "autre"] as const;
export type TypeLogement = (typeof TYPES_LOGEMENT)[number];
export const LIBELLES_LOGEMENT: Record<TypeLogement, string> = { studio: "Studio", appartement: "Appartement", duplex: "Duplex", penthouse: "Penthouse", villa: "Villa", riad: "Riad", autre: "Autre" };

export const EQUIPEMENTS = [
  { cle: "wifi", libelle: "Wi-Fi haut débit" },
  { cle: "climatisation", libelle: "Climatisation" },
  { cle: "cuisine_equipee", libelle: "Cuisine équipée" },
  { cle: "lave_linge", libelle: "Lave-linge" },
  { cle: "lave_vaisselle", libelle: "Lave-vaisselle" },
  { cle: "tv_connectee", libelle: "TV connectée" },
  { cle: "espace_travail", libelle: "Espace de travail" },
  { cle: "serrure_connectee", libelle: "Serrure connectée / boîte à clés" },
  { cle: "ascenseur", libelle: "Ascenseur" },
  { cle: "balcon", libelle: "Balcon" },
  { cle: "vue_mer", libelle: "Vue mer" },
  { cle: "residence_securisee", libelle: "Résidence sécurisée" },
] as const;
export type CleEquipement = (typeof EQUIPEMENTS)[number]["cle"];

/** Recommandations proposées ; celles qui supposent l'absence d'un équipement présent ne sont pas proposées. */
export const RECOMMANDATIONS: { texte: string; absent?: CleEquipement }[] = [
  { texte: "Installer une serrure connectée pour proposer des arrivées autonomes, à toute heure.", absent: "serrure_connectee" },
  { texte: "Aménager un espace de travail (bureau, chaise confortable) pour attirer les séjours professionnels.", absent: "espace_travail" },
  { texte: "Installer une connexion fibre ou un Wi-Fi haut débit, premier critère des voyageurs.", absent: "wifi" },
  { texte: "Compléter l'équipement de la cuisine (machine à café, ustensiles) pour les séjours de plus d'une semaine.", absent: "cuisine_equipee" },
  { texte: "Ajouter un lave-linge, très recherché pour les séjours longs.", absent: "lave_linge" },
  { texte: "Équiper le logement de la climatisation, indispensable l'été.", absent: "climatisation" },
  { texte: "Ajouter une TV connectée avec les applications de streaming.", absent: "tv_connectee" },
  { texte: "Réaliser une séance photo professionnelle pour mettre l'annonce en valeur." },
  { texte: "Passer à une literie et un linge de qualité hôtelière pour améliorer les avis." },
  { texte: "Soigner la décoration (luminaires, coussins, plantes) pour se démarquer des annonces voisines." },
];

export function recommandationsProposees(equipements: string[]): string[] {
  return RECOMMANDATIONS.filter((r) => !r.absent || !equipements.includes(r.absent)).map((r) => r.texte);
}

/** Colonne historique « type_bien » (contrainte du module v1) déduite du logement. */
export function typeBienHerite(type: TypeLogement | null, chambres: number | null): "studio_1ch" | "2ch" | "3ch_plus" | "villa" {
  if (type === "villa" || type === "riad") return "villa";
  if (type === "studio" || chambres === null || chambres <= 1) return "studio_1ch";
  return chambres === 2 ? "2ch" : "3ch_plus";
}

/** La saisonnalité n'est montrée que si les 12 mois sont chiffrés, d'une même nature connue. */
export function saisonnaliteFiable(mensuels: { mois: number; nature: string }[]): boolean {
  for (const nature of ["historique", "prevision"]) {
    const mois = new Set(mensuels.filter((m) => m.nature === nature).map((m) => m.mois));
    if (mois.size === 12) return true;
  }
  return false;
}

const entierNul = (min: number, max: number) => z.number().int().min(min).max(max).nullable();
const montantNul = z.number().finite().min(0).max(1e9).nullable();
const triEtat = z.boolean().nullable();

export const SchemaBien = z.object({
  libelle: z.string().trim().max(120),
  ville: z.string().trim().max(80),
  quartier: z.string().trim().max(120),
  adresse: z.string().trim().max(200),
  residence: z.string().trim().max(120),
  type_logement: z.enum(TYPES_LOGEMENT).nullable(),
  chambres: entierNul(0, 20),
  surface: entierNul(5, 5000),
  capacite: entierNul(1, 50),
  standing: z.enum(["standard", "superieur", "premium"]).nullable(),
  salles_de_bain: entierNul(0, 20),
  equipements: z.array(z.string().max(40)).max(30),
  parking: triEtat,
  terrasse: triEtat,
  piscine: triEtat,
  salle_sport: triEtat,
  ameublement: z.enum(["meuble", "partiel", "non_meuble"]).nullable(),
  photos: z.array(z.string().regex(/^photos\/[0-9a-f-]{36}-[A-Za-z0-9._-]{1,80}$/)).max(8),
  exploitation: z.enum(["longue", "courte", "vacant", "autre"]).nullable(),
  occupation: z.enum(["occupe", "vacant", "bientot_libre"]).nullable(),
  loyer_longue_duree: montantNul,
  revenus_courte_mensuels: montantNul,
  attentes: z.string().trim().max(1000),
  lien_annonce: z.string().trim().max(500).refine((u) => u === "" || /^https:\/\/[^\s]+$/.test(u), "Lien https attendu."),
});
export type Bien = z.infer<typeof SchemaBien>;

export const bienVide = (): Bien => ({
  libelle: "", ville: "Casablanca", quartier: "", adresse: "", residence: "", type_logement: null, chambres: null, surface: null, capacite: null, standing: null,
  salles_de_bain: null, equipements: [], parking: null, terrasse: null, piscine: null, salle_sport: null, ameublement: null, photos: [], exploitation: null,
  occupation: null, loyer_longue_duree: null, revenus_courte_mensuels: null, attentes: "", lien_annonce: "",
});

/** Champs indispensables pour chercher les données de marché et calculer. */
export function manquantsBien(b: Bien): string[] {
  return [!b.ville && "ville", !b.quartier && "quartier", !b.type_logement && "type de logement", b.type_logement !== "studio" && b.chambres === null && "nombre de chambres"].filter(Boolean) as string[];
}

const taux = z.number().min(0).max(0.99);

export const SchemaSaisie = z.object({
  leadId: z.string().uuid(),
  bienId: z.string().uuid().nullable(),
  prenom: z.string().trim().min(1, "Indiquez le prénom du propriétaire.").max(80),
  bien: SchemaBien,
  versionId: z.string().uuid().nullable(),
  approximationConfirmee: z.boolean(),
  surcharges: z.object({ tauxPlateforme: taux.nullable(), tauxCommission: taux.nullable(), tvaCommission: taux.nullable(), methodeScenarios: z.enum(["fourchette", "percentiles"]).nullable() }),
  charges: z.object({ eau: montantNul, electricite: montantNul, internet: montantNul, syndic: montantNul, entretien: montantNul, autres: montantNul }),
  longueDuree: z.object({
    source: z.enum(["crm", "declare", "estime_marche", "fourchette"]).nullable(),
    loyer: montantNul,
    loyerBas: montantNul,
    loyerHaut: montantNul,
    charges: montantNul,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  }),
  offreId: z.string().uuid().nullable(),
  baseConfirmee: z.boolean(),
  comparableIds: z.array(z.string().uuid()).max(4),
  recommandations: z.array(z.string().trim().min(3).max(200)).max(3),
  temoignageIds: z.array(z.string().uuid()).max(2),
  photoBien: z.string().regex(/^photos\/[0-9a-f-]{36}-[A-Za-z0-9._-]{1,80}$/).nullable(),
  sections: z.object({ saisonnalite: z.boolean(), comparaisonLongueDuree: z.boolean() }),
  commercialId: z.string().uuid().nullable(),
  dureeCreationS: z.number().int().min(0).max(86400).nullable(),
});
export type Saisie = z.infer<typeof SchemaSaisie>;

export type ComparableFige = { nom: string; quartier: string; typologie: string; revenuAnnuel: number | null; revenuBas: number | null; revenuHaut: number | null; adr: number | null; occupation: number | null; url: string; photo: string };

export type Snapshot = {
  version: 2;
  creeLe: string;
  /** Saisie d'origine : permet de rouvrir un brouillon ou de créer une nouvelle version. */
  saisie: Saisie;
  proprietaire: { prenom: string; leadId: string };
  commercial: { nom: string; telephone: string } | null;
  bien: Bien;
  marche: {
    segmentId: string;
    versionId: string;
    numero: number;
    source: string;
    quartier: string;
    ville: string;
    typologie: string;
    correspondance: "exacte" | "regroupement" | "approximation";
    ecarts: string[];
    periodeDebut: string | null;
    periodeFin: string | null;
    typePeriode: string;
    dateImport: string;
    devise: string;
    echantillon: number | null;
    adr: number | null;
    occupation: number | null;
    nuitsReservees: number | null;
    revenuBas: number | null;
    revenuCentral: number | null;
    revenuHaut: number | null;
    natureCentral: string;
    percentiles: { libelle: string; rang: number | null; metrique: string; valeur: number | null }[];
    mensuels: { mois: number; annee: number | null; valeur: number; nature: string }[];
    base: { plateformeIncluse: boolean | null; menageInclus: boolean | null; taxesIncluses: boolean | null; definition: string };
  } | null; // null seulement pour un brouillon sans données de marché
  params: ParametresFinanciers & { personnalises: string[] };
  charges: Charges;
  longueDuree: LongueDuree;
  offre: { titre: string; description: string; dureeMois: number | null; conditions: string } | null;
  baseConfirmee: boolean;
  resultat: ResultatCalcul;
  comparables: ComparableFige[];
  recommandations: string[];
  temoignages: { auteur: string; contexte: string; texte: string }[];
  photoBien: string | null;
  sections: { saisonnalite: boolean; comparaisonLongueDuree: boolean; preuve: boolean; qrCode: boolean };
  commercialParams: { ctaTexte: string; whatsapp: string; messageWhatsapp: string; lienRdv: string; email: string; telephone: string; services: string[]; mentionsLegales: string; validiteJours: number };
};
