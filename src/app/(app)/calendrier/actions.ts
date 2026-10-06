"use server";

import { revalidatePath } from "next/cache";
import { getUtilisateur, peutModifier } from "@/lib/auth";
import { synchroniserLiens } from "@/lib/synchro-serveur";

export type ResumeSynchro = {
  erreur?: string;
  liensSynchronises?: number;
  liensEnErreur?: number;
  nouvelles?: number;
  modifiees?: number;
  annulees?: number;
  menagesCrees?: number;
  problemes?: { logement: string; erreur: string }[];
};

/** Bouton « Synchroniser maintenant » : même traitement que la tâche planifiée. */
export async function synchroniserMaintenant(): Promise<ResumeSynchro> {
  const u = await getUtilisateur();
  if (!u || !u.actif || u.type !== "equipe" || !peutModifier(u, "calendrier")) {
    return { erreur: "Vous n'avez pas le droit de lancer la synchronisation." };
  }
  try {
    const { liens, totaux } = await synchroniserLiens();
    revalidatePath("/calendrier");
    return {
      liensSynchronises: totaux.liensSynchronises,
      liensEnErreur: totaux.liensEnErreur,
      nouvelles: totaux.nouvelles,
      modifiees: totaux.modifiees,
      annulees: totaux.annulees,
      menagesCrees: totaux.menagesCrees,
      problemes: liens.filter((l) => !l.ok).map((l) => ({ logement: l.logement, erreur: l.erreur ?? "Erreur" })),
    };
  } catch {
    return { erreur: "La synchronisation n'a pas pu démarrer. Réessayez dans un instant." };
  }
}
