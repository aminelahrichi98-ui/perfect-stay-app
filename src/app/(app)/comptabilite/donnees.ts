import "server-only";
import { moisPrecedent, moisSuivant, premierDuMois, type Mois } from "@/lib/dates";
import { TAUX_TVA_DEFAUT } from "@/lib/compta";
import { createClient } from "@/lib/supabase/server";
import { syntheseDuMois, type VersementBrut } from "@/lib/synthese";

export { CATEGORIES_DEPENSE, libelleCategorie } from "./categories";

export async function lireTauxTva(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.from("entreprise").select("taux_tva").eq("id", 1).maybeSingle();
  return Number(data?.taux_tva ?? TAUX_TVA_DEFAUT);
}

/** Logements visibles par la comptabilité (vue limitée : ni codes d'accès, ni wifi, ni notes). */
export async function lireLogementsCompta() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comptabilite_logements")
    .select("id, nom, ville, type, statut, frais_menage, taux_commission, proprietaire_nom, proprietaire_adresse, proprietaire_ice, a_calendrier")
    .order("nom");
  return (data ?? []).map((l) => ({
    ...l,
    frais_menage: Number(l.frais_menage),
    taux_commission: Number(l.taux_commission),
  }));
}

/** Synthèse du mois demandé et du mois précédent (pour les comparaisons). */
export async function chargerSynthese(mois: Mois) {
  const supabase = await createClient();
  const precedent = moisPrecedent(mois);
  const debut = premierDuMois(precedent);
  const fin = premierDuMois(moisSuivant(mois));

  const [logements, tauxTva, { data: versements }, { data: reservations }, { data: depenses }] = await Promise.all([
    lireLogementsCompta(),
    lireTauxTva(),
    supabase
      .from("versements")
      .select("id, logement_id, date_versement, montant_recu, frais_menage, taux_commission")
      .gte("date_versement", debut)
      .lt("date_versement", fin),
    supabase.from("comptabilite_reservations").select("id, logement_id, type, arrivee, depart").lt("arrivee", fin).gt("depart", debut),
    supabase.from("depenses").select("logement_id, categorie, montant, date_depense").gte("date_depense", debut).lt("date_depense", fin),
  ]);

  const brut: VersementBrut[] = (versements ?? []).map((v) => ({
    id: v.id,
    logement_id: v.logement_id,
    date_versement: v.date_versement,
    montant_recu: Number(v.montant_recu),
    frais_menage: Number(v.frais_menage),
    taux_commission: Number(v.taux_commission),
  }));
  const args = {
    tauxTva,
    logements: logements.filter((l) => l.statut !== "en_pause" || brut.some((v) => v.logement_id === l.id)).map((l) => ({ id: l.id, nom: l.nom, aUnCalendrier: l.a_calendrier })),
    versements: brut,
    reservations: (reservations ?? []).map((r) => ({ id: r.id, logement_id: r.logement_id, arrivee: r.arrivee, depart: r.depart, type: r.type as "reservation" | "blocage" })),
    depenses: (depenses ?? []).map((d) => ({ logement_id: d.logement_id, categorie: d.categorie, montant: Number(d.montant), date_depense: d.date_depense })),
  };
  return {
    tauxTva,
    actuel: syntheseDuMois({ ...args, mois }),
    precedent: syntheseDuMois({ ...args, mois: precedent }),
  };
}
