import "server-only";
import { REGLAGES_DEPART, totaliser, type Reglages, type Totaux } from "@/lib/creative";
import { urlsLecture } from "@/lib/stockage";
import { createClient } from "@/lib/supabase/server";

export const BUCKET_CREATIVES = "creatives";

export type Angle = {
  id: string;
  code: string;
  nom: string;
  segment: string;
  problemePrincipal: string;
  problemesSecondaires: string[];
  consequences: string;
  hook: string;
  usp: string;
  solution: string;
  cta: string;
  statut: string;
  nbCreatives: number;
};

export type Creative = {
  id: string;
  code: string;
  angleId: string;
  angleCode: string;
  angleNom: string;
  segment: string;
  statutAngle: string;
  type: string;
  version: number;
  hook: string;
  prompt: string;
  imageChemin: string;
  imageUrl: string | null;
  statut: string;
  metaAdId: string | null;
  notes: string;
  creeLe: string;
};

export type Performance = Totaux & { metaAdId: string; nom: string; debut: string; fin: string; devise: string };

/** La base n'a pas encore reçu le script 0014 : les écrans affichent alors la marche à suivre. */
export class ScriptManquant extends Error {}
const tableAbsente = (e: { code?: string; message?: string } | null) => Boolean(e && (e.code === "42P01" || e.code === "PGRST205" || /ci_[a-z]+/.test(e.message ?? "") && /not find|does not exist/i.test(e.message ?? "")));
function verifier(e: { code?: string; message?: string } | null) {
  if (!e) return;
  if (tableAbsente(e)) throw new ScriptManquant();
  throw new Error("Les données n'ont pas pu être lues.");
}

export async function chargerAngles(): Promise<Angle[]> {
  const supabase = await createClient();
  const [{ data, error }, { data: creatives, error: e2 }] = await Promise.all([
    supabase.from("ci_angles").select("id, code, nom, segment, probleme_principal, problemes_secondaires, consequences, hook, usp, solution, cta, statut").order("code"),
    supabase.from("ci_creatives").select("angle_id"),
  ]);
  verifier(error);
  verifier(e2);
  const nb = new Map<string, number>();
  for (const c of creatives ?? []) nb.set(c.angle_id, (nb.get(c.angle_id) ?? 0) + 1);
  return (data ?? []).map((a) => ({
    id: a.id,
    code: a.code,
    nom: a.nom,
    segment: a.segment,
    problemePrincipal: a.probleme_principal,
    problemesSecondaires: a.problemes_secondaires ?? [],
    consequences: a.consequences,
    hook: a.hook,
    usp: a.usp,
    solution: a.solution,
    cta: a.cta,
    statut: a.statut,
    nbCreatives: nb.get(a.id) ?? 0,
  }));
}

/** Images publicitaires avec une adresse temporaire d'affichage (le stockage est privé). */
export async function chargerCreatives(options: { angleId?: string; avecImages?: boolean } = {}): Promise<Creative[]> {
  const supabase = await createClient();
  let requete = supabase
    .from("ci_creatives")
    .select("id, code, angle_id, type_image, version, hook, prompt, image_chemin, statut, meta_ad_id, notes, created_at, ci_angles (code, nom, segment, statut)")
    .order("created_at", { ascending: false });
  if (options.angleId) requete = requete.eq("angle_id", options.angleId);
  const { data, error } = await requete;
  verifier(error);
  const lignes = data ?? [];
  const urls = options.avecImages === false ? new Map<string, string>() : await urlsLecture(BUCKET_CREATIVES, lignes.map((c) => c.image_chemin).filter(Boolean));
  return lignes.map((c) => {
    const angle = (Array.isArray(c.ci_angles) ? c.ci_angles[0] : c.ci_angles) as { code: string; nom: string; segment: string; statut: string } | null;
    return {
      id: c.id,
      code: c.code,
      angleId: c.angle_id,
      angleCode: angle?.code ?? "",
      angleNom: angle?.nom ?? "",
      segment: angle?.segment ?? "tous",
      statutAngle: angle?.statut ?? "",
      type: c.type_image,
      version: c.version,
      hook: c.hook,
      prompt: c.prompt,
      imageChemin: c.image_chemin,
      imageUrl: urls.get(c.image_chemin) ?? null,
      statut: c.statut,
      metaAdId: c.meta_ad_id,
      notes: c.notes,
      creeLe: c.created_at,
    };
  });
}

/** Performances dont la période est entièrement comprise entre `du` et `au` (bornes facultatives). */
export async function chargerPerformances(du?: string, au?: string): Promise<{ lignes: Performance[]; horsPeriode: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("ci_performances").select("meta_ad_id, nom_annonce, date_debut, date_fin, depenses, impressions, clics, leads, devise").order("date_debut");
  verifier(error);
  const toutes = (data ?? []).map((p) => ({ metaAdId: p.meta_ad_id, nom: p.nom_annonce, debut: p.date_debut, fin: p.date_fin, depenses: Number(p.depenses), impressions: p.impressions, clics: p.clics, leads: p.leads, devise: p.devise }));
  const dedans = (p: Performance) => (!du || p.debut >= du) && (!au || p.fin <= au);
  const touche = (p: Performance) => (!du || p.fin >= du) && (!au || p.debut <= au);
  return { lignes: toutes.filter(dedans), horsPeriode: toutes.filter((p) => touche(p) && !dedans(p)).length };
}

export async function chargerReglages(): Promise<Reglages> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("ci_reglages").select("devise, budget_mensuel, cpl_cible, cpl_confirme, impressions_min, leads_min, ctr_min, tolerance").maybeSingle();
  verifier(error);
  if (!data) return REGLAGES_DEPART;
  return {
    devise: data.devise,
    budgetMensuel: Number(data.budget_mensuel),
    cplCible: Number(data.cpl_cible),
    cplConfirme: data.cpl_confirme,
    impressionsMin: data.impressions_min,
    leadsMin: data.leads_min,
    ctrMin: Number(data.ctr_min),
    tolerance: Number(data.tolerance),
  };
}

/** Totaux par identifiant Meta : la seule clé qui relie une performance à une image. */
export function totauxParAnnonce(lignes: Performance[]): Map<string, Totaux & { nom: string; debut: string; fin: string }> {
  const groupes = new Map<string, Performance[]>();
  for (const l of lignes) groupes.set(l.metaAdId, [...(groupes.get(l.metaAdId) ?? []), l]);
  const resultat = new Map<string, Totaux & { nom: string; debut: string; fin: string }>();
  for (const [id, g] of groupes) {
    resultat.set(id, { ...totaliser(g), nom: g[g.length - 1].nom, debut: g.reduce((m, x) => (x.debut < m ? x.debut : m), g[0].debut), fin: g.reduce((m, x) => (x.fin > m ? x.fin : m), g[0].fin) });
  }
  return resultat;
}
