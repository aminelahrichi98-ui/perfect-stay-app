"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { droitEstimateur, UUID } from "@/lib/estimation/acces";
import { champsBloquants, controlerDonnees } from "@/lib/marche/extraction";
import { MAX_CAPTURES, TAILLE_MAX_CAPTURE, TYPES_CAPTURE, verifierCapture } from "@/lib/marche/images";
import { cle } from "@/lib/marche/nombres";
import { SchemaDonneesMarche, type DonneesMarche } from "@/lib/marche/schema";
import { BUCKET_MARCHE, COLONNES_COMPARABLE, COLONNES_VERSION, normaliserComparable, normaliserVersion, versionVersDonnees, type LigneQuartier, type LigneSegment } from "@/lib/marche/serveur";
import { verifierDoublon, type ResumeVersion } from "@/lib/marche/versions";
import { nomSur, supprimer, telecharger, urlEnvoiSigne } from "@/lib/stockage";
import { createClient } from "@/lib/supabase/server";

type Retour<T = object> = ({ erreur?: undefined } & T) | { erreur: string };
const REFUS = { erreur: "Vous n'avez pas le droit de modifier la base de données marché." } as const;

/* ------------------------------ Captures ------------------------------ */

export type FichierAnnonce = { nom: string; taille: number; type: string };

/** Crée l'import si besoin et renvoie une autorisation d'envoi direct (stockage privé) par capture. */
export async function preparerEnvoiCaptures(p: { importId?: string; segmentId?: string; fichiers: FichierAnnonce[] }): Promise<Retour<{ importId: string; envois: { chemin: string; token: string }[] }>> {
  const u = await droitEstimateur();
  if (!u) return REFUS;
  if (!p.fichiers.length || p.fichiers.length > MAX_CAPTURES) return { erreur: `De 1 à ${MAX_CAPTURES} captures à la fois.` };
  if (p.fichiers.some((f) => !(TYPES_CAPTURE as readonly string[]).includes(f.type))) return { erreur: "Formats acceptés : PNG, JPEG ou WEBP." };
  if (p.fichiers.some((f) => !(f.taille > 0) || f.taille > TAILLE_MAX_CAPTURE)) return { erreur: "Une capture est trop lourde (15 Mo au maximum)." };
  const supabase = await createClient();

  let importId = p.importId;
  if (importId) {
    if (!UUID.test(importId)) return { erreur: "Import introuvable." };
    const { data: imp } = await supabase.from("marche_imports").select("statut").eq("id", importId).maybeSingle();
    if (!imp || imp.statut === "valide" || imp.statut === "abandonne") return { erreur: "Cet import est clos : commencez un nouvel import." };
    const { count } = await supabase.from("marche_captures").select("id", { count: "exact", head: true }).eq("import_id", importId);
    if ((count ?? 0) + p.fichiers.length > MAX_CAPTURES) return { erreur: `${MAX_CAPTURES} captures au maximum par import.` };
  } else {
    const segmentId = p.segmentId && UUID.test(p.segmentId) ? p.segmentId : null;
    const { data, error } = await supabase.from("marche_imports").insert({ created_by: u.id, segment_id: segmentId }).select("id").single();
    if (error || !data) return { erreur: "L'import n'a pas pu être créé." };
    importId = data.id as string;
  }
  try {
    const envois = await Promise.all(p.fichiers.map((f) => urlEnvoiSigne(BUCKET_MARCHE, `imports/${importId}/${randomUUID()}-${nomSur(f.nom)}`)));
    return { importId: importId!, envois };
  } catch {
    return { erreur: "L'envoi des captures n'a pas pu être préparé. Réessayez." };
  }
}

