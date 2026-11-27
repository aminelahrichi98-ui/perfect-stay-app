"use server";

import { revalidatePath } from "next/cache";
import { getUtilisateur, peutModifier, peutVoir } from "@/lib/auth";
import { droitEstimateur, UUID } from "@/lib/estimation/acces";
import { calculer, type Charges, type LongueDuree } from "@/lib/estimation/calcul";
import { typologie } from "@/lib/estimation/format";
import { SchemaBien, SchemaSaisie, saisonnaliteFiable, typeBienHerite, type Bien, type ComparableFige, type Saisie, type Snapshot } from "@/lib/estimation/snapshot";
import { chercherMarche, type Candidat, type ResultatRecherche } from "@/lib/marche/matching";
import { BUCKET_MARCHE, chargerParametres, chargerReferentiel, COLONNES_COMPARABLE, COLONNES_VERSION, normaliserComparable, normaliserVersion, type LigneComparable, type LigneVersion } from "@/lib/marche/serveur";
import { aujourdhui } from "@/lib/dates";
import { urlsLecture } from "@/lib/stockage";
import { createClient } from "@/lib/supabase/server";

type Retour<T = object> = ({ erreur?: undefined } & T) | { erreur: string };

/* ------------------------------ CRM : prospects et logements ------------------------------ */

export type LeadResume = { id: string; nom: string; telephone: string; email: string; ville: string; etape: string; source: string; quartiers: string[] };

/** Recherche par nom, téléphone, e-mail, ville, quartier d'un logement ou identifiant. Respecte les droits CRM. */
export async function rechercherLeads(q: string): Promise<Retour<{ leads: LeadResume[] }>> {
  const u = await droitEstimateur("voir");
  if (!u) return { erreur: "Accès refusé." };
  if (!peutVoir(u, "crm")) return { erreur: "Le droit « CRM – voir » est nécessaire pour rechercher un prospect." };
  const texte = q.trim().slice(0, 80);
  if (texte.length < 2) return { leads: [] };
  const supabase = await createClient();
  const colonnes = "id, nom, telephone, email, ville, etape, source";
  let lignes: Record<string, string>[] = [];
  if (UUID.test(texte)) {
    const { data } = await supabase.from("crm_leads").select(colonnes).eq("id", texte);
    lignes = data ?? [];
  } else {
    const sur = texte.replace(/[,()%*\\]/g, " ").trim();
    const chiffres = sur.replace(/\D/g, "");
    const filtres = [`nom.ilike.%${sur}%`, `email.ilike.%${sur}%`, `ville.ilike.%${sur}%`, `telephone.ilike.%${sur}%`];
    if (chiffres.length >= 6) filtres.push(`telephone.ilike.%${chiffres.slice(-8)}%`);
    const [{ data: parLead }, { data: parBien }] = await Promise.all([
      supabase.from("crm_leads").select(colonnes).or(filtres.join(",")).order("created_at", { ascending: false }).limit(15),
      supabase.from("crm_biens").select("lead_id").ilike("quartier", `%${sur}%`).limit(15),
    ]);
    lignes = parLead ?? [];
    const manquants = [...new Set((parBien ?? []).map((b) => b.lead_id))].filter((id) => !lignes.some((l) => l.id === id));
    if (manquants.length) {
      const { data } = await supabase.from("crm_leads").select(colonnes).in("id", manquants);
      lignes = [...lignes, ...(data ?? [])];
    }
  }
  const ids = lignes.map((l) => l.id);
  const { data: biens } = ids.length ? await supabase.from("crm_biens").select("lead_id, quartier").in("lead_id", ids) : { data: [] };
  return {
    leads: lignes.slice(0, 20).map((l) => ({ id: l.id, nom: l.nom, telephone: l.telephone, email: l.email, ville: l.ville, etape: l.etape, source: l.source, quartiers: [...new Set((biens ?? []).filter((b) => b.lead_id === l.id && b.quartier).map((b) => b.quartier as string))] })),
  };
}

