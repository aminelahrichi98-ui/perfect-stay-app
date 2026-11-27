import { exigerAcces } from "@/lib/auth";
import { UUID } from "@/lib/estimation/acces";
import type { Snapshot } from "@/lib/estimation/snapshot";
import { aujourdhui } from "@/lib/dates";
import { chargerParametres } from "@/lib/marche/serveur";
import { createClient } from "@/lib/supabase/server";
import { lireResponsables } from "../../operations/donnees";
import { Parcours } from "./parcours";

export const metadata = { title: "Nouvelle estimation" };

type Recherche = { lead?: string; bien?: string; brouillon?: string; version?: string; dupliquer?: string };

export default async function PageNouvelleEstimation({ searchParams }: { searchParams: Promise<Recherche> }) {
  await exigerAcces("estimateur", "modifier");
  const sp = await searchParams;
  const supabase = await createClient();
  const jourJ = aujourdhui();
  const [params, { data: offres }, { data: temoignages }, equipe] = await Promise.all([
    chargerParametres(supabase),
    supabase.from("estimateur_offres").select("id, titre, description, duree_mois, conditions, debut, fin").eq("actif", true),
    supabase.from("estimateur_temoignages").select("id, auteur, contexte, texte").eq("verifie", true).eq("actif", true),
    lireResponsables(),
  ]);

  // Reprise : brouillon à compléter, nouvelle version ou copie d'une estimation existante
  let reprise: { saisie: Snapshot["saisie"]; existanteId: string | null; racineId: string | null; titre: string } | null = null;
  const source = sp.brouillon ?? sp.version ?? sp.dupliquer;
  if (source && UUID.test(source)) {
    const { data: e } = await supabase.from("estimations").select("id, statut, snapshot, numero_version, modele_document").eq("id", source).maybeSingle();
    const snap = e?.snapshot as Snapshot | null;
    if (e && e.modele_document === "v2" && snap?.saisie) {
      if (sp.brouillon && ["brouillon", "a_valider"].includes(e.statut)) reprise = { saisie: snap.saisie, existanteId: e.id, racineId: null, titre: "Brouillon à compléter" };
      else if (sp.version) reprise = { saisie: { ...snap.saisie, dureeCreationS: null }, existanteId: null, racineId: e.id, titre: `Nouvelle version (à partir de la version ${e.numero_version})` };
      else if (sp.dupliquer) reprise = { saisie: { ...snap.saisie, dureeCreationS: null }, existanteId: null, racineId: null, titre: "Copie d'une estimation" };
    }
  }

  return (
    <Parcours
      params={params}
      offres={(offres ?? []).filter((o) => (!o.debut || o.debut <= jourJ) && (!o.fin || o.fin >= jourJ)).map((o) => ({ id: o.id, titre: o.titre, description: o.description, dureeMois: o.duree_mois, conditions: o.conditions }))}
      temoignages={temoignages ?? []}
      commerciaux={equipe.filter((r) => !r.prestataire)}
      leadInitial={sp.lead && UUID.test(sp.lead) ? sp.lead : null}
      bienInitial={sp.bien && UUID.test(sp.bien) ? sp.bien : null}
      reprise={reprise}
      sourceDuplication={sp.dupliquer && UUID.test(sp.dupliquer) ? sp.dupliquer : null}
    />
  );
}
