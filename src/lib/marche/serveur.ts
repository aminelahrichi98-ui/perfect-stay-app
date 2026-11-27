import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COLONNES_PARAMETRES, parametresDepuisLigne, type ParametresEstimateur } from "@/lib/estimation/parametres";
import type { AliasRef, QuartierRef, SegmentRef } from "./matching";
import { donneesVides, type ComparableMarche, type DonneesMarche, type Standing, type TypeSegment } from "./schema";

export const BUCKET_MARCHE = "marche";

export async function chargerParametres(supabase: SupabaseClient): Promise<ParametresEstimateur> {
  const { data } = await supabase.from("estimateur_parametres").select(COLONNES_PARAMETRES).maybeSingle();
  return parametresDepuisLigne(data as Record<string, unknown> | null);
}

export const COLONNES_VERSION =
  "id, segment_id, numero, active, statut, source, import_id, periode_debut, periode_fin, type_periode, devise, base_plateforme_incluse, base_menage_inclus, base_taxes_incluses, definition_source, revenu_annuel_bas, revenu_annuel_central, revenu_annuel_haut, central_derive, central_nature, adr, occupation, nuits_reservees, echantillon, revenu_mensuel_moyen, percentiles, mensuels, parametres_recherche, autres_metriques, infos_frais, preuves, avertissements, derives, notes, date_import, validee_par, validee_le";

export const COLONNES_COMPARABLE =
  "id, version_id, ordre, nom, quartier, type_logement, chambres, capacite, revenu_annuel, revenu_annuel_bas, revenu_annuel_haut, adr, occupation, note, nb_avis, equipements, url, identifiant, photo_chemin, capture_id, affichable";

export type LigneVersion = {
  id: string; segment_id: string; numero: number; active: boolean; statut: string; source: string; import_id: string | null;
  periode_debut: string | null; periode_fin: string | null; type_periode: string; devise: string;
  base_plateforme_incluse: boolean | null; base_menage_inclus: boolean | null; base_taxes_incluses: boolean | null; definition_source: string;
  revenu_annuel_bas: number | null; revenu_annuel_central: number | null; revenu_annuel_haut: number | null; central_derive: boolean; central_nature: DonneesMarche["central_nature"];
  adr: number | null; occupation: number | null; nuits_reservees: number | null; echantillon: number | null; revenu_mensuel_moyen: number | null;
  percentiles: DonneesMarche["percentiles"]; mensuels: DonneesMarche["mensuels"]; parametres_recherche: DonneesMarche["parametres_recherche"];
  autres_metriques: DonneesMarche["autres"]; infos_frais: string; preuves: DonneesMarche["preuves"]; avertissements: string[]; derives: string[];
  notes: string; date_import: string; validee_par: string | null; validee_le: string;
};
export type LigneComparable = {
  id: string; version_id: string; ordre: number; nom: string; quartier: string; type_logement: string; chambres: number | null; capacite: number | null;
  revenu_annuel: number | null; revenu_annuel_bas: number | null; revenu_annuel_haut: number | null; adr: number | null; occupation: number | null;
  note: number | null; nb_avis: number | null; equipements: string[]; url: string; identifiant: string; photo_chemin: string; capture_id: string | null; affichable: boolean;
};
export type LigneSegment = { id: string; quartier_id: string; type_logement: TypeSegment; chambres: number; chambres_max: number | null; capacite: number | null; standing: Standing | null; statut: "actif" | "archive"; created_at: string };
export type LigneQuartier = { id: string; pays: string; ville: string; ville_cle: string; nom: string; cle: string; actif: boolean };

/** Les numeric de Postgres arrivent en texte : conversion en nombres (null conservé). */
export function nombreOuNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function normaliserVersion(v: Record<string, unknown>): LigneVersion {
  const champs = ["revenu_annuel_bas", "revenu_annuel_central", "revenu_annuel_haut", "adr", "occupation", "nuits_reservees", "echantillon", "revenu_mensuel_moyen"];
  const r = { ...v } as Record<string, unknown>;
  for (const c of champs) r[c] = nombreOuNull(v[c]);
  return r as LigneVersion;
}
export function normaliserComparable(c: Record<string, unknown>): LigneComparable {
  const r = { ...c } as Record<string, unknown>;
  for (const k of ["revenu_annuel", "revenu_annuel_bas", "revenu_annuel_haut", "adr", "occupation", "note"]) r[k] = nombreOuNull(c[k]);
  return r as LigneComparable;
}

