"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { codeCreative, META_AD_ID, SEGMENTS, sortDeLaLigne, STATUTS_ANGLE, STATUTS_CREATIVE, TYPES_IMAGE, type ErreurImport, type LigneMeta } from "@/lib/creative";
import { nomSur, supprimer, urlEnvoiSigne } from "@/lib/stockage";
import { createClient } from "@/lib/supabase/server";
import { gestionnaire, jourValide, nombre, UUID, type Etat } from "../../operations/droits";
import { BUCKET_CREATIVES } from "./donnees";

const rafraichir = () => revalidatePath("/marketing/creative", "layout");
const REFUS = "Vous n'avez pas le droit de modifier le marketing.";
const CHEMIN_IMAGE = /^[0-9a-f-]{36}-[A-Za-z0-9._-]{1,90}$/;
const TAILLE_MAX = 15 * 1024 * 1024;
const TYPES_FICHIER = ["image/png", "image/jpeg", "image/webp"];
const court = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/* ------------------------------- Angles ------------------------------- */

export type SaisieAngle = { id?: string; nom: string; segment: string; problemePrincipal: string; problemesSecondaires: string[]; consequences: string; hook: string; usp: string; solution: string; cta: string; statut: string };

export async function enregistrerAngle(a: SaisieAngle): Promise<Etat & { id?: string }> {
  const u = await gestionnaire("marketing");
  if (!u) return { erreur: REFUS };
  const nom = court(a.nom, 120);
  if (!nom) return { erreur: "Donnez un nom à l'angle." };
  if (!SEGMENTS.some((s) => s.value === a.segment)) return { erreur: "Choisissez le segment de propriétaire." };
  if (!STATUTS_ANGLE.some((s) => s.value === a.statut)) return { erreur: "Statut invalide." };
  if (a.id && !UUID.test(a.id)) return { erreur: "Angle invalide." };
  const champs = {
    nom,
    segment: a.segment,
    probleme_principal: court(a.problemePrincipal, 600),
    problemes_secondaires: (Array.isArray(a.problemesSecondaires) ? a.problemesSecondaires : []).map((p) => court(p, 300)).filter(Boolean).slice(0, 12),
    consequences: court(a.consequences, 800),
    hook: court(a.hook, 300),
    usp: court(a.usp, 600),
    solution: court(a.solution, 800),
    cta: court(a.cta, 120),
    statut: a.statut,
  };
  const supabase = await createClient();
  if (a.id) {
    const { error } = await supabase.from("ci_angles").update(champs).eq("id", a.id);
    if (error) return { erreur: "L'angle n'a pas pu être enregistré." };
    rafraichir();
    return { succes: "ok", id: a.id };
  }
  const { data, error } = await supabase.from("ci_angles").insert({ ...champs, created_by: u.id }).select("id").single();
  if (error || !data) return { erreur: "L'angle n'a pas pu être créé." };
  rafraichir();
  return { succes: "ok", id: data.id };
}

/** Un angle ne se supprime que s'il n'a aucune image : sinon on l'archive, pour garder l'historique. */
export async function supprimerAngle(id: string): Promise<Etat> {
  if (!(await gestionnaire("marketing")) || !UUID.test(id)) return { erreur: REFUS };
  const supabase = await createClient();
  const { count } = await supabase.from("ci_creatives").select("id", { count: "exact", head: true }).eq("angle_id", id);
  if (count) return { erreur: "Cet angle contient des images : passez-le en « Archived » plutôt que de le supprimer." };
  const { error } = await supabase.from("ci_angles").delete().eq("id", id);
  if (error) return { erreur: "L'angle n'a pas pu être supprimé." };
  rafraichir();
  return { succes: "ok" };
}

/* ------------------------------- Images ------------------------------- */

export async function preparerEnvoiImage(args: { nomFichier: string; taille: number; type: string }): Promise<{ erreur: string } | { chemin: string; token: string; bucket: string }> {
  if (!(await gestionnaire("marketing"))) return { erreur: REFUS };
  if (!TYPES_FICHIER.includes(args.type)) return { erreur: "Seules les images PNG, JPG ou WebP sont acceptées (pas de vidéo)." };
  if (args.taille > TAILLE_MAX) return { erreur: "Image trop lourde (maximum 15 Mo)." };
  try {
    const { chemin, token } = await urlEnvoiSigne(BUCKET_CREATIVES, `${randomUUID()}-${nomSur(args.nomFichier)}`);
    return { chemin, token, bucket: BUCKET_CREATIVES };
  } catch {
    return { erreur: "L'envoi n'a pas pu être préparé. Réessayez." };
  }
}

