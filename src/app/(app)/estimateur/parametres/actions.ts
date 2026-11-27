"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUtilisateur } from "@/lib/auth";
import { UUID } from "@/lib/estimation/acces";
import { SchemaParametres, type FormulaireParametres } from "@/lib/estimation/parametres";
import { createClient } from "@/lib/supabase/server";

type Retour = { erreur?: string };

async function admin() {
  const u = await getUtilisateur();
  return u?.actif && u.admin ? u : null;
}

export async function enregistrerParametres(p: FormulaireParametres): Promise<Retour> {
  const u = await admin();
  if (!u) return { erreur: "Seul un administrateur peut modifier les paramètres." };
  const r = SchemaParametres.safeParse(p);
  if (!r.success) return { erreur: `${r.error.issues[0]?.path.join(".")} : ${r.error.issues[0]?.message}` };
  const supabase = await createClient();
  const { data, error } = await supabase.from("estimateur_parametres").update({ ...r.data, updated_by: u.id, updated_at: new Date().toISOString() }).eq("id", true).select("id");
  if (error || !data?.length) return { erreur: "Les paramètres n'ont pas pu être enregistrés." };
  revalidatePath("/estimateur", "layout");
  return {};
}

const SchemaOffre = z
  .object({
    id: z.string().regex(UUID).nullable(),
    titre: z.string().trim().min(3).max(120),
    description: z.string().trim().max(600),
    duree_mois: z.number().int().min(1).max(24).nullable(),
    conditions: z.string().trim().max(600),
    debut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    actif: z.boolean(),
  })
  .refine((o) => !o.debut || !o.fin || o.fin >= o.debut, { message: "La fin doit suivre le début.", path: ["fin"] })
  .refine((o) => !o.actif || o.conditions.length > 0, { message: "Indiquez les conditions avant d'activer l'offre.", path: ["conditions"] });
export type Offre = z.infer<typeof SchemaOffre>;

export async function enregistrerOffre(o: Offre): Promise<Retour> {
  if (!(await admin())) return { erreur: "Réservé à un administrateur." };
  const r = SchemaOffre.safeParse(o);
  if (!r.success) return { erreur: r.error.issues[0]?.message ?? "Offre invalide." };
  const { id, ...champs } = r.data;
  const supabase = await createClient();
  const { error } = id ? await supabase.from("estimateur_offres").update(champs).eq("id", id) : await supabase.from("estimateur_offres").insert(champs);
  if (error) return { erreur: "L'offre n'a pas pu être enregistrée." };
  revalidatePath("/estimateur/parametres");
  return {};
}

const SchemaTemoignage = z.object({
  id: z.string().regex(UUID).nullable(),
  auteur: z.string().trim().min(2).max(80),
  contexte: z.string().trim().max(120),
  texte: z.string().trim().min(10).max(500),
  verifie: z.boolean(),
  actif: z.boolean(),
});
export type Temoignage = z.infer<typeof SchemaTemoignage>;

export async function enregistrerTemoignage(t: Temoignage): Promise<Retour> {
  if (!(await admin())) return { erreur: "Réservé à un administrateur." };
  const r = SchemaTemoignage.safeParse(t);
  if (!r.success) return { erreur: r.error.issues[0]?.message ?? "Témoignage invalide." };
  const { id, ...champs } = r.data;
  const supabase = await createClient();
  const { error } = id ? await supabase.from("estimateur_temoignages").update(champs).eq("id", id) : await supabase.from("estimateur_temoignages").insert(champs);
  if (error) return { erreur: "Le témoignage n'a pas pu être enregistré." };
  revalidatePath("/estimateur/parametres");
  return {};
}

export async function supprimerTemoignage(id: string): Promise<Retour> {
  if (!(await admin())) return { erreur: "Réservé à un administrateur." };
  if (!UUID.test(id)) return { erreur: "Témoignage introuvable." };
  const supabase = await createClient();
  await supabase.from("estimateur_temoignages").delete().eq("id", id);
  revalidatePath("/estimateur/parametres");
  return {};
}