/** Enregistre les captures envoyées, après vérification de leur contenu réel (pas seulement de l'extension). */
export async function enregistrerCaptures(importId: string, fichiers: { chemin: string; nom: string }[]): Promise<Retour<{ refusees: string[] }>> {
  const u = await droitEstimateur();
  if (!u) return REFUS;
  if (!UUID.test(importId) || !fichiers.length || fichiers.length > MAX_CAPTURES) return { erreur: "Envoi invalide." };
  const prefixe = `imports/${importId}/`;
  if (fichiers.some((f) => !f.chemin.startsWith(prefixe) || f.chemin.includes("..") || !/^[A-Za-z0-9/._-]+$/.test(f.chemin))) return { erreur: "Chemin de fichier invalide." };
  const supabase = await createClient();
  const { data: imp } = await supabase.from("marche_imports").select("statut").eq("id", importId).maybeSingle();
  if (!imp || imp.statut === "valide" || imp.statut === "abandonne") return { erreur: "Cet import est clos." };
  const { count } = await supabase.from("marche_captures").select("id", { count: "exact", head: true }).eq("import_id", importId);

  const refusees: string[] = [];
  const lignes: Record<string, unknown>[] = [];
  const vus = new Set<string>();
  for (const f of fichiers) {
    const nom = f.nom.slice(0, 120);
    try {
      const contenu = await telecharger(BUCKET_MARCHE, f.chemin);
      const empreinte = createHash("sha256").update(contenu).digest("hex");
      const v = await verifierCapture(contenu);
      if ("erreur" in v || vus.has(empreinte)) {
        refusees.push(`${nom} : ${"erreur" in v ? v.erreur : "capture en double"}`);
        await supprimer(BUCKET_MARCHE, [f.chemin]);
        continue;
      }
      vus.add(empreinte);
      lignes.push({ import_id: importId, chemin: f.chemin, nom, type_mime: v.type, taille: contenu.length, ordre: (count ?? 0) + lignes.length });
    } catch {
      refusees.push(`${nom} : fichier introuvable après l'envoi`);
    }
  }
  if (lignes.length) {
    const { error } = await supabase.from("marche_captures").insert(lignes);
    if (error) return { erreur: "Les captures n'ont pas pu être enregistrées." };
  }
  revalidatePath(`/estimateur/marche/import/${importId}`);
  return { refusees };
}

export async function retirerCapture(captureId: string): Promise<Retour> {
  const u = await droitEstimateur();
  if (!u) return REFUS;
  if (!UUID.test(captureId)) return { erreur: "Capture introuvable." };
  const supabase = await createClient();
  const { data: c } = await supabase.from("marche_captures").select("chemin, import_id").eq("id", captureId).maybeSingle();
  if (!c) return { erreur: "Capture introuvable." };
  const { data: supprimee } = await supabase.from("marche_captures").delete().eq("id", captureId).select("id");
  if (!supprimee?.length) return { erreur: "Une capture d'un import validé est conservée comme source." };
  await supprimer(BUCKET_MARCHE, [c.chemin]);
  revalidatePath(`/estimateur/marche/import/${c.import_id}`);
  return {};
}

/* ------------------------------ Saisie et brouillon ------------------------------ */

/** Nouvel import sans capture (saisie manuelle), ou « compléter » : pré-rempli depuis la version active d'un segment. */
export async function nouvelleSaisie(segmentId?: string): Promise<Retour<{ importId: string }>> {
  const u = await droitEstimateur();
  if (!u) return REFUS;
  const supabase = await createClient();
  let donnees: DonneesMarche | null = null;
  let segment: string | null = null;
  if (segmentId) {
    if (!UUID.test(segmentId)) return { erreur: "Segment introuvable." };
    const { data: s } = await supabase.from("marche_segments").select("id, quartier_id, type_logement, chambres, chambres_max, capacite, standing, statut, created_at").eq("id", segmentId).maybeSingle();
    if (!s) return { erreur: "Segment introuvable." };
    const [{ data: q }, { data: v }] = await Promise.all([
      supabase.from("marche_quartiers").select("id, pays, ville, ville_cle, nom, cle, actif").eq("id", s.quartier_id).maybeSingle(),
      supabase.from("marche_versions").select(COLONNES_VERSION).eq("segment_id", segmentId).eq("active", true).maybeSingle(),
    ]);
    if (q && v) {
      const { data: comp } = await supabase.from("marche_comparables").select(COLONNES_COMPARABLE).eq("version_id", v.id).order("ordre");
      donnees = versionVersDonnees(normaliserVersion(v), (comp ?? []).map(normaliserComparable), s as LigneSegment, q as LigneQuartier);
      donnees.avertissements = [];
      donnees.manquants = [];
    }
    segment = s.id;
  }
  const { data, error } = await supabase.from("marche_imports").insert({ created_by: u.id, segment_id: segment, donnees, statut: donnees ? "extrait" : "brouillon", modele: "saisie manuelle" }).select("id").single();
  if (error || !data) return { erreur: "La saisie n'a pas pu être créée." };
  return { importId: data.id as string };
}