export type SaisieCreative = { id?: string; angleId: string; type: string; hook: string; prompt: string; statut: string; metaAdId: string; notes: string; imageChemin?: string };

export async function enregistrerCreative(c: SaisieCreative): Promise<Etat & { id?: string; code?: string }> {
  const u = await gestionnaire("marketing");
  if (!u) return { erreur: REFUS };
  if (c.id && !UUID.test(c.id)) return { erreur: "Image invalide." };
  if (!STATUTS_CREATIVE.some((s) => s.value === c.statut)) return { erreur: "Statut invalide." };
  const metaAdId = court(c.metaAdId, 30).replace(/\s/g, "");
  if (metaAdId && !META_AD_ID.test(metaAdId)) return { erreur: "L'identifiant Meta ne contient que des chiffres (copiez-le depuis la colonne « ID de la publicité » de Meta Ads Manager)." };
  if (c.imageChemin && !CHEMIN_IMAGE.test(c.imageChemin)) return { erreur: "Image invalide." };

  const supabase = await createClient();
  if (metaAdId) {
    const { data: prise } = await supabase.from("ci_creatives").select("id, code").eq("meta_ad_id", metaAdId).maybeSingle();
    if (prise && prise.id !== c.id) return { erreur: `Cet identifiant Meta est déjà associé à l'image ${prise.code}. Une annonce ne peut correspondre qu'à une seule image.` };
  }
  const communs = { hook: court(c.hook, 300), prompt: court(c.prompt, 6000), statut: c.statut, meta_ad_id: metaAdId || null, notes: court(c.notes, 1000) };

  if (c.id) {
    // L'angle, le type et la version identifient l'image : ils ne changent plus après la création
    const { data: avant } = await supabase.from("ci_creatives").select("image_chemin").eq("id", c.id).maybeSingle();
    if (!avant) return { erreur: "Image introuvable." };
    const { error } = await supabase.from("ci_creatives").update({ ...communs, ...(c.imageChemin ? { image_chemin: c.imageChemin } : {}) }).eq("id", c.id);
    if (error) return { erreur: "L'image n'a pas pu être enregistrée." };
    if (c.imageChemin && avant.image_chemin && avant.image_chemin !== c.imageChemin) await supprimer(BUCKET_CREATIVES, [avant.image_chemin]);
    rafraichir();
    return { succes: "ok", id: c.id };
  }

  if (!UUID.test(c.angleId)) return { erreur: "Choisissez l'angle de cette image." };
  if (!TYPES_IMAGE.some((t) => t.value === c.type)) return { erreur: "Choisissez le type d'image." };
  const { data: angle } = await supabase.from("ci_angles").select("code").eq("id", c.angleId).maybeSingle();
  if (!angle) return { erreur: "Angle introuvable." };
  const { data: versions } = await supabase.from("ci_creatives").select("version").eq("angle_id", c.angleId).eq("type_image", c.type).order("version", { ascending: false }).limit(1);
  const version = (versions?.[0]?.version ?? 0) + 1;
  const code = codeCreative(angle.code, c.type, version);
  const { data, error } = await supabase
    .from("ci_creatives")
    .insert({ ...communs, code, angle_id: c.angleId, type_image: c.type, version, image_chemin: c.imageChemin ?? "", created_by: u.id })
    .select("id")
    .single();
  if (error || !data) return { erreur: "L'image n'a pas pu être créée. Réessayez." };
  rafraichir();
  return { succes: "ok", id: data.id, code };
}

export async function changerStatutCreative(id: string, statut: string): Promise<Etat> {
  if (!(await gestionnaire("marketing")) || !UUID.test(id)) return { erreur: REFUS };
  if (!STATUTS_CREATIVE.some((s) => s.value === statut)) return { erreur: "Statut invalide." };
  const supabase = await createClient();
  const { error } = await supabase.from("ci_creatives").update({ statut }).eq("id", id);
  if (error) return { erreur: "Le statut n'a pas pu être modifié." };
  rafraichir();
  return { succes: "ok" };
}

