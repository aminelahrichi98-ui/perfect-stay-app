import "server-only";
import { urlsOperations } from "@/lib/operations-serveur";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PhotoVue, PointVue } from "./checklist-vue";

/** Une check-list avec ses points et photos (adresses temporaires). La base ne renvoie que ce que l'utilisateur a le droit de voir. */
export async function lireChecklist(id: string) {
  const supabase = await createClient();
  const { data: cl } = await supabase
    .from("checklists")
    .select("id, nom, statut, logement_id, tache_id, termine_le, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!cl) return null;
  const [{ data: points }, { data: photos }] = await Promise.all([
    supabase.from("checklist_points").select("id, libelle, photo_requise, fait, fait_le, note, ordre").eq("checklist_id", id).order("ordre"),
    supabase.from("checklist_photos").select("id, point_id, chemin, chemin_vignette, pris_le").eq("checklist_id", id).order("pris_le"),
  ]);
  const urls = await urlsOperations((photos ?? []).flatMap((p) => [p.chemin, p.chemin_vignette]));
  const vue = (p: NonNullable<typeof photos>[number]): PhotoVue => ({ id: p.id, url: urls.get(p.chemin) ?? "", vignette: urls.get(p.chemin_vignette) ?? "", pris_le: p.pris_le });
  const pointsVue: PointVue[] = (points ?? []).map((p) => ({
    id: p.id,
    libelle: p.libelle,
    photo_requise: p.photo_requise,
    fait: p.fait,
    fait_le: p.fait_le,
    note: p.note,
    photos: (photos ?? []).filter((x) => x.point_id === p.id).map(vue),
  }));
  return { checklist: cl, points: pointsVue, photosGenerales: (photos ?? []).filter((x) => !x.point_id).map(vue) };
}

/** Membres de l'équipe et prestataires actifs, pour attribuer un ménage (liste réduite : ni e-mail ni droits). */
export async function lireResponsables() {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("id, prenom, nom, type")
    .in("type", ["equipe", "prestataire"])
    .eq("actif", true)
    .order("prenom");
  return (data ?? []).map((p) => ({ id: p.id, nom: `${p.prenom} ${p.nom}`.trim(), prestataire: p.type === "prestataire" }));
}

export async function lireLogementsOps() {
  const supabase = await createClient();
  const { data } = await supabase.from("operations_logements").select("id, nom, ville, adresse, maps_url, code_acces, statut").order("nom");
  return data ?? [];
}
