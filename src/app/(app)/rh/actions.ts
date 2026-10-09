"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ETAPES_CANDIDAT, STATUTS_POSTE, TYPES_CONTRAT, CATEGORIES_MEMBRE } from "@/lib/rh";
import { nomSur, supprimer, urlEnvoiSigne, urlsLecture } from "@/lib/stockage";
import { createClient } from "@/lib/supabase/server";
import { gestionnaire, jourValide, UUID, type Etat } from "../operations/droits";

const BUCKET_RH = "rh";
const TAILLE_MAX = 15 * 1024 * 1024;
const rafraichir = () => revalidatePath("/rh", "layout");

export type MembreSaisi = { id?: string; nom: string; role: string; categorie: string; contrat: string; telephone: string; email: string; arrivee: string; depart: string; notes: string };

export async function enregistrerMembre(m: MembreSaisi): Promise<Etat & { id?: string }> {
  if (!(await gestionnaire("rh"))) return { erreur: "Vous n'avez pas le droit de modifier les fiches RH." };
  const nom = m.nom.trim();
  if (!nom) return { erreur: "Indiquez le nom." };
  if (!TYPES_CONTRAT.some((c) => c.value === m.contrat)) return { erreur: "Choisissez le type de contrat." };
  if (!CATEGORIES_MEMBRE.some((c) => c.value === m.categorie)) return { erreur: "Choisissez équipe ou prestataire." };
  if (m.arrivee && !jourValide(m.arrivee)) return { erreur: "Date d'arrivée invalide." };
  if (m.depart && !jourValide(m.depart)) return { erreur: "Date de départ invalide." };
  if (m.arrivee && m.depart && m.depart < m.arrivee) return { erreur: "Le départ ne peut pas précéder l'arrivée." };
  if (m.id && !UUID.test(m.id)) return { erreur: "Fiche invalide." };
  const supabase = await createClient();
  const champs = {
    nom: nom.slice(0, 160),
    role: m.role.trim().slice(0, 160),
    categorie: m.categorie,
    type_contrat: m.contrat,
    telephone: m.telephone.trim().slice(0, 40),
    email: m.email.trim().slice(0, 200),
    date_arrivee: m.arrivee || null,
    date_depart: m.depart || null,
    notes: m.notes.trim().slice(0, 4000),
  };
  if (m.id) {
    const { error } = await supabase.from("rh_membres").update(champs).eq("id", m.id);
    if (error) return { erreur: "La fiche n'a pas pu être enregistrée." };
    rafraichir();
    return { succes: "ok", id: m.id };
  }
  const { data, error } = await supabase.from("rh_membres").insert(champs).select("id").single();
  if (error || !data) return { erreur: "La fiche n'a pas pu être créée." };
  rafraichir();
  return { succes: "ok", id: data.id };
}

export async function supprimerMembre(id: string): Promise<Etat> {
  if (!(await gestionnaire("rh")) || !UUID.test(id)) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { data: docs } = await supabase.from("rh_documents").select("chemin").eq("membre_id", id);
  const { error } = await supabase.from("rh_membres").delete().eq("id", id);
  if (error) return { erreur: "La fiche n'a pas pu être supprimée." };
  await supprimer(BUCKET_RH, (docs ?? []).map((d) => d.chemin));
  rafraichir();
  redirect("/rh?supprime=1");
}

export type PreparationRh = { erreur: string } | { chemin: string; token: string; bucket: string };

export async function preparerDocumentRh(args: { membreId: string; nomFichier: string; taille: number }): Promise<PreparationRh> {
  if (!(await gestionnaire("rh")) || !UUID.test(args.membreId)) return { erreur: "Action non autorisée." };
  if (args.taille > TAILLE_MAX) return { erreur: "Fichier trop lourd (maximum 15 Mo)." };
  try {
    const { chemin, token } = await urlEnvoiSigne(BUCKET_RH, `${args.membreId}/${crypto.randomUUID()}-${nomSur(args.nomFichier)}`);
    return { chemin, token, bucket: BUCKET_RH };
  } catch {
    return { erreur: "L'envoi n'a pas pu être préparé. Réessayez." };
  }
}

export async function enregistrerDocumentRh(args: { membreId: string; chemin: string; nom: string; type: string; taille: number }): Promise<Etat> {
  const u = await gestionnaire("rh");
  if (!u || !UUID.test(args.membreId) || !args.chemin.startsWith(`${args.membreId}/`) || args.chemin.includes("..")) return { erreur: "Fichier invalide." };
  const supabase = await createClient();
  const { error } = await supabase.from("rh_documents").insert({ membre_id: args.membreId, chemin: args.chemin, nom: args.nom.slice(0, 200), type_mime: args.type.slice(0, 100), taille: Math.max(0, Math.round(args.taille)), created_by: u.id });
  if (error) {
    await supprimer(BUCKET_RH, [args.chemin]);
    return { erreur: "Le document n'a pas pu être enregistré." };
  }
  rafraichir();
  return { succes: "ok" };
}

