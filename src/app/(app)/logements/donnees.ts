import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Comptes Propriétaire disponibles pour être rattachés à un logement. */
export async function proprietairesDisponibles() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, prenom, nom, actif").eq("type", "proprietaire").order("prenom");
  return (data ?? []).map((p) => ({ id: p.id, label: `${p.prenom} ${p.nom}`.trim() + (p.actif ? "" : " (désactivé)") }));
}