export async function enregistrerBrouillon(importId: string, donnees: DonneesMarche): Promise<Retour> {
  const u = await droitEstimateur();
  if (!u) return REFUS;
  if (!UUID.test(importId)) return { erreur: "Import introuvable." };
  const d = SchemaDonneesMarche.safeParse(donnees);
  if (!d.success) return { erreur: `Données invalides : ${d.error.issues[0]?.path.join(".")} — ${d.error.issues[0]?.message}` };
  const supabase = await createClient();
  const { data } = await supabase.from("marche_imports").update({ donnees: d.data }).eq("id", importId).neq("statut", "valide").select("id");
  if (!data?.length) return { erreur: "Cet import est déjà validé ou introuvable." };
  return {};
}

export async function abandonnerImport(importId: string): Promise<Retour> {
  const u = await droitEstimateur();
  if (!u) return REFUS;
  if (!UUID.test(importId)) return { erreur: "Import introuvable." };
  const supabase = await createClient();
  const { data: captures } = await supabase.from("marche_captures").select("chemin").eq("import_id", importId);
  const { data } = await supabase.from("marche_imports").delete().eq("id", importId).neq("statut", "valide").select("id");
  if (!data?.length) return { erreur: "Un import validé est conservé comme source." };
  await supprimer(BUCKET_MARCHE, (captures ?? []).map((c) => c.chemin));
  revalidatePath("/estimateur/marche");
  return {};
}

/* ------------------------------ Validation humaine ------------------------------ */

export type ChoixValidation = {
  /** Quartier existant, ou création explicite d'un nouveau quartier (jamais de rapprochement automatique). */
  quartierId: string | null;
  creerQuartier: boolean;
  confirmerMemePeriode: boolean;
  confirmerBaseInconnue: boolean;
  notes: string;
};