/** Référentiel pour la recherche de données : quartiers, alias et segments avec leur version active. */
export async function chargerReferentiel(supabase: SupabaseClient): Promise<{ quartiers: QuartierRef[]; alias: AliasRef[]; segments: SegmentRef[] }> {
  const [q, a, s, v] = await Promise.all([
    supabase.from("marche_quartiers").select("id, ville, ville_cle, nom, cle").eq("actif", true),
    supabase.from("marche_alias").select("quartier_id, ville_cle, cle"),
    supabase.from("marche_segments").select("id, quartier_id, type_logement, chambres, chambres_max, capacite, standing, statut"),
    supabase.from("marche_versions").select("id, segment_id, numero, date_import, periode_debut, periode_fin").eq("active", true),
  ]);
  const versions = new Map((v.data ?? []).map((x) => [x.segment_id as string, x]));
  return {
    quartiers: (q.data ?? []).map((x) => ({ id: x.id, villeCle: x.ville_cle, cle: x.cle, nom: x.nom, ville: x.ville })),
    alias: (a.data ?? []).map((x) => ({ quartierId: x.quartier_id, villeCle: x.ville_cle, cle: x.cle })),
    segments: (s.data ?? []).map((x) => {
      const ver = versions.get(x.id);
      return {
        id: x.id,
        quartierId: x.quartier_id,
        type: x.type_logement,
        chambres: x.chambres,
        chambresMax: x.chambres_max,
        capacite: x.capacite,
        standing: x.standing,
        statut: x.statut,
        version: ver ? { id: ver.id, numero: ver.numero, dateImport: ver.date_import, periodeDebut: ver.periode_debut, periodeFin: ver.periode_fin } : null,
      };
    }),
  };
}

/** Une version validée, remise au format d'édition (pour « compléter » : la nouvelle version part de celle-ci). */
export function versionVersDonnees(v: LigneVersion, comparables: LigneComparable[], segment: LigneSegment, quartier: LigneQuartier): DonneesMarche {
  const d = donneesVides();
  d.segment = { pays: quartier.pays, ville: quartier.ville, quartier: quartier.nom, type_logement: segment.type_logement, chambres: segment.chambres, chambres_max: segment.chambres_max, capacite: segment.capacite, standing: segment.standing };
  d.periode = { debut: v.periode_debut, fin: v.periode_fin, type: v.type_periode };
  d.devise = v.devise;
  d.base = { plateforme_incluse: v.base_plateforme_incluse, menage_inclus: v.base_menage_inclus, taxes_incluses: v.base_taxes_incluses, definition: v.definition_source };
  d.metriques = {
    revenu_annuel_bas: v.revenu_annuel_bas,
    revenu_annuel_central: v.central_derive ? null : v.revenu_annuel_central,
    revenu_annuel_haut: v.revenu_annuel_haut,
    revenu_mensuel_moyen: v.revenu_mensuel_moyen,
    adr: v.adr,
    occupation: v.occupation,
    nuits_reservees: v.nuits_reservees,
    echantillon: v.echantillon,
  };
  d.central_nature = d.metriques.revenu_annuel_central === null ? "inconnu" : v.central_nature;
  d.percentiles = v.percentiles ?? [];
  d.mensuels = v.mensuels ?? [];
  d.parametres_recherche = v.parametres_recherche ?? [];
  d.autres = v.autres_metriques ?? [];
  d.infos_frais = v.infos_frais;
  d.preuves = v.preuves ?? [];
  d.comparables = comparables.map(
    (c): ComparableMarche => ({
      nom: c.nom, quartier: c.quartier, type_logement: c.type_logement, chambres: c.chambres, capacite: c.capacite, revenu_annuel: c.revenu_annuel,
      revenu_annuel_bas: c.revenu_annuel_bas, revenu_annuel_haut: c.revenu_annuel_haut, adr: c.adr, occupation: c.occupation, note: c.note, nb_avis: c.nb_avis,
      equipements: c.equipements ?? [], url: c.url, identifiant: c.identifiant, capture: null, affichable: c.affichable,
    }),
  );
  return d;
}