/** Associe une annonce Meta importée à une image : décision explicite de l'utilisateur, jamais automatique. */
export async function associerAnnonce(creativeId: string, metaAdId: string): Promise<Etat> {
  if (!(await gestionnaire("marketing")) || !UUID.test(creativeId) || !META_AD_ID.test(metaAdId)) return { erreur: REFUS };
  const supabase = await createClient();
  const { data: creative } = await supabase.from("ci_creatives").select("code, meta_ad_id").eq("id", creativeId).maybeSingle();
  if (!creative) return { erreur: "Image introuvable." };
  if (creative.meta_ad_id && creative.meta_ad_id !== metaAdId) return { erreur: `L'image ${creative.code} est déjà associée à une autre annonce Meta.` };
  const { error } = await supabase.from("ci_creatives").update({ meta_ad_id: metaAdId }).eq("id", creativeId);
  if (error) return { erreur: "L'association n'a pas pu être enregistrée." };
  rafraichir();
  return { succes: "ok" };
}

/* ------------------------------- Import Meta ------------------------------- */

export type LigneVerifiee = LigneMeta & { sort: "nouvelle" | "mise_a_jour" | "chevauchement"; creative: string | null };

const ligneValide = (l: LigneMeta) =>
  META_AD_ID.test(String(l.adId)) && jourValide(l.debut) && jourValide(l.fin) && l.fin >= l.debut && [l.depenses, l.impressions, l.clics, l.leads].every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0) && Number.isInteger(l.impressions) && Number.isInteger(l.clics) && Number.isInteger(l.leads);

async function examiner(lignes: LigneMeta[]) {
  const supabase = await createClient();
  const ids = [...new Set(lignes.map((l) => l.adId))];
  const [{ data: existantes }, { data: creatives }] = await Promise.all([
    supabase.from("ci_performances").select("meta_ad_id, date_debut, date_fin").in("meta_ad_id", ids),
    supabase.from("ci_creatives").select("code, meta_ad_id").in("meta_ad_id", ids),
  ]);
  const periodes = (existantes ?? []).map((e) => ({ adId: e.meta_ad_id, debut: e.date_debut, fin: e.date_fin }));
  const codes = new Map((creatives ?? []).map((c) => [c.meta_ad_id as string, c.code as string]));
  return lignes.map((l): LigneVerifiee => ({ ...l, sort: sortDeLaLigne(l, periodes), creative: codes.get(l.adId) ?? null }));
}

/** Aperçu avant import : ce que deviendra chaque ligne, et à quelle image elle est associée (ou non). */
export async function verifierImportMeta(lignes: LigneMeta[]): Promise<{ erreur: string } | { lignes: LigneVerifiee[] }> {
  if (!(await gestionnaire("marketing"))) return { erreur: REFUS };
  if (!Array.isArray(lignes) || !lignes.length) return { erreur: "Aucune ligne à importer." };
  if (lignes.length > 5000) return { erreur: "Fichier trop long (5 000 lignes au maximum). Réduisez la période exportée." };
  if (!lignes.every(ligneValide)) return { erreur: "Le fichier contient des lignes invalides." };
  return { lignes: await examiner(lignes) };
}