export async function validerImport(importId: string, donnees: DonneesMarche, choix: ChoixValidation): Promise<Retour<{ segmentId: string; numero: number }> | { confirmation: string }> {
  const u = await droitEstimateur();
  if (!u) return REFUS;
  if (!UUID.test(importId)) return { erreur: "Import introuvable." };
  const parse = SchemaDonneesMarche.safeParse(donnees);
  if (!parse.success) return { erreur: `Données invalides : ${parse.error.issues[0]?.path.join(".")} — ${parse.error.issues[0]?.message}` };
  const d = parse.data;
  const bloquants = champsBloquants(d);
  if (bloquants.length) return { erreur: `Complétez d'abord : ${bloquants.join(", ")}.` };
  const incoherences = controlerDonnees(d).filter((i) => i.niveau === "bloquant");
  if (incoherences.length) return { erreur: incoherences.map((i) => i.message).join(" ") };
  if (d.base.plateforme_incluse === null && !choix.confirmerBaseInconnue) {
    return { confirmation: "La capture ne dit pas si les revenus incluent les frais de plateforme. Les estimations demanderont de confirmer la base de calcul. Valider quand même ?" };
  }

  const supabase = await createClient();
  const { data: imp } = await supabase.from("marche_imports").select("id, statut, segment_id, modele").eq("id", importId).maybeSingle();
  if (!imp) return { erreur: "Import introuvable." };
  if (imp.statut === "valide") return { erreur: "Cet import est déjà validé." };

  // Quartier : existant ou créé explicitement
  const villeCle = cle(d.segment.ville);
  let quartierId = choix.quartierId && UUID.test(choix.quartierId) ? choix.quartierId : null;
  if (quartierId) {
    const { data: q } = await supabase.from("marche_quartiers").select("id, ville_cle").eq("id", quartierId).maybeSingle();
    if (!q || q.ville_cle !== villeCle) return { erreur: "Le quartier choisi n'appartient pas à cette ville." };
  } else if (choix.creerQuartier) {
    const { data: q, error } = await supabase
      .from("marche_quartiers")
      .insert({ pays: d.segment.pays, ville: d.segment.ville.trim(), ville_cle: villeCle, nom: d.segment.quartier.trim(), cle: cle(d.segment.quartier) })
      .select("id")
      .single();
    if (error || !q) {
      // Déjà créé (validation relancée) : on reprend ce quartier, jamais un autre
      const { data: existant } = await supabase.from("marche_quartiers").select("id").eq("ville_cle", villeCle).eq("cle", cle(d.segment.quartier)).maybeSingle();
      if (!existant) return { erreur: "Le quartier n'a pas pu être créé." };
      quartierId = existant.id as string;
    } else quartierId = q.id as string;
  } else return { erreur: "Choisissez le quartier existant ou confirmez la création d'un nouveau quartier." };

  // Segment : trouvé ou créé (studio ≠ 1 chambre, regroupement seulement s'il vient de PriceLabs)
  const type = d.segment.type_logement!;
  const chambres = type === "studio" ? 0 : d.segment.chambres!;
  const chambresMax = type === "studio" ? null : d.segment.chambres_max;
  let requete = supabase.from("marche_segments").select("id, statut").eq("quartier_id", quartierId).eq("type_logement", type).eq("chambres", chambres);
  requete = chambresMax === null ? requete.is("chambres_max", null) : requete.eq("chambres_max", chambresMax);
  requete = d.segment.capacite === null ? requete.is("capacite", null) : requete.eq("capacite", d.segment.capacite);
  requete = d.segment.standing === null ? requete.is("standing", null) : requete.eq("standing", d.segment.standing);
  const { data: existant } = await requete.maybeSingle();
  let segmentId = existant?.id as string | undefined;
  if (!segmentId) {
    const { data: s, error } = await supabase
      .from("marche_segments")
      .insert({ quartier_id: quartierId, type_logement: type, chambres, chambres_max: chambresMax, capacite: d.segment.capacite, standing: d.segment.standing, created_by: u.id })
      .select("id")
      .single();
    if (error || !s) return { erreur: "Le segment n'a pas pu être créé." };
    segmentId = s.id as string;
  } else if (existant?.statut === "archive") {
    await supabase.from("marche_segments").update({ statut: "actif" }).eq("id", segmentId);
  }

  // Doublons
  const { data: anciennes } = await supabase.from("marche_versions").select("id, numero, active, periode_debut, periode_fin, devise, revenu_annuel_bas, revenu_annuel_central, revenu_annuel_haut, adr, occupation, nuits_reservees, echantillon").eq("segment_id", segmentId);
  const resumes = (anciennes ?? []).map((v) => normaliserVersion(v) as unknown as ResumeVersion & { id: string; active: boolean });
  const doublon = verifierDoublon(d, resumes);
  if (doublon?.type === "doublon") return { erreur: `Ces données existent déjà (version n° ${doublon.numero} de ce segment). Rien n'a été créé.` };
  if (doublon?.type === "meme_periode" && !choix.confirmerMemePeriode) {
    return { confirmation: `La version n° ${doublon.numero} couvre déjà cette période avec d'autres chiffres. Créer une nouvelle version qui la remplacera ?` };
  }

  // Nouvelle version (inactive le temps d'enregistrer les comparables), puis bascule
  const numero = Math.max(0, ...resumes.map((v) => v.numero)) + 1;
  const { data: captures } = await supabase.from("marche_captures").select("id, ordre").eq("import_id", importId).order("ordre");
  const { data: version, error: errVersion } = await supabase
    .from("marche_versions")
    .insert({
      segment_id: segmentId,
      numero,
      active: false,
      source: imp.modele === "saisie manuelle" ? "PriceLabs (saisie manuelle)" : "PriceLabs",
      import_id: importId,
      periode_debut: d.periode.debut,
      periode_fin: d.periode.fin,
      type_periode: d.periode.type,
      devise: d.devise,
      base_plateforme_incluse: d.base.plateforme_incluse,
      base_menage_inclus: d.base.menage_inclus,
      base_taxes_incluses: d.base.taxes_incluses,
      definition_source: d.base.definition,
      revenu_annuel_bas: d.metriques.revenu_annuel_bas,
      revenu_annuel_central: d.metriques.revenu_annuel_central,
      revenu_annuel_haut: d.metriques.revenu_annuel_haut,
      central_derive: false,
      central_nature: d.metriques.revenu_annuel_central === null ? "inconnu" : d.central_nature,
      adr: d.metriques.adr,
      occupation: d.metriques.occupation,
      nuits_reservees: d.metriques.nuits_reservees,
      echantillon: d.metriques.echantillon,
      revenu_mensuel_moyen: d.metriques.revenu_mensuel_moyen,
      percentiles: d.percentiles,
      mensuels: d.mensuels,
      parametres_recherche: d.parametres_recherche,
      autres_metriques: d.autres,
      infos_frais: d.infos_frais,
      preuves: d.preuves,
      avertissements: d.avertissements,
      derives: [],
      notes: choix.notes.trim().slice(0, 1000),
      validee_par: u.id,
    })
    .select("id")
    .single();
  if (errVersion || !version) return { erreur: "La version n'a pas pu être enregistrée." };

  if (d.comparables.length) {
    const parCapture = new Map((captures ?? []).map((c, i) => [i + 1, c.id as string]));
    const { error } = await supabase.from("marche_comparables").insert(
      d.comparables.map((c, i) => ({
        version_id: version.id, ordre: i, nom: c.nom, quartier: c.quartier, type_logement: c.type_logement, chambres: c.chambres, capacite: c.capacite,
        revenu_annuel: c.revenu_annuel, revenu_annuel_bas: c.revenu_annuel_bas, revenu_annuel_haut: c.revenu_annuel_haut, adr: c.adr, occupation: c.occupation,
        note: c.note, nb_avis: c.nb_avis, equipements: c.equipements, url: c.url, identifiant: c.identifiant, capture_id: c.capture ? (parCapture.get(c.capture) ?? null) : null, affichable: c.affichable,
      })),
    );
    if (error) return { erreur: "Les annonces comparables n'ont pas pu être enregistrées. La version reste inactive : réessayez la validation." };
  }

  const ancienne = resumes.find((v) => v.active);
  if (ancienne) await supabase.from("marche_versions").update({ active: false, statut: "remplacee" }).eq("id", ancienne.id);
  const { error: errActive } = await supabase.from("marche_versions").update({ active: true }).eq("id", version.id);
  if (errActive) return { erreur: "La version est enregistrée mais n'a pas pu être activée. Activez-la depuis la fiche du segment." };
  await supabase.from("marche_imports").update({ statut: "valide", segment_id: segmentId, donnees: d }).eq("id", importId);

  revalidatePath("/estimateur/marche");
  revalidatePath("/estimateur");
  return { segmentId, numero };
}

