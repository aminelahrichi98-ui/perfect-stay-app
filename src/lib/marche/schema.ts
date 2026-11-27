/*
  Données de marché validées (une version d'un segment PriceLabs) : format numérique, contrôlé
  côté serveur avant tout enregistrement. Les valeurs absentes restent null, jamais 0.
*/
import { z } from "zod";

export const TYPES_SEGMENT = ["studio", "appartement", "villa", "riad"] as const;
export type TypeSegment = (typeof TYPES_SEGMENT)[number];
export const STANDINGS = ["standard", "superieur", "premium"] as const;
export type Standing = (typeof STANDINGS)[number];
export const CONFIANCES = ["haute", "moyenne", "basse"] as const;
export const NATURES_CENTRAL = ["moyenne", "mediane", "percentile", "prevision", "autre", "inconnu"] as const;
export const METRIQUES_PERCENTILE = ["revenu_annuel", "revenu_mensuel", "prix_moyen_nuit", "taux_occupation", "autre"] as const;
export const NATURES_MENSUEL = ["historique", "prevision", "inconnu"] as const;

export const LIBELLES_TYPE: Record<TypeSegment, string> = { studio: "Studio", appartement: "Appartement", villa: "Villa", riad: "Riad" };
export const LIBELLES_STANDING: Record<Standing, string> = { standard: "Standard", superieur: "Supérieur", premium: "Premium" };
export const LIBELLES_NATURE_CENTRAL: Record<(typeof NATURES_CENTRAL)[number], string> = {
  moyenne: "moyenne",
  mediane: "médiane",
  percentile: "percentile",
  prevision: "prévision",
  autre: "valeur centrale",
  inconnu: "valeur centrale (nature non précisée)",
};

const montant = z.number().finite().min(0).max(1e9).nullable();
const jour = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();

export const SchemaPreuve = z.object({
  champ: z.string().max(80),
  texte: z.string().max(300).nullable(),
  libelle: z.string().max(200).nullable(),
  capture: z.number().int().min(1).max(30).nullable(),
  confiance: z.enum(CONFIANCES).nullable(),
});
export type Preuve = z.infer<typeof SchemaPreuve>;

export const SchemaComparable = z.object({
  nom: z.string().max(200),
  quartier: z.string().max(120),
  type_logement: z.string().max(60),
  chambres: z.number().int().min(0).max(20).nullable(),
  capacite: z.number().int().min(1).max(50).nullable(),
  revenu_annuel: montant,
  revenu_annuel_bas: montant,
  revenu_annuel_haut: montant,
  adr: montant,
  occupation: z.number().min(0).max(100).nullable(),
  note: z.number().min(0).max(5).nullable(),
  nb_avis: z.number().int().min(0).max(100000).nullable(),
  equipements: z.array(z.string().max(80)).max(40),
  url: z.string().max(500).refine((u) => u === "" || /^https:\/\/[^\s]+$/.test(u), "Lien https attendu."),
  identifiant: z.string().max(100),
  capture: z.number().int().min(1).max(30).nullable(),
  affichable: z.boolean(),
});
export type ComparableMarche = z.infer<typeof SchemaComparable>;

export const SchemaDonneesMarche = z.object({
  segment: z.object({
    pays: z.string().regex(/^[A-Z]{2}$/),
    ville: z.string().max(80),
    quartier: z.string().max(120),
    type_logement: z.enum(TYPES_SEGMENT).nullable(),
    chambres: z.number().int().min(0).max(20).nullable(),
    chambres_max: z.number().int().min(1).max(20).nullable(),
    capacite: z.number().int().min(1).max(50).nullable(),
    standing: z.enum(STANDINGS).nullable(),
  }),
  periode: z.object({ debut: jour, fin: jour, type: z.string().max(120) }),
  devise: z.string().regex(/^[A-Z]{3}$/).nullable(),
  base: z.object({
    plateforme_incluse: z.boolean().nullable(),
    menage_inclus: z.boolean().nullable(),
    taxes_incluses: z.boolean().nullable(),
    definition: z.string().max(600),
  }),
  metriques: z.object({
    revenu_annuel_bas: montant,
    revenu_annuel_central: montant,
    revenu_annuel_haut: montant,
    revenu_mensuel_moyen: montant,
    adr: montant,
    occupation: z.number().min(0).max(100).nullable(),
    nuits_reservees: z.number().min(0).max(366).nullable(),
    echantillon: z.number().int().min(0).max(100000).nullable(),
  }),
  central_nature: z.enum(NATURES_CENTRAL),
  percentiles: z.array(z.object({ libelle: z.string().max(80), rang: z.number().int().min(1).max(99).nullable(), metrique: z.enum(METRIQUES_PERCENTILE), valeur: montant })).max(20),
  mensuels: z.array(z.object({ mois: z.number().int().min(1).max(12), annee: z.number().int().min(2000).max(2100).nullable(), valeur: z.number().finite().min(0).max(1e8), nature: z.enum(NATURES_MENSUEL) })).max(24),
  comparables: z.array(SchemaComparable).max(30),
  parametres_recherche: z.array(z.object({ libelle: z.string().max(120), valeur: z.string().max(300) })).max(30),
  infos_frais: z.string().max(1000),
  autres: z.array(z.object({ libelle: z.string().max(120), valeur: z.number().finite().nullable(), unite: z.string().max(30) })).max(30),
  plusieurs_segments: z.boolean(),
  preuves: z.array(SchemaPreuve).max(300),
  avertissements: z.array(z.string().max(400)).max(60),
  manquants: z.array(z.string().max(80)).max(60),
});
export type DonneesMarche = z.infer<typeof SchemaDonneesMarche>;

/** Données vides, pour une saisie manuelle sans IA. */
export function donneesVides(): DonneesMarche {
  return {
    segment: { pays: "MA", ville: "", quartier: "", type_logement: null, chambres: null, chambres_max: null, capacite: null, standing: null },
    periode: { debut: null, fin: null, type: "" },
    devise: null,
    base: { plateforme_incluse: null, menage_inclus: null, taxes_incluses: null, definition: "" },
    metriques: { revenu_annuel_bas: null, revenu_annuel_central: null, revenu_annuel_haut: null, revenu_mensuel_moyen: null, adr: null, occupation: null, nuits_reservees: null, echantillon: null },
    central_nature: "inconnu",
    percentiles: [],
    mensuels: [],
    comparables: [],
    parametres_recherche: [],
    infos_frais: "",
    autres: [],
    plusieurs_segments: false,
    preuves: [],
    avertissements: [],
    manquants: [],
  };
}

export const LIBELLES_CHAMPS: Record<string, string> = {
  ville: "Ville",
  quartier: "Quartier",
  type_logement: "Type de logement",
  chambres: "Nombre de chambres",
  capacite: "Capacité voyageurs",
  standing: "Standing",
  devise: "Devise",
  periode: "Période analysée",
  revenus: "Revenus annuels",
  revenu_annuel_bas: "Revenu annuel bas",
  revenu_annuel_central: "Revenu annuel central",
  revenu_annuel_haut: "Revenu annuel haut",
  revenu_mensuel_moyen: "Revenu mensuel moyen",
  adr: "Prix moyen par nuit",
  occupation: "Taux d'occupation",
  nuits_reservees: "Nuits réservées",
  echantillon: "Nombre de logements analysés",
  base_plateforme: "Frais de plateforme inclus ou non dans les revenus",
  base_menage: "Frais de ménage inclus ou non dans les revenus",
  base_taxes: "Taxes incluses ou non dans les revenus",
};
