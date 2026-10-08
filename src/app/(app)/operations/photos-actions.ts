"use server";

import { revalidatePath } from "next/cache";
import { TAILLE_MAX_PHOTO } from "@/lib/logements";
import { BUCKET_OPERATIONS, fabriquerPhotoTamponnee } from "@/lib/operations-serveur";
import { createClient } from "@/lib/supabase/server";
import { nomSur, supprimer, telecharger, urlEnvoiSigne } from "@/lib/stockage";
import { gestionnaire, UUID, utilisateurActif, type Etat } from "./droits";

export type PreparationOps = { erreur: string } | { chemin: string; token: string; bucket: string };

/** Qui peut ajouter une photo à cette check-list ou à cet incident ? La base décide pour les check-lists (prestataire de la tâche compris). */
async function peutAjouter(cible: "checklist" | "incident", id: string) {
  const u = await utilisateurActif();
  if (!u) return false;
  if (cible === "incident") return Boolean(await gestionnaire("maintenance"));
  const supabase = await createClient();
  const { data } = await supabase.rpc("peut_checklist", { p_checklist: id, p_niveau: "modifier" });
  return data === true;
}

export async function preparerPhotoOps(args: { cible: "checklist" | "incident"; id: string; nomFichier: string; taille: number }): Promise<PreparationOps> {
  if (!UUID.test(args.id) || !(await peutAjouter(args.cible, args.id))) return { erreur: "Vous n'avez pas le droit d'ajouter des photos ici." };
  if (args.taille > TAILLE_MAX_PHOTO) return { erreur: "Photo trop lourde (maximum 20 Mo)." };
  try {
    const { chemin, token } = await urlEnvoiSigne(BUCKET_OPERATIONS, `${args.cible}/${args.id}/origine-${crypto.randomUUID()}-${nomSur(args.nomFichier)}`);
    return { chemin, token, bucket: BUCKET_OPERATIONS };
  } catch {
    return { erreur: "L'envoi n'a pas pu être préparé. Réessayez." };
  }
}

export async function enregistrerPhotoOps(args: { cible: "checklist" | "incident"; id: string; chemin: string; pointId?: string | null; legende?: string }): Promise<Etat> {
  if (!UUID.test(args.id) || !(await peutAjouter(args.cible, args.id))) return { erreur: "Action non autorisée." };
  if (!args.chemin.startsWith(`${args.cible}/${args.id}/`) || args.chemin.includes("..")) return { erreur: "Fichier invalide." };
  if (args.pointId && !UUID.test(args.pointId)) return { erreur: "Point invalide." };
  const u = await utilisateurActif();
  const supabase = await createClient();
  const maintenant = new Date();
  let principal = "";
  let vignette = "";
  try {
    const original = await telecharger(BUCKET_OPERATIONS, args.chemin);
    ({ chemin: principal, cheminVignette: vignette } = await fabriquerPhotoTamponnee(original, `${args.cible}/${args.id}`, maintenant));
    await supprimer(BUCKET_OPERATIONS, [args.chemin]);
  } catch {
    await supprimer(BUCKET_OPERATIONS, [args.chemin]);
    return { erreur: "Ce fichier n'est pas une photo lisible. Essayez un JPEG ou un PNG." };
  }
  const ligne =
    args.cible === "checklist"
      ? supabase.from("checklist_photos").insert({ checklist_id: args.id, point_id: args.pointId ?? null, chemin: principal, chemin_vignette: vignette, pris_par: u?.id })
      : supabase.from("incident_photos").insert({ incident_id: args.id, chemin: principal, chemin_vignette: vignette, legende: (args.legende ?? "").slice(0, 200), pris_par: u?.id });
  const { error } = await ligne;
  if (error) {
    await supprimer(BUCKET_OPERATIONS, [principal, vignette]);
    return { erreur: "La photo n'a pas pu être enregistrée." };
  }
  revalidatePath("/operations", "layout");
  return { succes: "ok" };
}

export async function supprimerPhotoOps(cible: "checklist" | "incident", photoId: string): Promise<Etat> {
  if (!UUID.test(photoId) || !(await utilisateurActif())) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const table = cible === "checklist" ? "checklist_photos" : "incident_photos";
  const { data } = await supabase.from(table).select("chemin, chemin_vignette").eq("id", photoId).maybeSingle();
  if (!data) return { erreur: "Cette photo n'existe plus." };
  const { data: supprimees, error } = await supabase.from(table).delete().eq("id", photoId).select("id");
  if (error || !supprimees?.length) return { erreur: "Vous ne pouvez pas supprimer cette photo." };
  await supprimer(BUCKET_OPERATIONS, [data.chemin, data.chemin_vignette]);
  revalidatePath("/operations", "layout");
  return { succes: "ok" };
}