/* ------------------------------ Segments, versions, comparables ------------------------------ */

export async function changerStatutSegment(segmentId: string, statut: "actif" | "archive"): Promise<Retour> {
  const u = await droitEstimateur();
  if (!u) return REFUS;
  if (!UUID.test(segmentId)) return { erreur: "Segment introuvable." };
  const supabase = await createClient();
  const { data } = await supabase.from("marche_segments").update({ statut }).eq("id", segmentId).select("id");
  if (!data?.length) return { erreur: "Segment introuvable." };
  revalidatePath("/estimateur/marche");
  revalidatePath(`/estimateur/marche/${segmentId}`);
  return {};
}

/** Choisit la version utilisée par les nouvelles estimations (les estimations déjà faites gardent la leur). */
export async function activerVersion(versionId: string): Promise<Retour> {
  const u = await droitEstimateur();
  if (!u) return REFUS;
  if (!UUID.test(versionId)) return { erreur: "Version introuvable." };
  const supabase = await createClient();
  const { data: v } = await supabase.from("marche_versions").select("id, segment_id, statut").eq("id", versionId).maybeSingle();
  if (!v) return { erreur: "Version introuvable." };
  if (v.statut === "archivee") return { erreur: "Une version archivée ne peut pas redevenir active." };
  await supabase.from("marche_versions").update({ active: false, statut: "remplacee" }).eq("segment_id", v.segment_id).eq("active", true);
  const { error } = await supabase.from("marche_versions").update({ active: true, statut: "validee" }).eq("id", versionId);
  if (error) return { erreur: "La version n'a pas pu être activée." };
  revalidatePath(`/estimateur/marche/${v.segment_id}`);
  revalidatePath("/estimateur/marche");
  return {};
}

