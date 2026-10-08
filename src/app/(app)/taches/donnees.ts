import "server-only";
import { ajouterJours, aujourdhui } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type Filtres = { pole: string; responsable: string; logement: string };

export type TacheListe = {
  id: string;
  titre: string;
  type: string;
  pole: string;
  priorite: string;
  statut: string;
  echeance: string | null;
  responsable_id: string | null;
  logement_id: string | null;
  recurrence_id: string | null;
  sousFaites: number;
  sousTotal: number;
  nbPieces: number;
};

/** Tâches ouvertes + celles terminées depuis moins de trois semaines, selon les filtres choisis. */
export async function lireTachesFiltrees(filtres: Filtres, moiId: string): Promise<TacheListe[]> {
  const supabase = await createClient();
  let q = supabase
    .from("taches")
    .select("id, titre, type, pole, priorite, statut, echeance, responsable_id, logement_id, recurrence_id, tache_sous_taches(fait), tache_pieces(id)")
    .neq("statut", "annule")
    .or(`statut.neq.termine,updated_at.gte.${ajouterJours(aujourdhui(), -21)}T00:00:00Z`)
    .limit(800);
  if (filtres.pole) q = q.eq("pole", filtres.pole);
  if (filtres.logement) q = q.eq("logement_id", filtres.logement);
  if (filtres.responsable === "moi") q = q.eq("responsable_id", moiId);
  else if (filtres.responsable === "aucun") q = q.is("responsable_id", null);
  else if (filtres.responsable) q = q.eq("responsable_id", filtres.responsable);
  const { data } = await q;
  return (data ?? []).map((t) => ({
    id: t.id,
    titre: t.titre,
    type: t.type,
    pole: t.pole,
    priorite: t.priorite,
    statut: t.statut,
    echeance: t.echeance,
    responsable_id: t.responsable_id,
    logement_id: t.logement_id,
    recurrence_id: t.recurrence_id,
    sousFaites: (t.tache_sous_taches ?? []).filter((s) => s.fait).length,
    sousTotal: (t.tache_sous_taches ?? []).length,
    nbPieces: (t.tache_pieces ?? []).length,
  }));
}
