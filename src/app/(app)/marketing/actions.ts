"use server";

import { revalidatePath } from "next/cache";
import { CANAUX, RESEAUX, STATUTS_PUBLICATION } from "@/lib/marketing";
import { createClient } from "@/lib/supabase/server";
import { gestionnaire, jourValide, nombre, UUID, type Etat } from "../operations/droits";

const rafraichir = () => revalidatePath("/marketing", "layout");

export async function enregistrerDepensePub(a: { id?: string; date: string; canal: string; campagne: string; montant: string; note: string }): Promise<Etat> {
  const u = await gestionnaire("marketing");
  if (!u) return { erreur: "Vous n'avez pas le droit de saisir des dépenses." };
  const montant = nombre(a.montant);
  if (!jourValide(a.date)) return { erreur: "Indiquez la date de la dépense." };
  if (!CANAUX.some((c) => c.value === a.canal)) return { erreur: "Choisissez le canal." };
  if (!Number.isFinite(montant) || montant <= 0) return { erreur: "Indiquez un montant supérieur à zéro (en MAD)." };
  if (a.id && !UUID.test(a.id)) return { erreur: "Dépense invalide." };
  const supabase = await createClient();
  const champs = { date_depense: a.date, canal: a.canal, campagne: a.campagne.trim().slice(0, 200), montant: Math.round(montant * 100) / 100, note: a.note.trim().slice(0, 500) };
  const { error } = a.id ? await supabase.from("marketing_depenses").update(champs).eq("id", a.id) : await supabase.from("marketing_depenses").insert({ ...champs, created_by: u.id });
  if (error) return { erreur: "La dépense n'a pas pu être enregistrée." };
  rafraichir();
  return { succes: "ok" };
}

export async function supprimerDepensePub(id: string): Promise<Etat> {
  if (!(await gestionnaire("marketing")) || !UUID.test(id)) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { error } = await supabase.from("marketing_depenses").delete().eq("id", id);
  if (error) return { erreur: "La dépense n'a pas pu être supprimée." };
  rafraichir();
  return { succes: "ok" };
}

export async function enregistrerPublication(a: { id?: string; date: string; reseau: string; sujet: string; statut: string; notes: string; responsable: string }): Promise<Etat> {
  const u = await gestionnaire("marketing");
  if (!u) return { erreur: "Vous n'avez pas le droit de modifier le calendrier." };
  const sujet = a.sujet.trim();
  if (!jourValide(a.date)) return { erreur: "Indiquez la date de publication." };
  if (!RESEAUX.some((r) => r.value === a.reseau)) return { erreur: "Choisissez le réseau." };
  if (!STATUTS_PUBLICATION.some((s) => s.value === a.statut)) return { erreur: "Choisissez le statut." };
  if (!sujet) return { erreur: "Indiquez le sujet de la publication." };
  if (a.responsable && !UUID.test(a.responsable)) return { erreur: "Responsable invalide." };
  if (a.id && !UUID.test(a.id)) return { erreur: "Publication invalide." };
  const supabase = await createClient();
  const champs = { date_publication: a.date, reseau: a.reseau, sujet: sujet.slice(0, 300), statut: a.statut, notes: a.notes.trim().slice(0, 2000), responsable_id: a.responsable || null };
  const { error } = a.id ? await supabase.from("marketing_publications").update(champs).eq("id", a.id) : await supabase.from("marketing_publications").insert({ ...champs, created_by: u.id });
  if (error) return { erreur: "La publication n'a pas pu être enregistrée." };
  rafraichir();
  return { succes: "ok" };
}

export async function changerStatutPublication(id: string, statut: string): Promise<Etat> {
  if (!(await gestionnaire("marketing")) || !UUID.test(id) || !STATUTS_PUBLICATION.some((s) => s.value === statut)) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("marketing_publications").update({ statut }).eq("id", id).select("id");
  if (error || !data?.length) return { erreur: "Le statut n'a pas pu être modifié." };
  rafraichir();
  return { succes: "ok" };
}

export async function supprimerPublication(id: string): Promise<Etat> {
  if (!(await gestionnaire("marketing")) || !UUID.test(id)) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { error } = await supabase.from("marketing_publications").delete().eq("id", id);
  if (error) return { erreur: "La publication n'a pas pu être supprimée." };
  rafraichir();
  return { succes: "ok" };
}