export async function archiverVersion(versionId: string): Promise<Retour> {
  const u = await droitEstimateur();
  if (!u) return REFUS;
  if (!UUID.test(versionId)) return { erreur: "Version introuvable." };
  const supabase = await createClient();
  const { data } = await supabase.from("marche_versions").update({ active: false, statut: "archivee" }).eq("id", versionId).select("segment_id");
  if (!data?.length) return { erreur: "Version introuvable." };
  revalidatePath(`/estimateur/marche/${data[0].segment_id}`);
  revalidatePath("/estimateur/marche");
  return {};
}

export async function noterVersion(versionId: string, notes: string): Promise<Retour> {
  const u = await droitEstimateur();
  if (!u) return REFUS;
  if (!UUID.test(versionId)) return { erreur: "Version introuvable." };
  const supabase = await createClient();
  const { data } = await supabase.from("marche_versions").update({ notes: notes.trim().slice(0, 1000) }).eq("id", versionId).select("segment_id");
  if (!data?.length) return { erreur: "Version introuvable." };
  revalidatePath(`/estimateur/marche/${data[0].segment_id}`);
  return {};
}

/** Présentation d'un comparable (affiché ou non dans les estimations) : les chiffres restent ceux de la version. */
export async function afficherComparable(comparableId: string, affichable: boolean): Promise<Retour> {
  const u = await droitEstimateur();
  if (!u) return REFUS;
  if (!UUID.test(comparableId)) return { erreur: "Annonce introuvable." };
  const supabase = await createClient();
  const { data } = await supabase.from("marche_comparables").update({ affichable }).eq("id", comparableId).select("id");
  if (!data?.length) return { erreur: "Annonce introuvable." };
  revalidatePath("/estimateur/marche", "layout");
  return {};
}

export async function preparerPhotoComparable(comparableId: string, f: FichierAnnonce): Promise<Retour<{ chemin: string; token: string }>> {
  const u = await droitEstimateur();
  if (!u) return REFUS;
  if (!UUID.test(comparableId)) return { erreur: "Annonce introuvable." };
  if (!(TYPES_CAPTURE as readonly string[]).includes(f.type) || !(f.taille > 0) || f.taille > 8 * 1024 * 1024) return { erreur: "Photo PNG, JPEG ou WEBP de 8 Mo au maximum." };
  try {
    return await urlEnvoiSigne(BUCKET_MARCHE, `comparables/${comparableId}/${randomUUID()}-${nomSur(f.nom)}`);
  } catch {
    return { erreur: "L'envoi n'a pas pu être préparé." };
  }
}

