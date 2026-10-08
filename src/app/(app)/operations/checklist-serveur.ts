import "server-only";
import { gestionnaire, utilisateurActif, UUID } from "./droits";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Copie = { checklistId: string } | { erreur: string };

/** Copie un modèle dans une nouvelle check-list (l'historique ne change plus si le modèle est modifié ensuite). */
export async function copierModele(modeleId: string, args: { logementId: string | null; tacheId: string | null; par: string }): Promise<Copie> {
  const admin = createAdminClient();
  const [{ data: modele }, { data: points }] = await Promise.all([
    admin.from("checklist_modeles").select("id, nom, actif").eq("id", modeleId).maybeSingle(),
    admin.from("checklist_modele_points").select("libelle, photo_requise, ordre").eq("modele_id", modeleId).order("ordre"),
  ]);
  if (!modele || !modele.actif) return { erreur: "Ce modèle de check-list n'existe pas ou est désactivé." };
  if (!points?.length) return { erreur: "Ce modèle ne contient aucun point." };
  const { data: cl, error } = await admin
    .from("checklists")
    .insert({ modele_id: modele.id, nom: modele.nom, logement_id: args.logementId, tache_id: args.tacheId, created_by: args.par })
    .select("id")
    .single();
  if (error || !cl) return { erreur: "La check-list n'a pas pu être créée." };
  const { error: e2 } = await admin
    .from("checklist_points")
    .insert(points.map((p, i) => ({ checklist_id: cl.id, ordre: i + 1, libelle: p.libelle, photo_requise: p.photo_requise })));
  if (e2) {
    await admin.from("checklists").delete().eq("id", cl.id);
    return { erreur: "La check-list n'a pas pu être créée." };
  }
  return { checklistId: cl.id };
}

/** Check-list d'un ménage : créée à la première ouverture, depuis le premier modèle « Ménage » actif. */
export async function checklistDuMenage(tacheId: string): Promise<{ id: string } | { erreur: string }> {
  const u = await utilisateurActif();
  if (!u || !UUID.test(tacheId)) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { data: tache } = await supabase.from("taches").select("id, logement_id, responsable_id, type").eq("id", tacheId).eq("type", "menage").maybeSingle();
  if (!tache) return { erreur: "Ce ménage est introuvable." };
  const autorise = tache.responsable_id === u.id || Boolean(await gestionnaire("menage"));
  if (!autorise) return { erreur: "Vous ne pouvez pas démarrer cette check-list." };

  const { data: existante } = await supabase.from("checklists").select("id").eq("tache_id", tacheId).order("created_at").limit(1);
  if (existante?.[0]) return { id: existante[0].id };

  const admin = createAdminClient();
  const { data: modele } = await admin.from("checklist_modeles").select("id").eq("type", "menage").eq("actif", true).order("created_at").limit(1).maybeSingle();
  if (!modele) return { erreur: "Aucun modèle de check-list « Ménage » n'est actif. Créez-en un dans Opérations > Check-lists." };
  const r = await copierModele(modele.id, { logementId: tache.logement_id, tacheId, par: u.id });
  if ("erreur" in r) return r;
  return { id: r.checklistId };
}

