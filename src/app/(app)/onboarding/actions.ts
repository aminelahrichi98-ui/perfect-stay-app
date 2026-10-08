"use server";

import { revalidatePath } from "next/cache";
import { gestionnaire, UUID, type Etat } from "../operations/droits";
import { ETAPES_ONBOARDING } from "@/lib/operations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { etapesRestantes } from "./donnees";

/** Coche ou décoche une étape. Quand tout est fait, le logement passe en « Actif ». */
export async function basculerEtape(logementId: string, cle: string, fait: boolean): Promise<Etat & { active?: boolean }> {
  if (!(await gestionnaire("onboarding"))) return { erreur: "Vous n'avez pas le droit de modifier l'onboarding." };
  if (!UUID.test(logementId) || !ETAPES_ONBOARDING.some((e) => e.cle === cle)) return { erreur: "Demande invalide." };
  const supabase = await createClient();
  const { data: logement } = await supabase.from("operations_logements").select("id, statut").eq("id", logementId).maybeSingle();
  if (!logement) return { erreur: "Ce logement est introuvable." };

  // Ligne créée décochée, puis mise à jour : la base pose elle-même la date et l'auteur
  const { error: e1 } = await supabase.from("onboarding_etapes").upsert({ logement_id: logementId, cle, fait: false }, { onConflict: "logement_id,cle", ignoreDuplicates: true });
  if (e1) return { erreur: "L'étape n'a pas pu être enregistrée." };
  const { error: e2 } = await supabase.from("onboarding_etapes").update({ fait }).eq("logement_id", logementId).eq("cle", cle);
  if (e2) return { erreur: "L'étape n'a pas pu être enregistrée." };

  let active = false;
  if (fait && logement.statut === "onboarding" && (await etapesRestantes(logementId)).length === 0) {
    const { error } = await createAdminClient().from("logements").update({ statut: "actif" }).eq("id", logementId).eq("statut", "onboarding");
    active = !error;
  }
  revalidatePath("/onboarding", "layout");
  revalidatePath("/logements");
  return { succes: "ok", active };
}