export type LeadComplet = {
  id: string; nom: string; telephone: string; email: string; ville: string; type_bien: string; source: string; etape: string; notes: string;
  responsable: { id: string; nom: string } | null;
  biens: (Bien & { id: string })[];
  estimations: number;
  crmModifiable: boolean;
};

const COLONNES_BIEN = "id, libelle, ville, quartier, adresse, residence, type_logement, chambres, surface, capacite, standing, salles_de_bain, equipements, parking, terrasse, piscine, salle_sport, ameublement, photos, exploitation, occupation, loyer_longue_duree, revenus_courte_mensuels, attentes, lien_annonce";

function bienDepuisLigne(b: Record<string, unknown>): Bien & { id: string } {
  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return { ...(b as unknown as Bien & { id: string }), loyer_longue_duree: n(b.loyer_longue_duree), revenus_courte_mensuels: n(b.revenus_courte_mensuels), photos: Array.isArray(b.photos) ? (b.photos as string[]) : [], equipements: (b.equipements as string[]) ?? [] };
}

export async function chargerLead(leadId: string): Promise<Retour<{ lead: LeadComplet }>> {
  const u = await droitEstimateur("voir");
  if (!u) return { erreur: "Accès refusé." };
  if (!UUID.test(leadId)) return { erreur: "Prospect introuvable." };
  const supabase = await createClient();
  const { data: l } = await supabase.from("crm_leads").select("id, nom, telephone, email, ville, type_bien, source, etape, notes, responsable_id").eq("id", leadId).maybeSingle();
  if (!l) return { erreur: "Prospect introuvable (ou droit CRM manquant)." };
  const [{ data: biens }, { count }, { data: resp }] = await Promise.all([
    supabase.from("crm_biens").select(COLONNES_BIEN).eq("lead_id", leadId).order("created_at"),
    supabase.from("estimations").select("id", { count: "exact", head: true }).eq("lead_id", leadId),
    l.responsable_id ? supabase.from("profiles").select("id, prenom, nom").eq("id", l.responsable_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return {
    lead: {
      id: l.id, nom: l.nom, telephone: l.telephone, email: l.email, ville: l.ville, type_bien: l.type_bien, source: l.source, etape: l.etape, notes: l.notes,
      responsable: resp ? { id: resp.id, nom: `${resp.prenom} ${resp.nom}`.trim() } : null,
      biens: (biens ?? []).map((b) => bienDepuisLigne(b)),
      estimations: count ?? 0,
      crmModifiable: peutModifier(u, "crm"),
    },
  };
}

/** Création explicite d'un prospect dans le CRM (étape « nouveau », jamais modifiée ensuite par l'estimateur). */
export async function creerLead(p: { nom: string; telephone: string; email: string; ville: string }): Promise<Retour<{ leadId: string }>> {
  const u = await getUtilisateur();
  if (!u || !u.actif || u.type !== "equipe" || !peutModifier(u, "crm")) return { erreur: "Le droit « CRM – modifier » est nécessaire pour créer un prospect." };
  const nom = p.nom.trim().slice(0, 120);
  if (!nom) return { erreur: "Indiquez le nom du propriétaire." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_leads")
    .insert({ nom, telephone: p.telephone.trim().slice(0, 40), email: p.email.trim().slice(0, 120), ville: p.ville.trim().slice(0, 80), source: "manuel", created_by: u.id, responsable_id: u.id })
    .select("id")
    .single();
  if (error || !data) return { erreur: "Le prospect n'a pas pu être créé." };
  revalidatePath("/crm");
  return { leadId: data.id as string };
}

/** Mise à jour EXPLICITE de la fiche logement du CRM (jamais automatique). */
export async function enregistrerBien(leadId: string, bienId: string | null, bien: Bien): Promise<Retour<{ bienId: string }>> {
  const u = await getUtilisateur();
  if (!u || !u.actif || u.type !== "equipe" || !peutModifier(u, "crm")) return { erreur: "Le droit « CRM – modifier » est nécessaire pour mettre à jour la fiche." };
  if (!UUID.test(leadId) || (bienId !== null && !UUID.test(bienId))) return { erreur: "Fiche introuvable." };
  const b = SchemaBien.safeParse(bien);
  if (!b.success) return { erreur: `Logement : ${b.error.issues[0]?.path.join(".")} — ${b.error.issues[0]?.message}` };
  const supabase = await createClient();
  if (bienId) {
    const { data } = await supabase.from("crm_biens").update(b.data).eq("id", bienId).eq("lead_id", leadId).select("id");
    if (!data?.length) return { erreur: "Logement introuvable." };
  } else {
    const { data, error } = await supabase.from("crm_biens").insert({ ...b.data, lead_id: leadId, created_by: u.id }).select("id").single();
    if (error || !data) return { erreur: "Le logement n'a pas pu être ajouté à la fiche." };
    bienId = data.id as string;
  }
  revalidatePath(`/crm/${leadId}`);
  return { bienId: bienId! };
}

/* ------------------------------ Données de marché ------------------------------ */

export type VersionAffichee = {
  version: LigneVersion;
  segment: { id: string; quartier: string; ville: string; typologie: string; standing: string | null; capacite: number | null };
  comparables: (LigneComparable & { photoUrl: string })[];
};
export type CandidatAffiche = Omit<Candidat, "segment"> & { segmentId: string; versionId: string; libelle: string };

const afficherCandidat = (c: Candidat, noms: Map<string, string>): CandidatAffiche => ({
  correspondance: c.correspondance, ecarts: c.ecarts, fraicheur: c.fraicheur, score: c.score,
  segmentId: c.segment.id, versionId: c.segment.version!.id,
  libelle: `${noms.get(c.segment.quartierId) ?? "?"} · ${typologie(c.segment.type, c.segment.chambres, c.segment.chambresMax)}${c.segment.standing ? ` · ${c.segment.standing}` : ""}${c.segment.capacite ? ` · ${c.segment.capacite} voy.` : ""}`,
});

export async function chercherDonneesMarche(bien: Pick<Bien, "ville" | "quartier" | "type_logement" | "chambres" | "capacite" | "standing">): Promise<Retour<{ recherche: Omit<ResultatRecherche, "choix" | "autresExacts" | "alternatives"> & { choix: CandidatAffiche | null; autresExacts: CandidatAffiche[]; alternatives: CandidatAffiche[] } }>> {
  const u = await droitEstimateur("voir");
  if (!u) return { erreur: "Accès refusé." };
  const lu = SchemaBien.pick({ ville: true, quartier: true, type_logement: true, chambres: true, capacite: true, standing: true }).safeParse(bien);
  if (!lu.success) return { erreur: "Informations du logement invalides." };
  bien = lu.data;
  const supabase = await createClient();
  const [ref, params] = await Promise.all([chargerReferentiel(supabase), chargerParametres(supabase)]);
  const type = bien.type_logement === "studio" ? "studio" : bien.type_logement;
  const r = chercherMarche({ ville: bien.ville, quartier: bien.quartier, type, chambres: bien.chambres, capacite: bien.capacite, standing: bien.standing }, ref.segments, ref.quartiers, ref.alias, {
    aujourdhui: aujourdhui(),
    seuils: { recente: params.donnees.fraicheurRecente, alerte: params.donnees.fraicheurAlerte },
    standingObligatoire: params.donnees.standingObligatoire,
    toleranceCapacite: params.donnees.toleranceCapacite,
  });
  const noms = new Map(ref.quartiers.map((q) => [q.id, q.nom]));
  return { recherche: { ...r, choix: r.choix ? afficherCandidat(r.choix, noms) : null, autresExacts: r.autresExacts.map((c) => afficherCandidat(c, noms)), alternatives: r.alternatives.slice(0, 6).map((c) => afficherCandidat(c, noms)) } };
}

async function lireVersion(supabase: Awaited<ReturnType<typeof createClient>>, versionId: string): Promise<VersionAffichee | null> {
  const { data: v } = await supabase.from("marche_versions").select(COLONNES_VERSION).eq("id", versionId).maybeSingle();
  if (!v) return null;
  const version = normaliserVersion(v);
  const [{ data: s }, { data: comp }] = await Promise.all([
    supabase.from("marche_segments").select("id, type_logement, chambres, chambres_max, standing, capacite, statut, marche_quartiers(nom, ville)").eq("id", version.segment_id).maybeSingle(),
    supabase.from("marche_comparables").select(COLONNES_COMPARABLE).eq("version_id", versionId).eq("affichable", true).order("ordre"),
  ]);
  if (!s) return null;
  const q = s.marche_quartiers as unknown as { nom: string; ville: string } | null;
  const comparables = (comp ?? []).map((c) => normaliserComparable(c as Record<string, unknown>));
  const urls = await urlsLecture(BUCKET_MARCHE, comparables.map((c) => c.photo_chemin).filter(Boolean));
  return {
    version,
    segment: { id: s.id, quartier: q?.nom ?? "", ville: q?.ville ?? "", typologie: typologie(s.type_logement, s.chambres, s.chambres_max), standing: s.standing, capacite: s.capacite },
    comparables: comparables.map((c) => ({ ...c, photoUrl: c.photo_chemin ? (urls.get(c.photo_chemin) ?? "") : "" })),
  };
}

export async function chargerVersionMarche(versionId: string): Promise<Retour<{ donnees: VersionAffichee }>> {
  const u = await droitEstimateur("voir");
  if (!u) return { erreur: "Accès refusé." };
  if (!UUID.test(versionId)) return { erreur: "Version introuvable." };
  const supabase = await createClient();
  const d = await lireVersion(supabase, versionId);
  if (!d) return { erreur: "Version introuvable." };
  if (d.version.statut === "archivee") return { erreur: "Cette version est archivée : choisissez une version validée." };
  return { donnees: d };
}

/* ------------------------------ Enregistrement ------------------------------ */

export type ActionEstimation = "brouillon" | "soumettre" | "valider";

/**
 * Construit l'instantané côté serveur : données de marché, paramètres, offre, comparables et témoignages relus en base,
 * calcul refait. Une estimation validée n'est plus modifiable (contrôlé aussi par la base).
 */
export async function enregistrerEstimation(saisieBrute: Saisie, action: ActionEstimation, existanteId?: string | null, racineId?: string | null): Promise<Retour<{ id: string }> | { confirmation: string }> {
  const u = await droitEstimateur("modifier");
  if (!u) return { erreur: "Vous n'avez pas le droit de créer des estimations." };
  const parse = SchemaSaisie.safeParse(saisieBrute);
  if (!parse.success) return { erreur: `${parse.error.issues[0]?.message} (${parse.error.issues[0]?.path.join(".")})` };
  const s = parse.data;
  const supabase = await createClient();

  // Prospect et logement : lus en base (droit CRM requis par la RLS)
  const { data: lead } = await supabase.from("crm_leads").select("id, responsable_id").eq("id", s.leadId).maybeSingle();
  if (!lead) return { erreur: "Prospect introuvable : sélectionnez-le dans le CRM." };
  if (s.bienId) {
    const { data: b } = await supabase.from("crm_biens").select("id").eq("id", s.bienId).eq("lead_id", s.leadId).maybeSingle();
    if (!b) return { erreur: "Ce logement n'appartient pas à ce prospect." };
  }

  const params = await chargerParametres(supabase);
  const financier = { ...params.financier };
  const personnalises: string[] = [];
  if (s.surcharges.tauxPlateforme !== null && s.surcharges.tauxPlateforme !== financier.tauxPlateforme) {
    financier.tauxPlateforme = s.surcharges.tauxPlateforme;
    personnalises.push("frais de plateforme");
  }
  if (s.surcharges.tauxCommission !== null && s.surcharges.tauxCommission !== financier.tauxCommission) {
    financier.tauxCommission = s.surcharges.tauxCommission;
    personnalises.push("commission");
  }
  if (s.surcharges.tvaCommission !== null && s.surcharges.tvaCommission !== financier.tvaCommission) {
    financier.tvaCommission = s.surcharges.tvaCommission;
    personnalises.push("TVA sur la commission");
  }
  if (s.surcharges.methodeScenarios !== null && s.surcharges.methodeScenarios !== financier.methodeScenarios) {
    financier.methodeScenarios = s.surcharges.methodeScenarios;
    personnalises.push("méthode des scénarios");
  }

  // Données de marché : version relue, correspondance vérifiée côté serveur
  let marche: Snapshot["marche"] | null = null;
  let comparables: ComparableFige[] = [];
  if (s.versionId) {
    const v = await lireVersion(supabase, s.versionId);
    if (!v || v.version.statut === "archivee") return { erreur: "Données de marché introuvables ou archivées : relancez la recherche." };
    const r = await chercherDonneesMarche(s.bien);
    if (r.erreur !== undefined) return { erreur: r.erreur };
    const exact = [r.recherche.choix, ...r.recherche.autresExacts].find((c) => c?.versionId === s.versionId || c?.segmentId === v.segment.id);
    const correspondance = exact?.correspondance ?? "approximation";
    const ecarts = exact ? exact.ecarts : (r.recherche.alternatives.find((c) => c.segmentId === v.segment.id)?.ecarts ?? ["segment choisi manuellement"]);
    if (correspondance === "approximation" && !s.approximationConfirmee) return { erreur: "Ces données ne correspondent pas exactement au logement : confirmez explicitement l'approximation." };
    const ver = v.version;
    marche = {
      segmentId: v.segment.id, versionId: ver.id, numero: ver.numero, source: ver.source, quartier: v.segment.quartier, ville: v.segment.ville, typologie: v.segment.typologie,
      correspondance, ecarts, periodeDebut: ver.periode_debut, periodeFin: ver.periode_fin, typePeriode: ver.type_periode, dateImport: ver.date_import, devise: ver.devise,
      echantillon: ver.echantillon, adr: ver.adr, occupation: ver.occupation, nuitsReservees: ver.nuits_reservees, revenuBas: ver.revenu_annuel_bas, revenuCentral: ver.revenu_annuel_central,
      revenuHaut: ver.revenu_annuel_haut, natureCentral: ver.central_nature, percentiles: ver.percentiles ?? [], mensuels: ver.mensuels ?? [],
      base: { plateformeIncluse: ver.base_plateforme_incluse, menageInclus: ver.base_menage_inclus, taxesIncluses: ver.base_taxes_incluses, definition: ver.definition_source },
    };
    comparables = s.comparableIds
      .map((id) => v.comparables.find((c) => c.id === id))
      .filter((c): c is VersionAffichee["comparables"][number] => Boolean(c))
      .slice(0, params.document.maxComparables)
      .map((c) => ({ nom: c.nom, quartier: c.quartier || v.segment.quartier, typologie: c.chambres !== null ? `${c.chambres === 0 ? "Studio" : `${c.chambres} ch.`}` : c.type_logement, revenuAnnuel: c.revenu_annuel, revenuBas: c.revenu_annuel_bas, revenuHaut: c.revenu_annuel_haut, adr: c.adr, occupation: c.occupation, url: c.url, photo: c.photo_chemin }));
    if (comparables.length !== s.comparableIds.length) return { erreur: "Une annonce comparable choisie n'est plus disponible : vérifiez la sélection." };
  } else if (action !== "brouillon") return { erreur: "Choisissez les données de marché avant de valider." };

  // Offre et témoignages : uniquement actifs / vérifiés
  let offre: Snapshot["offre"] = null;
  if (s.offreId) {
    const { data: o } = await supabase.from("estimateur_offres").select("titre, description, duree_mois, conditions, debut, fin, actif").eq("id", s.offreId).maybeSingle();
    const jourJ = aujourdhui();
    if (!o || !o.actif || (o.debut && o.debut > jourJ) || (o.fin && o.fin < jourJ)) return { erreur: "L'offre choisie n'est pas active aujourd'hui." };
    offre = { titre: o.titre, description: o.description, dureeMois: o.duree_mois, conditions: o.conditions };
  }
  let temoignages: Snapshot["temoignages"] = [];
  if (s.temoignageIds.length) {
    const { data: t } = await supabase.from("estimateur_temoignages").select("id, auteur, contexte, texte, verifie, actif").in("id", s.temoignageIds);
    if ((t ?? []).some((x) => !x.verifie || !x.actif) || (t ?? []).length !== s.temoignageIds.length) return { erreur: "Seuls les témoignages vérifiés et actifs peuvent être utilisés." };
    temoignages = (t ?? []).map((x) => ({ auteur: x.auteur, contexte: x.contexte, texte: x.texte }));
  }

  const charges: Charges = s.charges;
  const longueDuree: LongueDuree = s.longueDuree;
  const resultat = calculer({
    params: financier,
    marche: marche
      ? { revenuAnnuelBas: marche.revenuBas, revenuAnnuelCentral: marche.revenuCentral, revenuAnnuelHaut: marche.revenuHaut, natureCentral: marche.natureCentral as never, percentiles: marche.percentiles, basePlateformeIncluse: marche.base.plateformeIncluse, baseMenageInclus: marche.base.menageInclus, baseTaxesIncluses: marche.base.taxesIncluses, devise: marche.devise }
      : { revenuAnnuelBas: null, revenuAnnuelCentral: null, revenuAnnuelHaut: null, natureCentral: "inconnu", percentiles: [], basePlateformeIncluse: null, baseMenageInclus: null, baseTaxesIncluses: null, devise: financier.devise },
    charges,
    longueDuree,
    offre,
    baseConfirmee: s.baseConfirmee,
  });
  if (action !== "brouillon" && resultat.bloquants.length) return { erreur: resultat.bloquants.join(" ") };

  const commercialId = s.commercialId ?? lead.responsable_id ?? u.id;
  const { data: com } = await supabase.from("profiles").select("prenom, nom").eq("id", commercialId).maybeSingle();

  const snapshot: Snapshot = {
    version: 2,
    creeLe: new Date().toISOString(),
    saisie: s,
    proprietaire: { prenom: s.prenom, leadId: s.leadId },
    commercial: com ? { nom: `${com.prenom} ${com.nom}`.trim(), telephone: "" } : null,
    bien: s.bien,
    marche,
    params: { ...financier, personnalises },
    charges,
    longueDuree,
    offre,
    baseConfirmee: s.baseConfirmee,
    resultat,
    comparables,
    recommandations: s.recommandations,
    temoignages,
    photoBien: s.photoBien,
    sections: {
      saisonnalite: s.sections.saisonnalite && params.document.sectionSaisonnalite && Boolean(marche && saisonnaliteFiable(marche.mensuels)),
      comparaisonLongueDuree: s.sections.comparaisonLongueDuree && resultat.comparaison !== null,
      preuve: params.document.sectionPreuve,
      qrCode: params.document.qrCode,
    },
    commercialParams: { ...params.commercial, mentionsLegales: params.document.mentionsLegales, validiteJours: params.document.validiteJours },
  };

  const prudent = resultat.scenarios.find((x) => x.cle === "prudent") ?? resultat.scenarios[0];
  const haut = resultat.scenarios.find((x) => x.cle === "haut") ?? resultat.scenarios.at(-1);
  const statut = action === "valider" ? "validee" : action === "soumettre" ? "a_valider" : "brouillon";
  const ligne = {
    prenom: s.prenom,
    telephone: "",
    ville: s.bien.ville || "Casablanca",
    quartier: s.bien.quartier || "—",
    type_bien: typeBienHerite(s.bien.type_logement, s.bien.chambres),
    piscine: Boolean(s.bien.piscine),
    capacite: s.bien.capacite,
    standing: s.bien.standing,
    brut_bas: prudent?.brut ?? null,
    brut_haut: haut?.brut ?? null,
    net_bas: prudent?.apresCommissions ?? null,
    net_haut: haut?.apresCommissions ?? null,
    photos: s.photoBien ? [s.photoBien] : [],
    comparables: [],
    conseils: s.recommandations,
    lead_id: s.leadId,
    bien_id: s.bienId,
    statut,
    modele_document: "v2",
    segment_version_id: marche?.versionId ?? null,
    snapshot,
    duree_creation_s: s.dureeCreationS,
    validee_le: action === "valider" ? new Date().toISOString() : null,
  };

  let id = existanteId ?? null;
  if (id) {
    if (!UUID.test(id)) return { erreur: "Estimation introuvable." };
    const { data: avant } = await supabase.from("estimations").select("statut").eq("id", id).maybeSingle();
    if (!avant) return { erreur: "Estimation introuvable." };
    if (!["brouillon", "a_valider"].includes(avant.statut)) return { erreur: "Cette estimation est validée : créez une nouvelle version." };
    const { error } = await supabase.from("estimations").update(ligne).eq("id", id);
    if (error) return { erreur: "L'estimation n'a pas pu être enregistrée." };
  } else {
    let numero = 1;
    let racine: string | null = null;
    if (racineId && UUID.test(racineId)) {
      const { data: r } = await supabase.from("estimations").select("id, racine_id").eq("id", racineId).maybeSingle();
      racine = (r?.racine_id as string | null) ?? r?.id ?? null;
      if (racine) {
        const { data: soeurs } = await supabase.from("estimations").select("numero_version").or(`id.eq.${racine},racine_id.eq.${racine}`);
        numero = Math.max(1, ...(soeurs ?? []).map((x) => x.numero_version as number)) + 1;
      }
    }
    const { data, error } = await supabase.from("estimations").insert({ ...ligne, created_by: u.id, racine_id: racine, numero_version: numero }).select("id").single();
    if (error || !data) return { erreur: "L'estimation n'a pas pu être enregistrée." };
    id = data.id as string;
    await supabase.from("estimation_evenements").insert({ estimation_id: id, lead_id: s.leadId, type: racine ? "nouvelle_version" : "creee", auteur_id: u.id, detail: racine ? `Version ${numero}` : "" });
  }
  if (action === "soumettre") await supabase.from("estimation_evenements").insert({ estimation_id: id, lead_id: s.leadId, type: "soumise", auteur_id: u.id });
  if (action === "valider") await supabase.from("estimation_evenements").insert({ estimation_id: id, lead_id: s.leadId, type: "validee", auteur_id: u.id });

  revalidatePath("/estimateur", "layout");
  revalidatePath(`/crm/${s.leadId}`);
  return { id: id! };
}

/** Valide une estimation soumise (sans la modifier). */
export async function validerEstimation(id: string): Promise<Retour> {
  const u = await droitEstimateur("modifier");
  if (!u) return { erreur: "Accès refusé." };
  if (!UUID.test(id)) return { erreur: "Estimation introuvable." };
  const supabase = await createClient();
  const { data: e } = await supabase.from("estimations").select("statut, lead_id, snapshot").eq("id", id).maybeSingle();
  if (!e) return { erreur: "Estimation introuvable." };
  if (e.statut !== "a_valider" && e.statut !== "brouillon") return { erreur: "Cette estimation est déjà validée." };
  const snap = e.snapshot as Snapshot | null;
  if (!snap?.marche || snap.resultat?.bloquants?.length) return { erreur: "Estimation incomplète : ouvrez-la pour la compléter avant de la valider." };
  const { error } = await supabase.from("estimations").update({ statut: "validee", validee_le: new Date().toISOString() }).eq("id", id);
  if (error) return { erreur: "La validation a échoué." };
  await supabase.from("estimation_evenements").insert({ estimation_id: id, lead_id: e.lead_id, type: "validee", auteur_id: u.id });
  revalidatePath("/estimateur", "layout");
  return {};
}

/** « Envoyée » est une action explicite : télécharger ou ouvrir WhatsApp ne suffit pas. */
export async function marquerEnvoyee(id: string, canal: string): Promise<Retour> {
  const u = await droitEstimateur("modifier");
  if (!u) return { erreur: "Accès refusé." };
  if (!UUID.test(id)) return { erreur: "Estimation introuvable." };
  const supabase = await createClient();
  const { data: e } = await supabase.from("estimations").select("statut, lead_id").eq("id", id).maybeSingle();
  if (!e) return { erreur: "Estimation introuvable." };
  if (e.statut !== "validee") return { erreur: e.statut === "envoyee" ? "Déjà marquée comme envoyée." : "Validez l'estimation avant de l'envoyer." };
  const { error } = await supabase.from("estimations").update({ statut: "envoyee", envoyee_le: new Date().toISOString() }).eq("id", id);
  if (error) return { erreur: "Le statut n'a pas pu être modifié." };
  await supabase.from("estimation_evenements").insert({ estimation_id: id, lead_id: e.lead_id, type: "envoyee", auteur_id: u.id, detail: canal.slice(0, 60) });
  revalidatePath("/estimateur", "layout");
  if (e.lead_id) revalidatePath(`/crm/${e.lead_id}`);
  return {};
}

export async function archiverEstimation(id: string): Promise<Retour> {
  const u = await droitEstimateur("modifier");
  if (!u) return { erreur: "Accès refusé." };
  if (!UUID.test(id)) return { erreur: "Estimation introuvable." };
  const supabase = await createClient();
  const { data: e } = await supabase.from("estimations").select("statut, lead_id").eq("id", id).maybeSingle();
  if (!e) return { erreur: "Estimation introuvable." };
  if (e.statut === "archivee") return {};
  const { error } = await supabase.from("estimations").update({ statut: "archivee", archivee_le: new Date().toISOString() }).eq("id", id);
  if (error) return { erreur: "L'archivage a échoué." };
  await supabase.from("estimation_evenements").insert({ estimation_id: id, lead_id: e.lead_id, type: "archivee", auteur_id: u.id });
  revalidatePath("/estimateur", "layout");
  return {};
}

/** Supprime un brouillon (administrateur) : les estimations validées, envoyées ou archivées sont conservées. */
export async function supprimerBrouillon(id: string): Promise<Retour> {
  const u = await droitEstimateur("modifier");
  if (!u?.admin) return { erreur: "Seul un administrateur peut supprimer un brouillon." };
  if (!UUID.test(id)) return { erreur: "Estimation introuvable." };
  const supabase = await createClient();
  const { data } = await supabase.from("estimations").delete().eq("id", id).eq("statut", "brouillon").select("id");
  if (!data?.length) return { erreur: "Seuls les brouillons peuvent être supprimés." };
  revalidatePath("/estimateur", "layout");
  return {};
}

/** Trace la duplication d'une estimation dans l'historique. */
export async function journaliserDuplication(sourceId: string, nouvelleId: string): Promise<void> {
  const u = await droitEstimateur("modifier");
  if (!u || !UUID.test(sourceId) || !UUID.test(nouvelleId)) return;
  const supabase = await createClient();
  const { data: e } = await supabase.from("estimations").select("lead_id").eq("id", nouvelleId).maybeSingle();
  await supabase.from("estimation_evenements").insert({ estimation_id: nouvelleId, lead_id: e?.lead_id ?? null, type: "dupliquee", auteur_id: u.id, detail: `Copie de ${sourceId}` });
}

/** Adresses temporaires des photos de logement (stockage privé « estimations »). */
export async function lirePhotosBien(chemins: string[]): Promise<Record<string, string>> {
  const u = await droitEstimateur("voir");
  if (!u) return {};
  const valides = chemins.filter((c) => /^photos\/[0-9a-f-]{36}-[A-Za-z0-9._-]{1,80}$/.test(c)).slice(0, 12);
  const urls = await urlsLecture("estimations", valides);
  return Object.fromEntries(urls);
}
