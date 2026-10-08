"use server";

import { revalidatePath } from "next/cache";
import { POLES } from "@/lib/modules";
import { createClient } from "@/lib/supabase/server";
import { gestionnaire, jourValide, UUID, type Etat } from "../operations/droits";

export async function enregistrerNoteStrategie(a: { id?: string; type: string; titre: string; date: string; contenu: string; pole: string }): Promise<Etat> {
  const u = await gestionnaire("strategie");
  if (!u) return { erreur: "Vous n'avez pas le droit de modifier la stratégie." };
  const titre = a.titre.trim();
  if (!titre) return { erreur: "Donnez un titre." };
  if (a.type !== "decision" && a.type !== "note") return { erreur: "Type invalide." };
  if (!jourValide(a.date)) return { erreur: "Indiquez la date." };
  if (a.pole && !(POLES as readonly string[]).includes(a.pole)) return { erreur: "Pôle invalide." };
  if (a.id && !UUID.test(a.id)) return { erreur: "Note invalide." };
  const supabase = await createClient();
  const champs = { type: a.type, titre: titre.slice(0, 200), date_note: a.date, contenu: a.contenu.trim().slice(0, 8000), pole: a.pole };
  const { error } = a.id ? await supabase.from("strategie_notes").update(champs).eq("id", a.id) : await supabase.from("strategie_notes").insert({ ...champs, auteur_id: u.id });
  if (error) return { erreur: "La note n'a pas pu être enregistrée." };
  revalidatePath("/strategie");
  return { succes: "ok" };
}

export async function supprimerNoteStrategie(id: string): Promise<Etat> {
  if (!(await gestionnaire("strategie")) || !UUID.test(id)) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { error } = await supabase.from("strategie_notes").delete().eq("id", id);
  if (error) return { erreur: "La note n'a pas pu être supprimée." };
  revalidatePath("/strategie");
  return { succes: "ok" };
}