export async function importerPerformances(args: { nomFichier: string; devise: string; lignes: LigneMeta[]; erreurs: ErreurImport[] }): Promise<Etat & { creees?: number; misesAJour?: number; refusees?: number }> {
  const u = await gestionnaire("marketing");
  if (!u) return { erreur: REFUS };
  if (!Array.isArray(args.lignes) || !args.lignes.length || args.lignes.length > 5000 || !args.lignes.every(ligneValide)) return { erreur: "Le fichier contient des lignes invalides." };
  if (!/^[A-Z]{3}$/.test(args.devise)) return { erreur: "Devise invalide." };
  const supabase = await createClient();
  const { data: reglages } = await supabase.from("ci_reglages").select("devise").maybeSingle();
  if (reglages && reglages.devise !== args.devise) return { erreur: `Ce fichier est en ${args.devise}, alors que le module est réglé en ${reglages.devise}. Les devises ne sont jamais mélangées : changez la devise dans les réglages ou exportez un autre fichier.` };

  const verifiees = await examiner(args.lignes);
  const aEcrire = verifiees.filter((l) => l.sort !== "chevauchement");
  const refusees = verifiees.filter((l) => l.sort === "chevauchement");
  const erreurs = [
    ...(Array.isArray(args.erreurs) ? args.erreurs : []).slice(0, 200).map((e) => ({ ligne: Number(e.ligne) || 0, message: court(e.message, 300) })),
    ...refusees.slice(0, 200).map((l) => ({ ligne: 0, message: `Annonce ${l.adId} du ${l.debut} au ${l.fin} : cette période recouvre des données déjà importées (risque de double comptage).` })),
  ];
  const dates = args.lignes.flatMap((l) => [l.debut, l.fin]).sort();
  const { data: imp, error: eImp } = await supabase
    .from("ci_imports")
    .insert({
      nom_fichier: court(args.nomFichier, 200),
      devise: args.devise,
      periode_debut: dates[0],
      periode_fin: dates[dates.length - 1],
      lignes_creees: aEcrire.filter((l) => l.sort === "nouvelle").length,
      lignes_mises_a_jour: aEcrire.filter((l) => l.sort === "mise_a_jour").length,
      lignes_refusees: erreurs.length,
      erreurs,
      created_by: u.id,
    })
    .select("id")
    .single();
  if (eImp || !imp) return { erreur: "L'import n'a pas pu être enregistré." };

  if (aEcrire.length) {
    const { error } = await supabase.from("ci_performances").upsert(
      aEcrire.map((l) => ({ import_id: imp.id, meta_ad_id: l.adId, nom_annonce: court(l.nom, 200), date_debut: l.debut, date_fin: l.fin, depenses: Math.round(l.depenses * 100) / 100, impressions: l.impressions, clics: l.clics, leads: l.leads, devise: args.devise, updated_at: new Date().toISOString() })),
      { onConflict: "meta_ad_id,date_debut,date_fin" },
    );
    if (error) {
      await supabase.from("ci_imports").delete().eq("id", imp.id);
      return { erreur: "Les performances n'ont pas pu être enregistrées. Rien n'a été importé." };
    }
  }
  rafraichir();
  return { succes: "ok", creees: aEcrire.filter((l) => l.sort === "nouvelle").length, misesAJour: aEcrire.filter((l) => l.sort === "mise_a_jour").length, refusees: erreurs.length };
}

/* ------------------------------- Réglages ------------------------------- */

export async function enregistrerReglages(r: { devise: string; budgetMensuel: string; cplCible: string; impressionsMin: string; leadsMin: string; ctrMin: string; tolerance: string }): Promise<Etat> {
  if (!(await gestionnaire("marketing"))) return { erreur: REFUS };
  const [budget, cpl, impressions, leads, ctr, tolerance] = [r.budgetMensuel, r.cplCible, r.impressionsMin, r.leadsMin, r.ctrMin, r.tolerance].map(nombre);
  if (!/^[A-Z]{3}$/.test(r.devise)) return { erreur: "Devise invalide (3 lettres, par exemple EUR)." };
  if (!(budget >= 0)) return { erreur: "Indiquez le budget mensuel." };
  if (!(cpl > 0)) return { erreur: "Indiquez un CPL cible supérieur à zéro." };
  if (!(impressions >= 0) || !Number.isInteger(impressions)) return { erreur: "Le minimum d'impressions est un nombre entier." };
  if (!(leads >= 1) || !Number.isInteger(leads)) return { erreur: "Il faut au moins 1 lead pour juger une publicité." };
  if (!(ctr >= 0)) return { erreur: "Indiquez le CTR minimal attendu." };
  if (!(tolerance >= 1)) return { erreur: "La tolérance est au moins de 1." };
  const supabase = await createClient();
  const { count } = await supabase.from("ci_performances").select("id", { count: "exact", head: true }).neq("devise", r.devise);
  if (count) return { erreur: `Des performances sont déjà enregistrées dans une autre devise que ${r.devise} : la devise ne peut plus être changée.` };
  const { error } = await supabase
    .from("ci_reglages")
    .update({ devise: r.devise, budget_mensuel: budget, cpl_cible: cpl, cpl_confirme: true, impressions_min: impressions, leads_min: leads, ctr_min: ctr, tolerance, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return { erreur: "Les réglages n'ont pas pu être enregistrés." };
  rafraichir();
  return { succes: "ok" };
}
