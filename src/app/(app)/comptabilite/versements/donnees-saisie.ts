import "server-only";
import { ajouterJours, aujourdhui, moisDe } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { lireLogementsCompta, lireTauxTva } from "../donnees";

/** Tout ce dont les formulaires de versement ont besoin : logements, réservations récentes, mois déjà facturés. */
export async function chargerSaisie() {
  const supabase = await createClient();
  const jour = aujourdhui();
  const [logements, tauxTva] = await Promise.all([lireLogementsCompta(), lireTauxTva()]);

  const { data: resas } = await supabase
    .from("comptabilite_reservations")
    .select("id, logement_id, arrivee, depart, plateforme, code")
    .eq("type", "reservation")
    .gte("depart", ajouterJours(jour, -150))
    .lte("arrivee", ajouterJours(jour, 45))
    .order("arrivee", { ascending: false });
  const ids = (resas ?? []).map((r) => r.id);
  const { data: lies } = ids.length ? await supabase.from("versements").select("reservation_id").in("reservation_id", ids) : { data: [] };
  const deja = new Map<string, number>();
  for (const v of lies ?? []) if (v.reservation_id) deja.set(v.reservation_id, (deja.get(v.reservation_id) ?? 0) + 1);

  const { data: factures } = await supabase.from("factures").select("logement_id, mois").eq("statut", "emise").gte("mois", ajouterJours(jour, -400));

  return {
    tauxTva,
    aujourdhui: jour,
    nomsLogements: Object.fromEntries(logements.map((l) => [l.id, l.nom])),
    logements: logements.filter((l) => l.statut !== "en_pause").map((l) => ({ id: l.id, nom: l.nom, frais_menage: l.frais_menage, taux_commission: l.taux_commission })),
    reservations: (resas ?? []).map((r) => ({ ...r, deja: deja.get(r.id) ?? 0 })),
    facturesEmises: (factures ?? []).filter((f) => f.logement_id).map((f) => `${f.logement_id}|${moisDe(f.mois)}`),
  };
}