export async function supprimerDocumentRh(id: string): Promise<Etat> {
  if (!(await gestionnaire("rh")) || !UUID.test(id)) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { data: d } = await supabase.from("rh_documents").select("chemin").eq("id", id).maybeSingle();
  if (!d) return { erreur: "Ce document n'existe plus." };
  const { error } = await supabase.from("rh_documents").delete().eq("id", id);
  if (error) return { erreur: "Le document n'a pas pu être supprimé." };
  await supprimer(BUCKET_RH, [d.chemin]);
  rafraichir();
  return { succes: "ok" };
}

export async function ouvrirDocumentRh(id: string): Promise<{ url?: string; erreur?: string }> {
  if (!UUID.test(id)) return { erreur: "Demande invalide." };
  const supabase = await createClient();
  // La base ne renvoie la ligne qu'à ceux qui ont le droit RH
  const { data } = await supabase.from("rh_documents").select("chemin").eq("id", id).maybeSingle();
  if (!data) return { erreur: "Document introuvable." };
  const url = (await urlsLecture(BUCKET_RH, [data.chemin], 120)).get(data.chemin);
  return url ? { url } : { erreur: "Le document n'a pas pu être ouvert." };
}

/* ------------------------------ Recrutements ------------------------------ */

export async function enregistrerPoste(a: { id?: string; poste: string; statut: string; notes: string }): Promise<Etat> {
  if (!(await gestionnaire("rh"))) return { erreur: "Action non autorisée." };
  const poste = a.poste.trim();
  if (!poste) return { erreur: "Indiquez l'intitulé du poste." };
  if (!STATUTS_POSTE.some((s) => s.value === a.statut)) return { erreur: "Statut invalide." };
  if (a.id && !UUID.test(a.id)) return { erreur: "Poste invalide." };
  const supabase = await createClient();
  const champs = { poste: poste.slice(0, 160), statut: a.statut, notes: a.notes.trim().slice(0, 2000) };
  const { error } = a.id ? await supabase.from("rh_recrutements").update(champs).eq("id", a.id) : await supabase.from("rh_recrutements").insert(champs);
  if (error) return { erreur: "Le poste n'a pas pu être enregistré." };
  rafraichir();
  return { succes: "ok" };
}

export async function supprimerPoste(id: string): Promise<Etat> {
  if (!(await gestionnaire("rh")) || !UUID.test(id)) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { error } = await supabase.from("rh_recrutements").delete().eq("id", id);
  if (error) return { erreur: "Le poste n'a pas pu être supprimé." };
  rafraichir();
  return { succes: "ok" };
}

export async function enregistrerCandidat(a: { id?: string; recrutementId: string; nom: string; telephone: string; email: string; etape: string; notes: string }): Promise<Etat> {
  if (!(await gestionnaire("rh"))) return { erreur: "Action non autorisée." };
  const nom = a.nom.trim();
  if (!nom) return { erreur: "Indiquez le nom du candidat." };
  if (!UUID.test(a.recrutementId) || (a.id && !UUID.test(a.id))) return { erreur: "Demande invalide." };
  if (!ETAPES_CANDIDAT.some((e) => e.value === a.etape)) return { erreur: "Étape invalide." };
  const supabase = await createClient();
  const champs = { nom: nom.slice(0, 160), telephone: a.telephone.trim().slice(0, 40), email: a.email.trim().slice(0, 200), etape: a.etape, notes: a.notes.trim().slice(0, 2000) };
  const { error } = a.id ? await supabase.from("rh_candidats").update(champs).eq("id", a.id) : await supabase.from("rh_candidats").insert({ ...champs, recrutement_id: a.recrutementId });
  if (error) return { erreur: "Le candidat n'a pas pu être enregistré." };
  rafraichir();
  return { succes: "ok" };
}

export async function changerEtapeCandidat(id: string, etape: string): Promise<Etat> {
  if (!(await gestionnaire("rh")) || !UUID.test(id) || !ETAPES_CANDIDAT.some((e) => e.value === etape)) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("rh_candidats").update({ etape }).eq("id", id).select("id");
  if (error || !data?.length) return { erreur: "L'étape n'a pas pu être modifiée." };
  rafraichir();
  return { succes: "ok" };
}

export async function supprimerCandidat(id: string): Promise<Etat> {
  if (!(await gestionnaire("rh")) || !UUID.test(id)) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { error } = await supabase.from("rh_candidats").delete().eq("id", id);
  if (error) return { erreur: "Le candidat n'a pas pu être supprimé." };
  rafraichir();
  return { succes: "ok" };
}
