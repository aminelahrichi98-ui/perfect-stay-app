import "server-only";
import { etatsDuMois, tauxOccupation, type ReservationCalendrier } from "@/lib/calendrier";
import { aujourdhui, moisDe, moisPrecedent, moisSuivant, premierDuMois, type Mois } from "@/lib/dates";
import { sommeMad } from "@/lib/operations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type TauxReservation = { aujourdhui: { occupes: number; total: number }; mois: number; moisPrecedent: number };

/** Biens réservés cette nuit et taux d'occupation moyen du mois (logements actifs qui ont un calendrier relié). */
export async function lireTauxReservation(): Promise<TauxReservation> {
  const admin = createAdminClient();
  const auj = aujourdhui();
  const mois: Mois = moisDe(auj);
  const prec = moisPrecedent(mois);
  const [{ data: logements }, { data: liens }] = await Promise.all([
    admin.from("logements").select("id").eq("statut", "actif"),
    admin.from("logement_ical").select("logement_id"),
  ]);
  const avecCalendrier = new Set((liens ?? []).map((l) => l.logement_id));
  const ids = (logements ?? []).map((l) => l.id).filter((id) => avecCalendrier.has(id));
  if (!ids.length) return { aujourdhui: { occupes: 0, total: 0 }, mois: 0, moisPrecedent: 0 };
  const { data: resas } = await admin
    .from("reservations")
    .select("id, logement_id, type, arrivee, depart")
    .eq("statut", "confirmee")
    .in("logement_id", ids)
    .lt("arrivee", premierDuMois(moisSuivant(mois)))
    .gt("depart", premierDuMois(prec));
  const parLogement = (id: string): ReservationCalendrier[] =>
    (resas ?? []).filter((r) => r.logement_id === id).map((r) => ({ id: r.id, arrivee: r.arrivee, depart: r.depart, type: r.type as "reservation" | "blocage" }));
  const moyenne = (m: Mois) => ids.reduce((s, id) => s + tauxOccupation(etatsDuMois(m, parLogement(id))), 0) / ids.length;
  const occupes = ids.filter((id) => etatsDuMois(mois, parLogement(id)).find((e) => e.jour === auj)?.etat === "nuit").length;
  return { aujourdhui: { occupes, total: ids.length }, mois: moyenne(mois), moisPrecedent: moyenne(prec) };
}

/** Budget publicitaire dépensé ce mois et le mois précédent. */
export async function lireBudgetMarketing() {
  const supabase = await createClient();
  const mois = moisDe(aujourdhui());
  const prec = moisPrecedent(mois);
  const [{ data: a }, { data: b }] = await Promise.all([
    supabase.from("marketing_depenses").select("montant").gte("date_depense", premierDuMois(mois)).lt("date_depense", premierDuMois(moisSuivant(mois))),
    supabase.from("marketing_depenses").select("montant").gte("date_depense", premierDuMois(prec)).lt("date_depense", premierDuMois(mois)),
  ]);
  return { mois: sommeMad((a ?? []).map((x) => Number(x.montant))), precedent: sommeMad((b ?? []).map((x) => Number(x.montant))) };
}

export type TacheDuJour = { id: string; titre: string; type: string; echeance: string | null; priorite: string; statut: string; pole: string };

/** Tâches du jour et en retard (celles que l'utilisateur a le droit de voir). */
export async function lireTachesDuJour(): Promise<{ taches: TacheDuJour[]; retard: number }> {
  const supabase = await createClient();
  const auj = aujourdhui();
  const { data } = await supabase
    .from("taches")
    .select("id, titre, type, echeance, priorite, statut, pole")
    .not("statut", "in", "(termine,annule)")
    .lte("echeance", auj)
    .order("echeance")
    .limit(60);
  const liste = data ?? [];
  return { taches: liste.slice(0, 8), retard: liste.filter((t) => (t.echeance ?? "") < auj).length };
}
