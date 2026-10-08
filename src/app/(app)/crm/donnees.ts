import "server-only";
import { aujourdhui, ajouterJours, moisDe, moisSuivant, premierDuMois } from "@/lib/dates";
import { tauxConversion } from "@/lib/crm";
import { lundiDe } from "@/lib/taches";
import { createClient } from "@/lib/supabase/server";

export type Indicateurs = {
  recusMois: number;
  recusSemaine: number;
  appelesSemaine: number;
  rdvMois: number;
  signesMois: number;
  conversion: number | null;
};

const distincts = (l: { lead_id: string }[] | null) => new Set((l ?? []).map((x) => x.lead_id)).size;

/** Chiffres du CRM : leads reçus, leads appelés cette semaine, rendez-vous et signatures du mois, taux de conversion. */
export async function lireIndicateurs(): Promise<Indicateurs> {
  const supabase = await createClient();
  const aujourd = aujourdhui();
  const debutMois = `${premierDuMois(moisDe(aujourd))}T00:00:00Z`;
  const finMois = `${premierDuMois(moisSuivant(moisDe(aujourd)))}T00:00:00Z`;
  const lundi = `${lundiDe(aujourd)}T00:00:00Z`;
  const [recusMois, recusSemaine, { data: appels }, { data: rdv }, { data: signes }] = await Promise.all([
    supabase.from("crm_leads").select("id", { count: "exact", head: true }).gte("created_at", debutMois).lt("created_at", finMois),
    supabase.from("crm_leads").select("id", { count: "exact", head: true }).gte("created_at", lundi),
    supabase.from("crm_appels").select("lead_id").gte("date_appel", lundi),
    supabase.from("crm_etapes").select("lead_id").eq("etape", "rdv").gte("date_etape", debutMois).lt("date_etape", finMois),
    supabase.from("crm_etapes").select("lead_id").eq("etape", "signe").gte("date_etape", debutMois).lt("date_etape", finMois),
  ]);
  const nbSignes = distincts(signes);
  return {
    recusMois: recusMois.count ?? 0,
    recusSemaine: recusSemaine.count ?? 0,
    appelesSemaine: distincts(appels),
    rdvMois: distincts(rdv),
    signesMois: nbSignes,
    conversion: tauxConversion(nbSignes, recusMois.count ?? 0),
  };
}

export type LeadListe = {
  id: string;
  nom: string;
  telephone: string;
  ville: string;
  type_bien: string;
  source: string;
  etape: string;
  responsable_id: string | null;
  created_at: string;
  dernierAppel: string | null;
};

export async function lireLeads(filtres: { responsable: string; source: string }, moiId: string): Promise<LeadListe[]> {
  const supabase = await createClient();
  let q = supabase
    .from("crm_leads")
    .select("id, nom, telephone, ville, type_bien, source, etape, responsable_id, created_at")
    .or(`etape.not.in.(signe,perdu),updated_at.gte.${ajouterJours(aujourdhui(), -60)}T00:00:00Z`)
    .order("created_at", { ascending: false })
    .limit(600);
  if (filtres.source) q = q.eq("source", filtres.source);
  if (filtres.responsable === "moi") q = q.eq("responsable_id", moiId);
  else if (filtres.responsable === "aucun") q = q.is("responsable_id", null);
  else if (filtres.responsable) q = q.eq("responsable_id", filtres.responsable);
  const { data } = await q;
  const ids = (data ?? []).map((l) => l.id);
  const { data: appels } = ids.length ? await supabase.from("crm_appels").select("lead_id, date_appel").in("lead_id", ids).order("date_appel", { ascending: false }) : { data: [] };
  const dernier = new Map<string, string>();
  for (const a of appels ?? []) if (!dernier.has(a.lead_id)) dernier.set(a.lead_id, a.date_appel);
  return (data ?? []).map((l) => ({ ...l, dernierAppel: dernier.get(l.id) ?? null }));
}
