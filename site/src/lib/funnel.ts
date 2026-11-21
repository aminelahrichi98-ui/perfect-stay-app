/*
  Tunnel de qualification des propriétaires : options, schémas de validation (partagés entre
  le navigateur et l'API) et règles conditionnelles selon la situation locative.
*/
import { z } from "zod";

export const VILLES = ["Casablanca", "Marrakech", "Rabat", "Autre"] as const;
export const QUARTIERS_CASABLANCA = ["Maarif", "Gauthier", "Racine", "Bourgogne", "Ain Diab", "Anfa", "Casa Finance City (CFC)", "Ferme Bretonne", "Les Princesses", "Palmier", "Centre-ville"];
export const TYPES_BIEN = ["Studio", "Appartement", "Duplex", "Penthouse", "Villa"] as const;
export const CHAMBRES = ["Studio", "1", "2", "3", "4 et +"] as const;
export const AMEUBLEMENT = ["Meublé", "Partiellement meublé", "Non meublé"] as const;
export const EQUIPEMENTS = ["Climatisation", "Ascenseur", "Parking", "Balcon ou terrasse", "Piscine", "Vue mer", "Salle de sport", "Wifi fibre"] as const;
export const SITUATIONS = { longue: "Location longue durée", courte: "Location courte durée", vacant: "Vacant ou bientôt disponible" } as const;
export const OCCUPATION_LONGUE = ["Occupé par un locataire", "Libre", "Bientôt libre"] as const;
export const DISPONIBILITE = ["Immédiatement", "Dans moins de 3 mois", "Dans 3 à 6 mois", "Plus tard / je ne sais pas"] as const;
export const GESTION_ACTUELLE = ["Je gère moi-même", "Un proche m'aide", "Une conciergerie", "Autre"] as const;
export const DEFIS = ["Le temps que cela me prend", "La communication avec les voyageurs", "Le ménage et la qualité", "Les prix et le taux d'occupation", "La maintenance", "Le suivi financier"] as const;
export const STRATEGIES = ["Courte durée", "Longue durée", "Je ne sais pas encore"] as const;
export const OBJECTIFS = ["Augmenter mes revenus", "Réduire la vacance", "Déléguer l'exploitation", "Améliorer la qualité de gestion", "Développer un portefeuille"] as const;

export const CRENEAUX = ["Le matin", "L'après-midi", "En fin de journée"] as const;

export const ETAPES = ["Ville", "Quartier", "Le bien", "Situation", "Objectif", "Contact", "Confirmation"] as const;

const choix = <T extends readonly [string, ...string[]]>(valeurs: T, message: string) => z.enum(valeurs, { error: message });
const optionnelPositif = z
  .union([z.literal(""), z.coerce.number().min(0, "Montant invalide.").max(10_000_000, "Montant invalide.")])
  .optional();

export const schemaVille = z.object({ ville: choix(VILLES, "Choisissez une ville."), villeAutre: z.string().trim().max(60).optional() }).refine((d) => d.ville !== "Autre" || (d.villeAutre ?? "").length >= 2, {
  message: "Indiquez la ville.",
  path: ["villeAutre"],
});

export const schemaQuartier = z.object({ quartier: z.string().trim().min(2, "Indiquez le quartier.").max(80) });

export const schemaBien = z.object({
  typeBien: choix(TYPES_BIEN, "Choisissez le type de bien."),
  surface: z.coerce.number({ error: "Indiquez la surface." }).int("Surface en m², sans décimales.").min(12, "Surface trop petite.").max(2000, "Surface trop grande."),
  chambres: choix(CHAMBRES, "Indiquez le nombre de chambres."),
  capacite: z.coerce.number({ error: "Indiquez la capacité." }).int().min(1, "Au moins 1 voyageur.").max(30, "30 voyageurs maximum."),
  ameublement: choix(AMEUBLEMENT, "Indiquez l'ameublement."),
  equipements: z.array(z.enum(EQUIPEMENTS)).max(EQUIPEMENTS.length).default([]),
});

