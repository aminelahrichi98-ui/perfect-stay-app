"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { gestionnaire, texte, utilisateurActif, UUID, type Etat } from "../droits";
import { copierModele } from "../checklist-serveur";
import { TYPES_MODELE } from "@/lib/operations";
import { createClient } from "@/lib/supabase/server";

const rafraichir = () => revalidatePath("/operations", "layout");

/** Lance une check-list libre (contrôle qualité, check-in…) pour un logement. */
export async function lancerChecklist(_: Etat, formData: FormData): Promise<Etat> {
  const u = await gestionnaire("checklists");
  if (!u) return { erreur: "Vous n'avez pas le droit de lancer une check-list." };
  const modele = texte(formData, "modele");
  const logement = texte(formData, "logement");
  if (!UUID.test(modele)) return { erreur: "Choisissez un modèle." };
  if (!UUID.test(logement)) return { erreur: "Choisissez le logement." };
  const supabase = await createClient();
  const { data: visible } = await supabase.from("operations_logements").select("id").eq("id", logement).maybeSingle();
  if (!visible) return { erreur: "Ce logement est introuvable." };
  const r = await copierModele(modele, { logementId: logement, tacheId: null, par: u.id });
  if ("erreur" in r) return { erreur: r.erreur };
  rafraichir();
  redirect(`/operations/check-lists/${r.checklistId}`);
}

export async function cocherPoint(pointId: string, fait: boolean): Promise<Etat> {
  if (!UUID.test(pointId) || !(await utilisateurActif())) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("checklist_points").update({ fait }).eq("id", pointId).select("id");
  if (error || !data?.length) return { erreur: "Ce point n'a pas pu être mis à jour." };
  return { succes: "ok" };
}

export async function noterPoint(pointId: string, note: string): Promise<Etat> {
  if (!UUID.test(pointId) || !(await utilisateurActif())) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("checklist_points").update({ note: note.trim().slice(0, 500) }).eq("id", pointId).select("id");
  if (error || !data?.length) return { erreur: "La note n'a pas pu être enregistrée." };
  return { succes: "ok" };
}

/** Termine une check-list libre (celle d'un ménage se termine avec le ménage). */
export async function terminerChecklist(id: string): Promise<Etat> {
  const u = await utilisateurActif();
  if (!u || !UUID.test(id)) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const [{ data: points }, { data: photos }] = await Promise.all([
    supabase.from("checklist_points").select("id, fait, photo_requise").eq("checklist_id", id),
    supabase.from("checklist_photos").select("point_id").eq("checklist_id", id),
  ]);
  const avecPhoto = new Set((photos ?? []).map((p) => p.point_id));
  const nonCoches = (points ?? []).filter((p) => !p.fait).length;
  const sansPhoto = (points ?? []).filter((p) => p.photo_requise && !avecPhoto.has(p.id)).length;
  if (nonCoches) return { erreur: `Il reste ${nonCoches} point${nonCoches > 1 ? "s" : ""} à cocher.` };
  if (sansPhoto) return { erreur: `Il manque ${sansPhoto} photo${sansPhoto > 1 ? "s" : ""} demandée${sansPhoto > 1 ? "s" : ""}.` };
  const { data, error } = await supabase.from("checklists").update({ statut: "terminee", termine_le: new Date().toISOString(), termine_par: u.id }).eq("id", id).select("id");
  if (error || !data?.length) return { erreur: "La check-list n'a pas pu être terminée." };
  rafraichir();
  return { succes: "ok" };
}

/* ------------------------------ Modèles ------------------------------ */

export type ModeleSaisi = { id?: string; nom: string; type: string; actif: boolean; points: { libelle: string; photo_requise: boolean }[] };

export async function enregistrerModele(m: ModeleSaisi): Promise<Etat & { id?: string }> {
  if (!(await gestionnaire("checklists"))) return { erreur: "Vous n'avez pas le droit de modifier les modèles." };
  const nom = m.nom.trim();
  if (!nom) return { erreur: "Donnez un nom au modèle." };
  if (!TYPES_MODELE.some((t) => t.value === m.type)) return { erreur: "Type de modèle invalide." };
  const points = m.points.map((p) => ({ libelle: p.libelle.trim(), photo_requise: p.photo_requise })).filter((p) => p.libelle);
  if (!points.length) return { erreur: "Ajoutez au moins un point à vérifier." };
  if (m.id && !UUID.test(m.id)) return { erreur: "Modèle invalide." };

  const supabase = await createClient();
  let id = m.id;
  if (id) {
    const { error } = await supabase.from("checklist_modeles").update({ nom, type: m.type, actif: m.actif }).eq("id", id);
    if (error) return { erreur: "Le modèle n'a pas pu être enregistré." };
    await supabase.from("checklist_modele_points").delete().eq("modele_id", id);
  } else {
    const { data, error } = await supabase.from("checklist_modeles").insert({ nom, type: m.type, actif: m.actif }).select("id").single();
    if (error || !data) return { erreur: "Le modèle n'a pas pu être créé." };
    id = data.id;
  }
  const { error } = await supabase.from("checklist_modele_points").insert(points.map((p, i) => ({ modele_id: id, ordre: i + 1, ...p })));
  if (error) return { erreur: "Les points du modèle n'ont pas pu être enregistrés." };
  rafraichir();
  return { succes: "Modèle enregistré.", id };
}

export async function supprimerModele(id: string): Promise<Etat> {
  if (!(await gestionnaire("checklists"))) return { erreur: "Action non autorisée." };
  if (!UUID.test(id)) return { erreur: "Demande invalide." };
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_modeles").delete().eq("id", id);
  if (error) return { erreur: "Le modèle n'a pas pu être supprimé." };
  rafraichir();
  return { succes: "ok" };
}
