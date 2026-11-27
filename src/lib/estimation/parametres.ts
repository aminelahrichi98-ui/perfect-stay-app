/*
  Paramètres de l'estimateur (une seule ligne en base, modifiable par un administrateur).
  Valeurs par défaut = configuration initiale de la migration 0015.
*/
import { z } from "zod";
import { parametresDepuisBase, type ParametresFinanciers } from "./calcul.ts";

export type ParametresEstimateur = {
  financier: ParametresFinanciers;
  commercial: { ctaTexte: string; whatsapp: string; messageWhatsapp: string; lienRdv: string; email: string; telephone: string; services: string[] };
  document: { mentionsLegales: string; validiteJours: number; maxComparables: number; sectionSaisonnalite: boolean; sectionPreuve: boolean; qrCode: boolean };
  donnees: { fraicheurRecente: number; fraicheurAlerte: number; standingObligatoire: boolean; toleranceCapacite: number; iaActive: boolean; iaModele: string };
  majLe: string | null;
};

export const COLONNES_PARAMETRES =
  "taux_plateforme, tva_plateforme, taux_commission, tva_commission, base_commission, menage_mode, menage_plateforme_preleve, menage_part_revenu, methode_scenarios, arrondi_mensuel, devise, cta_texte, whatsapp, message_whatsapp, lien_rdv, email_contact, telephone_contact, services, mentions_legales, validite_jours, max_comparables, section_saisonnalite, section_preuve, qr_code, fraicheur_recente_jours, fraicheur_alerte_jours, standing_obligatoire, tolerance_capacite, ia_active, ia_modele, updated_at";

const DEFAUT: Record<string, unknown> = {
  taux_plateforme: 0.18, tva_plateforme: 0, taux_commission: 0.2, tva_commission: 0, base_commission: "apres_plateforme", menage_mode: "inconnu",
  menage_plateforme_preleve: false, menage_part_revenu: null, methode_scenarios: "fourchette", arrondi_mensuel: 100, devise: "MAD",
  cta_texte: "Réserver ma visite gratuite", whatsapp: "", message_whatsapp: "Bonjour, j'ai reçu mon estimation Perfect Stay et je souhaite organiser une visite de mon appartement.",
  lien_rdv: "", email_contact: "", telephone_contact: "", services: [], mentions_legales: "", validite_jours: 30, max_comparables: 4,
  section_saisonnalite: true, section_preuve: true, qr_code: true, fraicheur_recente_jours: 30, fraicheur_alerte_jours: 90,
  standing_obligatoire: false, tolerance_capacite: 1, ia_active: true, ia_modele: "claude-opus-5-5", updated_at: null,
};

export function parametresDepuisLigne(ligne: Record<string, unknown> | null | undefined): ParametresEstimateur {
  const r = { ...DEFAUT, ...(ligne ?? {}) };
  const t = (v: unknown) => (typeof v === "string" ? v : "");
  const n = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
  return {
    financier: parametresDepuisBase(r),
    commercial: {
      ctaTexte: t(r.cta_texte) || "Réserver ma visite gratuite",
      whatsapp: t(r.whatsapp),
      messageWhatsapp: t(r.message_whatsapp),
      lienRdv: t(r.lien_rdv),
      email: t(r.email_contact),
      telephone: t(r.telephone_contact),
      services: Array.isArray(r.services) ? r.services.filter((s): s is string => typeof s === "string" && s.trim() !== "").slice(0, 8) : [],
    },
    document: {
      mentionsLegales: t(r.mentions_legales),
      validiteJours: n(r.validite_jours, 30),
      maxComparables: Math.min(4, Math.max(2, n(r.max_comparables, 4))),
      sectionSaisonnalite: Boolean(r.section_saisonnalite),
      sectionPreuve: Boolean(r.section_preuve),
      qrCode: Boolean(r.qr_code),
    },
    donnees: {
      fraicheurRecente: n(r.fraicheur_recente_jours, 30),
      fraicheurAlerte: n(r.fraicheur_alerte_jours, 90),
      standingObligatoire: Boolean(r.standing_obligatoire),
      toleranceCapacite: n(r.tolerance_capacite, 1),
      iaActive: Boolean(r.ia_active),
      iaModele: t(r.ia_modele) || "claude-opus-5-5",
    },
    majLe: typeof r.updated_at === "string" ? r.updated_at : null,
  };
}

/** Numéro WhatsApp au format international sans « + » (212…), ou "" s'il est inutilisable. */
export function numeroWhatsapp(brut: string): string {
  let c = brut.replace(/[^\d+]/g, "");
  if (c.startsWith("+")) c = c.slice(1);
  else if (c.startsWith("00")) c = c.slice(2);
  else if (/^0[5-7]\d{8}$/.test(c)) c = `212${c.slice(1)}`;
  return /^\d{8,15}$/.test(c) ? c : "";
}

export function lienWhatsapp(numero: string, message: string): string {
  const n = numeroWhatsapp(numero);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(message)}` : "";
}

const taux = z.number().min(0).max(0.99);
const texte = (max: number) => z.string().trim().max(max);

/** Contrôle serveur du formulaire d'administration (taux saisis en fraction : 0,18 = 18 %). */
export const SchemaParametres = z
  .object({
    taux_plateforme: taux,
    tva_plateforme: taux,
    taux_commission: taux,
    tva_commission: taux,
    base_commission: z.enum(["apres_plateforme", "brut"]),
    menage_mode: z.enum(["refacture_voyageur", "a_charge_proprietaire", "inconnu"]),
    menage_plateforme_preleve: z.boolean(),
    menage_part_revenu: taux.nullable(),
    methode_scenarios: z.enum(["fourchette", "percentiles"]),
    arrondi_mensuel: z.union([z.literal(1), z.literal(10), z.literal(100)]),
    devise: z.string().regex(/^[A-Z]{3}$/),
    cta_texte: texte(60).min(3),
    whatsapp: texte(30).refine((v) => v === "" || numeroWhatsapp(v) !== "", "Numéro WhatsApp invalide (ex. +212 6 12 34 56 78)."),
    message_whatsapp: texte(400),
    lien_rdv: texte(300).refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v), "Lien https attendu."),
    email_contact: texte(120).refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Adresse e-mail invalide."),
    telephone_contact: texte(30),
    services: z.array(texte(120)).max(8),
    mentions_legales: texte(1200),
    validite_jours: z.number().int().min(1).max(365),
    max_comparables: z.number().int().min(2).max(4),
    section_saisonnalite: z.boolean(),
    section_preuve: z.boolean(),
    qr_code: z.boolean(),
    fraicheur_recente_jours: z.number().int().min(1).max(3650),
    fraicheur_alerte_jours: z.number().int().min(2).max(3650),
    standing_obligatoire: z.boolean(),
    tolerance_capacite: z.number().int().min(0).max(10),
    ia_active: z.boolean(),
    ia_modele: z.string().regex(/^[a-z0-9][a-z0-9.-]{2,60}$/, "Identifiant de modèle invalide."),
  })
  .refine((p) => p.fraicheur_alerte_jours > p.fraicheur_recente_jours, { message: "Le seuil « à actualiser » doit dépasser le seuil « récente ».", path: ["fraicheur_alerte_jours"] });
export type FormulaireParametres = z.infer<typeof SchemaParametres>;