export const schemaSituation = z.discriminatedUnion("situation", [
  z.object({
    situation: z.literal("longue"),
    loyer: optionnelPositif,
    occupation: choix(OCCUPATION_LONGUE, "Indiquez si le bien est occupé."),
    disponibilite: choix(DISPONIBILITE, "Indiquez la disponibilité prévue."),
  }),
  z.object({
    situation: z.literal("courte"),
    revenuMensuel: optionnelPositif,
    tauxOccupation: z.union([z.literal(""), z.coerce.number().min(0, "Entre 0 et 100 %.").max(100, "Entre 0 et 100 %.")]).optional(),
    gestionActuelle: choix(GESTION_ACTUELLE, "Indiquez votre mode de gestion actuel."),
    defi: choix(DEFIS, "Choisissez votre principal défi."),
    lienAnnonce: z.union([z.literal(""), z.string().trim().url("Lien invalide (il doit commencer par https://).").max(300)]).optional(),
  }),
  z.object({
    situation: z.literal("vacant"),
    disponibilite: choix(DISPONIBILITE, "Indiquez la disponibilité prévue."),
    ameublementPrevu: choix(AMEUBLEMENT, "Indiquez l'ameublement."),
    strategie: choix(STRATEGIES, "Choisissez une stratégie."),
  }),
]);

export const schemaObjectif = z.object({ objectifs: z.array(z.enum(OBJECTIFS)).min(1, "Choisissez au moins un objectif.").max(OBJECTIFS.length) });

export const schemaContact = z.object({
  prenom: z.string().trim().min(2, "Indiquez votre prénom.").max(60),
  nom: z.string().trim().min(2, "Indiquez votre nom.").max(60),
  telephone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ().-]{8,20}$/, "Numéro de téléphone invalide."),
  email: z.string().trim().email("Adresse e-mail invalide.").max(120),
  consentement: z.literal(true, { error: "Votre accord est nécessaire pour être recontacté." }),
  // Prise de rendez-vous : le propriétaire peut demander à être appelé, sur le créneau de son choix
  rendezVous: z.boolean().default(false),
  creneau: z.union([z.literal(""), z.enum(CRENEAUX)]).optional(),
});

/** Ce que le navigateur envoie à l'API */
export const schemaLead = z.object({
  ville: schemaVille,
  quartier: schemaQuartier,
  bien: schemaBien,
  situation: schemaSituation,
  objectif: schemaObjectif,
  contact: schemaContact,
  // Anti-spam : champ piège invisible (doit rester vide) et durée de remplissage
  site: z.string().max(0).optional(),
  dureeMs: z.number().int().min(0),
  attribution: z.record(z.string(), z.string().max(200)).optional(),
});

export type Lead = z.infer<typeof schemaLead>;

/** Premier message d'erreur par champ, pour l'affichage sous chaque contrôle */
export function erreursParChamp(e: z.ZodError): Record<string, string> {
  const res: Record<string, string> = {};
  for (const i of e.issues) {
    const cle = String(i.path[i.path.length - 1] ?? "_");
    if (!res[cle]) res[cle] = i.message;
  }
  return res;
}

/** Qualification simple et explicable, utile pour prioriser les rappels (pas une estimation financière). */
export function qualifier(l: Pick<Lead, "ville" | "bien" | "situation" | "objectif">): { niveau: "prioritaire" | "standard"; raisons: string[] } {
  const raisons: string[] = [];
  if (l.ville.ville === "Casablanca") raisons.push("Bien situé dans la zone d'exploitation actuelle");
  if (l.bien.ameublement === "Meublé") raisons.push("Bien déjà meublé");
  if (l.situation.situation === "vacant" || (l.situation.situation === "longue" && l.situation.occupation !== "Occupé par un locataire")) raisons.push("Bien disponible");
  if (l.situation.situation === "courte") raisons.push("Déjà exploité en courte durée");
  if (l.objectif.objectifs.includes("Développer un portefeuille")) raisons.push("Projet de portefeuille");
  return { niveau: l.ville.ville === "Casablanca" && raisons.length >= 2 ? "prioritaire" : "standard", raisons };
}
