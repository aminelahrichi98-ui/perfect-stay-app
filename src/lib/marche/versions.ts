/*
  Versions de données de marché : détection des doublons et comparaison entre deux versions.
  Une version validée n'est jamais modifiée : on en crée une nouvelle.
*/
import type { DonneesMarche } from "./schema.ts";

export type ResumeVersion = {
  numero: number;
  periode_debut: string | null;
  periode_fin: string | null;
  devise: string;
  revenu_annuel_bas: number | null;
  revenu_annuel_central: number | null;
  revenu_annuel_haut: number | null;
  adr: number | null;
  occupation: number | null;
  nuits_reservees: number | null;
  echantillon: number | null;
};

const CHIFFRES = ["revenu_annuel_bas", "revenu_annuel_central", "revenu_annuel_haut", "adr", "occupation", "nuits_reservees", "echantillon"] as const;

export const LIBELLES_COMPARAISON: Record<(typeof CHIFFRES)[number] | "periode" | "devise", string> = {
  periode: "Période analysée",
  devise: "Devise",
  revenu_annuel_bas: "Revenu annuel bas",
  revenu_annuel_central: "Revenu annuel central",
  revenu_annuel_haut: "Revenu annuel haut",
  adr: "Prix moyen par nuit",
  occupation: "Taux d'occupation (%)",
  nuits_reservees: "Nuits réservées",
  echantillon: "Logements analysés",
};

const egal = (a: number | null, b: number | null) => (a === null || b === null ? a === b : Math.abs(a - b) < 0.005);

/**
 * « doublon » : mêmes période et mêmes chiffres qu'une version existante (rien à créer) ;
 * « meme_periode » : même période mais chiffres différents (une confirmation est demandée) ;
 * null : rien de particulier.
 */
export function verifierDoublon(d: DonneesMarche, existantes: ResumeVersion[]): { type: "doublon" | "meme_periode"; numero: number } | null {
  const memePeriode = existantes.filter((v) => v.periode_debut === d.periode.debut && v.periode_fin === d.periode.fin && (d.periode.debut !== null || d.periode.fin !== null));
  for (const v of memePeriode) {
    if (v.devise === (d.devise ?? "") && CHIFFRES.every((c) => egal(v[c], d.metriques[c]))) return { type: "doublon", numero: v.numero };
  }
  return memePeriode.length ? { type: "meme_periode", numero: memePeriode[0].numero } : null;
}

export type Difference = { champ: string; libelle: string; avant: string | number | null; apres: string | number | null; ecart: number | null };

/** Différences entre deux versions (b par rapport à a), écart en % pour les chiffres. */
export function comparerVersions(a: ResumeVersion, b: ResumeVersion): Difference[] {
  const r: Difference[] = [];
  const pa = `${a.periode_debut ?? "?"} → ${a.periode_fin ?? "?"}`;
  const pb = `${b.periode_debut ?? "?"} → ${b.periode_fin ?? "?"}`;
  if (pa !== pb) r.push({ champ: "periode", libelle: LIBELLES_COMPARAISON.periode, avant: pa, apres: pb, ecart: null });
  if (a.devise !== b.devise) r.push({ champ: "devise", libelle: LIBELLES_COMPARAISON.devise, avant: a.devise, apres: b.devise, ecart: null });
  for (const c of CHIFFRES) {
    if (egal(a[c], b[c])) continue;
    const ecart = a[c] !== null && b[c] !== null && a[c] !== 0 ? ((b[c]! - a[c]!) / a[c]!) * 100 : null;
    r.push({ champ: c, libelle: LIBELLES_COMPARAISON[c], avant: a[c], apres: b[c], ecart });
  }
  return r;
}