export async function enregistrerPhotoComparable(comparableId: string, chemin: string): Promise<Retour> {
  const u = await droitEstimateur();
  if (!u) return REFUS;
  if (!UUID.test(comparableId) || !chemin.startsWith(`comparables/${comparableId}/`) || chemin.includes("..")) return { erreur: "Photo invalide." };
  const v = await verifierCapture(await telecharger(BUCKET_MARCHE, chemin).catch(() => Buffer.alloc(0)));
  if ("erreur" in v) {
    await supprimer(BUCKET_MARCHE, [chemin]);
    return { erreur: v.erreur };
  }
  const supabase = await createClient();
  const { data: avant } = await supabase.from("marche_comparables").select("photo_chemin").eq("id", comparableId).maybeSingle();
  const { data } = await supabase.from("marche_comparables").update({ photo_chemin: chemin }).eq("id", comparableId).select("id");
  if (!data?.length) return { erreur: "Annonce introuvable." };
  if (avant?.photo_chemin) await supprimer(BUCKET_MARCHE, [avant.photo_chemin]);
  revalidatePath("/estimateur/marche", "layout");
  return {};
}

/* ------------------------------ Quartiers et alias ------------------------------ */

export async function ajouterQuartier(ville: string, nom: string): Promise<Retour> {
  const u = await droitEstimateur();
  if (!u) return REFUS;
  const v = ville.trim().slice(0, 80);
  const n = nom.trim().slice(0, 120);
  if (!cle(v) || !cle(n)) return { erreur: "Indiquez la ville et le quartier." };
  const supabase = await createClient();
  const { data: alias } = await supabase.from("marche_alias").select("id").eq("ville_cle", cle(v)).eq("cle", cle(n)).maybeSingle();
  if (alias) return { erreur: "Ce nom est déjà un alias d'un quartier de cette ville." };
  const { error } = await supabase.from("marche_quartiers").insert({ ville: v, ville_cle: cle(v), nom: n, cle: cle(n) });
  if (error) return { erreur: "Ce quartier existe déjà." };
  revalidatePath("/estimateur/marche/quartiers");
  return {};
}

export async function ajouterAlias(quartierId: string, alias: string): Promise<Retour> {
  const u = await droitEstimateur();
  if (!u) return REFUS;
  const a = alias.trim().slice(0, 120);
  if (!UUID.test(quartierId) || !cle(a)) return { erreur: "Indiquez l'alias." };
  const supabase = await createClient();
  const { data: q } = await supabase.from("marche_quartiers").select("ville_cle, cle").eq("id", quartierId).maybeSingle();
  if (!q) return { erreur: "Quartier introuvable." };
  if (q.cle === cle(a)) return { erreur: "C'est déjà le nom du quartier." };
  const { data: autre } = await supabase.from("marche_quartiers").select("id").eq("ville_cle", q.ville_cle).eq("cle", cle(a)).maybeSingle();
  if (autre) return { erreur: "Ce nom est celui d'un autre quartier : un alias ne peut pas le remplacer." };
  const { error } = await supabase.from("marche_alias").insert({ quartier_id: quartierId, ville_cle: q.ville_cle, alias: a, cle: cle(a), created_by: u.id });
  if (error) return { erreur: "Cet alias désigne déjà un quartier de cette ville." };
  revalidatePath("/estimateur/marche/quartiers");
  return {};
}

export async function supprimerAlias(aliasId: string): Promise<Retour> {
  const u = await droitEstimateur();
  if (!u) return REFUS;
  if (!u.admin) return { erreur: "Seul un administrateur peut supprimer un alias." };
  if (!UUID.test(aliasId)) return { erreur: "Alias introuvable." };
  const supabase = await createClient();
  await supabase.from("marche_alias").delete().eq("id", aliasId);
  revalidatePath("/estimateur/marche/quartiers");
  return {};
}

export async function changerQuartier(quartierId: string, actif: boolean): Promise<Retour> {
  const u = await droitEstimateur();
  if (!u) return REFUS;
  if (!UUID.test(quartierId)) return { erreur: "Quartier introuvable." };
  const supabase = await createClient();
  await supabase.from("marche_quartiers").update({ actif }).eq("id", quartierId);
  revalidatePath("/estimateur/marche/quartiers");
  return {};
}
