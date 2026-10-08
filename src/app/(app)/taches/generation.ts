import "server-only";
import { ajouterJours, aujourdhui, type Jour } from "@/lib/dates";
import { occurrences, type Regle } from "@/lib/recurrence";
import { createAdminClient } from "@/lib/supabase/admin";

export const HORIZON_JOURS = 14;

/**
 * Crée les tâches des règles de récurrence jusqu'à 14 jours à l'avance.
 * Sans danger si elle est lancée plusieurs fois : une règle ne crée jamais deux tâches à la même date.
 */
export async function genererRecurrences(aujourd: Jour = aujourdhui()) {
  const admin = createAdminClient();
  const { data: regles } = await admin.from("tache_recurrences").select("*").eq("actif", true);
  let creees = 0;
  for (const r of regles ?? []) {
    const depuis = r.derniere_echeance && r.derniere_echeance >= aujourd ? ajouterJours(r.derniere_echeance, 1) : aujourd;
    const jusqua = ajouterJours(aujourd, HORIZON_JOURS);
    const dates = occurrences(r as Regle, depuis, jusqua);
    if (!dates.length) continue;
    const { data, error } = await admin
      .from("taches")
      .upsert(
        dates.map((echeance) => ({
          titre: r.titre,
          type: "tache",
          pole: r.pole,
          priorite: r.priorite,
          echeance,
          responsable_id: r.responsable_id,
          logement_id: r.logement_id,
          notes: r.notes,
          recurrence_id: r.id,
          cree_auto: true,
        })),
        { onConflict: "recurrence_id,echeance", ignoreDuplicates: true },
      )
      .select("id");
    if (error) continue;
    creees += data?.length ?? 0;
    await admin.from("tache_recurrences").update({ derniere_echeance: dates[dates.length - 1] }).eq("id", r.id);
  }
  return creees;
}
