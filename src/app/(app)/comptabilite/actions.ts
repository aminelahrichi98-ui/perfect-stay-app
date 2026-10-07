"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUtilisateur, peutModifier, type Utilisateur } from "@/lib/auth";
import { aujourdhui, moisDe, moisValide, premierDuMois, type Mois } from "@/lib/dates";
import { emettreFacture, genererDocumentsDuMois, genererRapport, regenererPdfFacture, BUCKET_RAPPORTS } from "@/lib/documents-serveur";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { nomSur, supprimer, urlEnvoiSigne, urlsLecture } from "@/lib/stockage";
import { CATEGORIES_DEPENSE } from "./donnees";

export type EtatCompta = { erreur?: string; succes?: string } | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const JOUR = /^\d{4}-\d{2}-\d{2}$/;
const BUCKET_JUSTIFICATIFS = "justificatifs";
const TAILLE_MAX_JUSTIFICATIF = 15 * 1024 * 1024;

async function comptable(): Promise<Utilisateur | null> {
  const u = await getUtilisateur();
  if (!u || !u.actif || u.type !== "equipe" || !peutModifier(u, "comptabilite")) return null;
  return u;
}

const nombre = (v: FormDataEntryValue | null | string) => {
  const n = Number(String(v ?? "").trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};
const texte = (f: FormData, n: string) => String(f.get(n) ?? "").trim();
const jourValide = (j: string) => JOUR.test(j) && !Number.isNaN(Date.parse(`${j}T00:00:00Z`));

/** Une facture a-t-elle déjà été émise pour ce logement et ce mois ? (elle ne contiendrait pas le changement) */
async function factureDejaEmise(logementId: string, date: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("factures")
    .select("numero")
    .eq("logement_id", logementId)
    .eq("mois", premierDuMois(moisDe(date)))
    .eq("statut", "emise")
    .maybeSingle();
  return data?.numero as string | undefined;
}

/* ---------------------------------- Versements ---------------------------------- */

export async function creerVersement(_: EtatCompta, formData: FormData): Promise<EtatCompta> {
  const u = await comptable();
  if (!u) return { erreur: "Vous n'avez pas le droit de saisir des versements." };

  const logementId = texte(formData, "logement_id");
  const reservationId = texte(formData, "reservation_id");
  const date = texte(formData, "date_versement");
  const montant = nombre(formData.get("montant_recu"));
  const note = texte(formData, "note").slice(0, 300);

  if (!UUID.test(logementId)) return { erreur: "Choisissez le logement concerné." };
  if (!jourValide(date)) return { erreur: "Indiquez la date du versement." };
  if (!(montant > 0)) return { erreur: "Saisissez le montant reçu (un nombre positif, en MAD)." };

  const supabase = await createClient();
  const { data: logement } = await supabase.from("comptabilite_logements").select("id, nom, frais_menage, taux_commission").eq("id", logementId).maybeSingle();
  if (!logement) return { erreur: "Ce logement n'existe pas ou vous n'y avez pas accès." };
  const menage = Number(logement.frais_menage);
  if (montant < menage) {
    return { erreur: `Le montant reçu (${montant} MAD) est inférieur aux frais de ménage de ce logement (${menage} MAD). Vérifiez le montant saisi.` };
  }

  let reservation: string | null = null;
  if (reservationId) {
    if (!UUID.test(reservationId)) return { erreur: "La réservation choisie n'est pas valide." };
    const { data: r } = await supabase.from("comptabilite_reservations").select("id").eq("id", reservationId).eq("logement_id", logementId).maybeSingle();
    if (!r) return { erreur: "Cette réservation n'appartient pas à ce logement." };
    reservation = r.id;
  }

  const { error } = await supabase.from("versements").insert({
    logement_id: logementId,
    reservation_id: reservation,
    date_versement: date,
    montant_recu: montant,
    frais_menage: menage,
    taux_commission: Number(logement.taux_commission),
    note,
    created_by: u.id,
  });
  if (error) return { erreur: "Le versement n'a pas pu être enregistré. Réessayez dans un instant." };

  const facture = await factureDejaEmise(logementId, date);
  revalidatePath("/comptabilite", "layout");
  redirect(`/comptabilite/versements?mois=${moisDe(date)}&cree=1${facture ? `&facture=${facture}` : ""}`);
}

export async function modifierVersement(id: string, _: EtatCompta, formData: FormData): Promise<EtatCompta> {
  const u = await comptable();
  if (!u) return { erreur: "Vous n'avez pas le droit de modifier des versements." };

  const date = texte(formData, "date_versement");
  const montant = nombre(formData.get("montant_recu"));
  const note = texte(formData, "note").slice(0, 300);
  const actualiser = formData.has("actualiser");
  if (!jourValide(date)) return { erreur: "Indiquez la date du versement." };
  if (!(montant > 0)) return { erreur: "Saisissez le montant reçu (un nombre positif, en MAD)." };

  const supabase = await createClient();
  const { data: actuel } = await supabase.from("versements").select("logement_id, frais_menage, taux_commission").eq("id", id).maybeSingle();
  if (!actuel) return { erreur: "Ce versement n'existe plus." };

  let menage = Number(actuel.frais_menage);
  let taux = Number(actuel.taux_commission);
  if (actualiser) {
    const { data: l } = await supabase.from("comptabilite_logements").select("frais_menage, taux_commission").eq("id", actuel.logement_id).maybeSingle();
    if (l) {
      menage = Number(l.frais_menage);
      taux = Number(l.taux_commission);
    }
  }
  if (montant < menage) return { erreur: `Le montant reçu est inférieur aux frais de ménage (${menage} MAD).` };

  const { data, error } = await supabase
    .from("versements")
    .update({ date_versement: date, montant_recu: montant, frais_menage: menage, taux_commission: taux, note })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { erreur: "Les modifications n'ont pas pu être enregistrées. Vérifiez vos droits et réessayez." };

  const facture = await factureDejaEmise(actuel.logement_id, date);
  revalidatePath("/comptabilite", "layout");
  redirect(`/comptabilite/versements?mois=${moisDe(date)}&modifie=1${facture ? `&facture=${facture}` : ""}`);
}

export async function supprimerVersement(id: string): Promise<EtatCompta> {
  const u = await getUtilisateur();
  if (!u?.admin) return { erreur: "Seul un administrateur peut supprimer un versement." };
  const supabase = await createClient();
  const { data: v } = await supabase.from("versements").select("date_versement, logement_id").eq("id", id).maybeSingle();
  const { data, error } = await supabase.from("versements").delete().eq("id", id).select("id");
  if (error || !data?.length) return { erreur: "Le versement n'a pas pu être supprimé." };
  revalidatePath("/comptabilite", "layout");
  redirect(`/comptabilite/versements?mois=${v ? moisDe(v.date_versement) : moisDe(aujourdhui())}&supprime=1`);
}

/* ---------------------------------- Dépenses ---------------------------------- */

export type PreparationJustificatif = { erreur: string } | { chemin: string; token: string; bucket: string };

export async function preparerJustificatif(args: { nomFichier: string; taille: number }): Promise<PreparationJustificatif> {
  if (!(await comptable())) return { erreur: "Vous n'avez pas le droit d'ajouter des justificatifs." };
  if (args.taille > TAILLE_MAX_JUSTIFICATIF) return { erreur: "Fichier trop lourd (maximum 15 Mo)." };
  try {
    const { chemin, token } = await urlEnvoiSigne(BUCKET_JUSTIFICATIFS, `${crypto.randomUUID()}-${nomSur(args.nomFichier)}`);
    return { chemin, token, bucket: BUCKET_JUSTIFICATIFS };
  } catch {
    return { erreur: "L'envoi n'a pas pu être préparé. Réessayez." };
  }
}

export async function enregistrerDepense(args: {
  id?: string;
  date: string;
  logementId: string;
  categorie: string;
  description: string;
  montant: string;
  justificatif?: { chemin: string; nom: string } | null;
  retirerJustificatif?: boolean;
}): Promise<EtatCompta & { mois?: string }> {
  const u = await comptable();
  if (!u) return { erreur: "Vous n'avez pas le droit de saisir des dépenses." };

  const montant = nombre(args.montant);
  if (!jourValide(args.date)) return { erreur: "Indiquez la date de la dépense." };
  if (!CATEGORIES_DEPENSE.some((c) => c.value === args.categorie)) return { erreur: "Choisissez une catégorie." };
  if (!(montant > 0)) return { erreur: "Saisissez le montant de la dépense (un nombre positif, en MAD)." };
  if (args.logementId && !UUID.test(args.logementId)) return { erreur: "Le logement choisi n'est pas valide." };
  if (args.justificatif && (args.justificatif.chemin.includes("..") || args.justificatif.chemin.includes("/"))) return { erreur: "Justificatif invalide." };

  const supabase = await createClient();
  const champs = {
    date_depense: args.date,
    logement_id: args.logementId || null,
    categorie: args.categorie,
    description: args.description.trim().slice(0, 300),
    montant,
  };

  if (args.id) {
    const { data: ancienne } = await supabase.from("depenses").select("justificatif").eq("id", args.id).maybeSingle();
    if (!ancienne) return { erreur: "Cette dépense n'existe plus." };
    const maj: Record<string, unknown> = { ...champs };
    if (args.justificatif) {
      maj.justificatif = args.justificatif.chemin;
      maj.justificatif_nom = args.justificatif.nom.slice(0, 200);
    } else if (args.retirerJustificatif) {
      maj.justificatif = null;
      maj.justificatif_nom = null;
    }
    const { data, error } = await supabase.from("depenses").update(maj).eq("id", args.id).select("id");
    if (error || !data?.length) {
      if (args.justificatif) await supprimer(BUCKET_JUSTIFICATIFS, [args.justificatif.chemin]);
      return { erreur: "Les modifications n'ont pas pu être enregistrées." };
    }
    if (ancienne.justificatif && (args.justificatif || args.retirerJustificatif)) await supprimer(BUCKET_JUSTIFICATIFS, [ancienne.justificatif]);
  } else {
    const { error } = await supabase.from("depenses").insert({
      ...champs,
      justificatif: args.justificatif?.chemin ?? null,
      justificatif_nom: args.justificatif?.nom.slice(0, 200) ?? null,
      created_by: u.id,
    });
    if (error) {
      if (args.justificatif) await supprimer(BUCKET_JUSTIFICATIFS, [args.justificatif.chemin]);
      return { erreur: "La dépense n'a pas pu être enregistrée. Réessayez dans un instant." };
    }
  }
  revalidatePath("/comptabilite", "layout");
  return { succes: "ok", mois: moisDe(args.date) };
}

export async function supprimerDepense(id: string): Promise<EtatCompta & { mois?: string }> {
  if (!(await comptable())) return { erreur: "Vous n'avez pas le droit de supprimer des dépenses." };
  const supabase = await createClient();
  const { data: d } = await supabase.from("depenses").select("justificatif, date_depense").eq("id", id).maybeSingle();
  const { data, error } = await supabase.from("depenses").delete().eq("id", id).select("id");
  if (error || !data?.length) return { erreur: "La dépense n'a pas pu être supprimée." };
  if (d?.justificatif) await supprimer(BUCKET_JUSTIFICATIFS, [d.justificatif]);
  revalidatePath("/comptabilite", "layout");
  return { succes: "ok", mois: d ? moisDe(d.date_depense) : undefined };
}

export async function ouvrirJustificatif(id: string): Promise<{ url?: string; erreur?: string }> {
  const u = await getUtilisateur();
  if (!u || !u.actif || u.type !== "equipe") return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { data } = await supabase.from("depenses").select("justificatif").eq("id", id).maybeSingle();
  if (!data?.justificatif) return { erreur: "Justificatif introuvable ou accès refusé." };
  const urls = await urlsLecture(BUCKET_JUSTIFICATIFS, [data.justificatif], 120);
  const url = urls.get(data.justificatif);
  return url ? { url } : { erreur: "Le justificatif n'a pas pu être ouvert." };
}

/* ---------------------------------- Rapports et factures ---------------------------------- */

const moisOu = (m: string): Mois | null => (moisValide(m) ? m : null);

export type ResultatDocuments = { erreur?: string; message?: string };

export async function genererMois(mois: string): Promise<ResultatDocuments> {
  const u = await comptable();
  if (!u) return { erreur: "Vous n'avez pas le droit de générer les documents." };
  const m = moisOu(mois);
  if (!m) return { erreur: "Mois invalide." };
  try {
    const b = await genererDocumentsDuMois(m, u.id);
    revalidatePath("/comptabilite/documents");
    const morceaux = [
      `${b.rapports} rapport${b.rapports > 1 ? "s" : ""} généré${b.rapports > 1 ? "s" : ""}`,
      `${b.facturesEmises} facture${b.facturesEmises > 1 ? "s" : ""} émise${b.facturesEmises > 1 ? "s" : ""}`,
    ];
    if (b.facturesDejaEmises) morceaux.push(`${b.facturesDejaEmises} déjà émise${b.facturesDejaEmises > 1 ? "s" : ""}`);
    if (b.erreurs.length) return { erreur: `${morceaux.join(", ")}. Problèmes : ${b.erreurs.map((e) => `${e.logement} (${e.erreur})`).join(" ; ")}` };
    return { message: `${morceaux.join(", ")}.` };
  } catch {
    return { erreur: "La génération n'a pas pu aboutir. Réessayez dans un instant." };
  }
}

export async function genererRapportLogement(logementId: string, mois: string): Promise<ResultatDocuments> {
  if (!(await comptable())) return { erreur: "Action non autorisée." };
  const m = moisOu(mois);
  if (!m || !UUID.test(logementId)) return { erreur: "Demande invalide." };
  try {
    const r = await genererRapport(logementId, m);
    revalidatePath("/comptabilite/documents");
    return { message: r.version > 1 ? "Rapport régénéré avec les données actuelles." : "Rapport généré." };
  } catch {
    return { erreur: "Le rapport n'a pas pu être généré." };
  }
}

export async function emettreFactureLogement(logementId: string, mois: string): Promise<ResultatDocuments> {
  const u = await comptable();
  if (!u) return { erreur: "Action non autorisée." };
  const m = moisOu(mois);
  if (!m || !UUID.test(logementId)) return { erreur: "Demande invalide." };
  try {
    const f = await emettreFacture(logementId, m, u.id);
    revalidatePath("/comptabilite/documents");
    if (f.etat === "aucune") return { erreur: f.raison };
    if (f.etat === "deja") return { message: `La facture ${f.numero} existe déjà pour ce mois.` };
    return f.pdf ? { message: `Facture ${f.numero} émise.` } : { message: `Facture ${f.numero} émise, mais son PDF n'a pas pu être créé : utilisez « Régénérer le PDF ».` };
  } catch {
    return { erreur: "La facture n'a pas pu être émise." };
  }
}

export async function regenererPdf(factureId: string): Promise<ResultatDocuments> {
  if (!(await comptable())) return { erreur: "Action non autorisée." };
  if (!UUID.test(factureId)) return { erreur: "Demande invalide." };
  try {
    await regenererPdfFacture(factureId);
    revalidatePath("/comptabilite/documents");
    return { message: "PDF régénéré. Le contenu et le numéro de la facture n'ont pas changé." };
  } catch {
    return { erreur: "Le PDF n'a pas pu être régénéré." };
  }
}

/**
 * Adresse temporaire (2 minutes) d'une facture ou d'un rapport. La base décide si l'utilisateur a le droit
 * de voir le document (la comptabilité, ou le propriétaire du logement concerné).
 */
export async function urlDocument(type: "facture" | "rapport", id: string): Promise<{ url?: string; erreur?: string }> {
  const u = await getUtilisateur();
  if (!u || !u.actif) return { erreur: "Action non autorisée." };
  if (!UUID.test(id)) return { erreur: "Demande invalide." };
  const supabase = await createClient();
  const { data } = await supabase.from(type === "facture" ? "factures" : "rapports_mensuels").select("chemin_pdf").eq("id", id).maybeSingle();
  if (!data?.chemin_pdf) return { erreur: "Document introuvable ou pas encore disponible." };
  const { data: signee } = await createAdminClient().storage.from(BUCKET_RAPPORTS).createSignedUrl(data.chemin_pdf, 120);
  return signee?.signedUrl ? { url: signee.signedUrl } : { erreur: "Le document n'a pas pu être ouvert." };
}
