"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { jourValide, gestionnaire, texte, utilisateurActif, UUID, type Etat } from "../droits";
import { pointsManquants } from "@/lib/operations";
import { createClient } from "@/lib/supabase/server";

const rafraichir = () => revalidatePath("/operations", "layout");

export async function creerMenage(_: Etat, formData: FormData): Promise<Etat> {
  const u = await gestionnaire("menage");
  if (!u) return { erreur: "Vous n'avez pas le droit de créer un ménage." };
  const logementId = texte(formData, "logement");
  const date = texte(formData, "date");
  const responsable = texte(formData, "responsable");
  if (!UUID.test(logementId)) return { erreur: "Choisissez le logement." };
  if (!jourValide(date)) return { erreur: "Indiquez la date du ménage." };
  if (responsable && !UUID.test(responsable)) return { erreur: "Responsable invalide." };

  const supabase = await createClient();
  const { data: logement } = await supabase.from("operations_logements").select("nom").eq("id", logementId).maybeSingle();
  if (!logement) return { erreur: "Ce logement est introuvable." };
  const { data, error } = await supabase
    .from("taches")
    .insert({
      titre: `Ménage — ${logement.nom}`,
      type: "menage",
      pole: "Opérations",
      logement_id: logementId,
      echeance: date,
      responsable_id: responsable || null,
      notes: texte(formData, "notes"),
    })
    .select("id")
    .single();
  if (error || !data) return { erreur: "Le ménage n'a pas pu être créé. Réessayez." };
  rafraichir();
  redirect(`/operations/menage/${data.id}?cree=1`);
}

const STATUTS_AVANCEMENT = ["a_faire", "en_cours", "bloque", "termine"] as const;

/** Avancement d'un ménage. Pour le terminer, la check-list doit être complète (points cochés, photos demandées prises). */
export async function changerStatutMenage(id: string, statut: string): Promise<Etat> {
  if (!UUID.test(id) || !(STATUTS_AVANCEMENT as readonly string[]).includes(statut)) return { erreur: "Demande invalide." };
  if (!(await utilisateurActif())) return { erreur: "Action non autorisée." };
  const supabase = await createClient();

  if (statut === "termine") {
    const { data: liste } = await supabase.from("checklists").select("id").eq("tache_id", id).order("created_at").limit(1);
    const checklistId = liste?.[0]?.id;
    if (checklistId) {
      const [{ data: points }, { data: photos }] = await Promise.all([
        supabase.from("checklist_points").select("id, fait, photo_requise").eq("checklist_id", checklistId),
        supabase.from("checklist_photos").select("point_id").eq("checklist_id", checklistId),
      ]);
      const m = pointsManquants(points ?? [], new Set((photos ?? []).map((p) => p.point_id).filter((x): x is string => Boolean(x))));
      if (m.nonCoches) return { erreur: `Il reste ${m.nonCoches} point${m.nonCoches > 1 ? "s" : ""} à cocher dans la check-list.` };
      if (m.photosManquantes) return { erreur: `Il manque ${m.photosManquantes} photo${m.photosManquantes > 1 ? "s" : ""} demandée${m.photosManquantes > 1 ? "s" : ""} dans la check-list.` };
      await supabase.from("checklists").update({ statut: "terminee", termine_le: new Date().toISOString() }).eq("id", checklistId);
    }
  }
  const { data, error } = await supabase.from("taches").update({ statut }).eq("id", id).select("id");
  if (error || !data?.length) return { erreur: "Ce ménage n'a pas pu être mis à jour." };
  rafraichir();
  return { succes: "ok" };
}

/** Contrôle qualité d'un ménage terminé : validé, ou renvoyé au prestataire avec une remarque. */
export async function controlerMenage(id: string, decision: "valide" | "a_refaire", note: string): Promise<Etat> {
  const u = await gestionnaire("menage");
  if (!u) return { erreur: "Seule l'équipe peut contrôler un ménage." };
  if (!UUID.test(id)) return { erreur: "Demande invalide." };
  const remarque = note.trim().slice(0, 500);
  if (decision === "a_refaire" && !remarque) return { erreur: "Dites au prestataire ce qui est à refaire." };
  const supabase = await createClient();
  const champs =
    decision === "valide"
      ? { controle: "valide", controle_par: u.id, controle_le: new Date().toISOString(), controle_note: remarque }
      : { statut: "a_faire", controle: "a_refaire", controle_par: u.id, controle_le: new Date().toISOString(), controle_note: remarque };
  const { data, error } = await supabase.from("taches").update(champs).eq("id", id).eq("type", "menage").select("id");
  if (error || !data?.length) return { erreur: "Le contrôle n'a pas pu être enregistré." };
  if (decision === "a_refaire") await supabase.from("checklists").update({ statut: "en_cours", termine_le: null }).eq("tache_id", id);
  rafraichir();
  return { succes: "ok" };
}

export async function assignerMenage(id: string, responsableId: string): Promise<Etat> {
  if (!(await gestionnaire("menage"))) return { erreur: "Action non autorisée." };
  if (!UUID.test(id) || (responsableId && !UUID.test(responsableId))) return { erreur: "Demande invalide." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("taches").update({ responsable_id: responsableId || null }).eq("id", id).eq("type", "menage").select("id");
  if (error || !data?.length) return { erreur: "L'attribution n'a pas pu être enregistrée." };
  rafraichir();
  return { succes: "ok" };
}

export async function annulerMenage(id: string): Promise<Etat> {
  if (!(await gestionnaire("menage"))) return { erreur: "Action non autorisée." };
  if (!UUID.test(id)) return { erreur: "Demande invalide." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("taches").update({ statut: "annule" }).eq("id", id).eq("type", "menage").select("id");
  if (error || !data?.length) return { erreur: "Le ménage n'a pas pu être annulé." };
  rafraichir();
  return { succes: "ok" };
}
