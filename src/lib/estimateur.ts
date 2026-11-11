/*
  Estimateur de revenus pour un bien prospect (Casablanca).
  Les revenus bruts viennent d'annonces Airbnb comparables (relevées sur PriceLabs Estimator Pro).
  Net propriétaire = Brut × 0,82 (frais plateforme et TVA, ≈ −18 %) × 0,80 (commission Perfect Stay 20 %).
*/

export const VILLES = ["Casablanca"] as const;

export const QUARTIERS = ["Casa Finance City (CFC)", "Ferme Bretonne", "Maarif", "Les Princesses", "Bourgogne", "Ain Diab", "Autre quartier"] as const;

export const TYPES_BIEN = [
  { value: "studio_1ch", label: "Studio ou 1 chambre" },
  { value: "2ch", label: "2 chambres" },
  { value: "3ch_plus", label: "3 chambres et plus" },
  { value: "villa", label: "Villa" },
] as const;
export type TypeBien = (typeof TYPES_BIEN)[number]["value"];

export const STANDINGS = [
  { value: "standard", label: "Standard" },
  { value: "superieur", label: "Supérieur" },
  { value: "premium", label: "Premium" },
] as const;
export type Standing = (typeof STANDINGS)[number]["value"];

/** Conseils proposés (cochables) pour atteindre le haut de la fourchette */
export const CONSEILS = [
  { id: "coussins", texte: "Des coussins colorés pour réchauffer le salon" },
  { id: "deco", texte: "Une décoration murale soignée (cadres, miroirs)" },
  { id: "table", texte: "Une table basse design" },
  { id: "linge", texte: "Du linge de lit blanc de qualité hôtelière" },
  { id: "eclairage", texte: "Un éclairage chaud et tamisé" },
  { id: "photos", texte: "Des photos professionnelles de l'annonce" },
  { id: "plantes", texte: "Des plantes vertes" },
  { id: "cafe", texte: "Une machine à café" },
  { id: "tv", texte: "Une smart TV et le wifi fibre" },
] as const;

export const MAX_CONSEILS = 5;
export const BUCKET_ESTIMATIONS = "estimations";
export const MAX_PHOTOS = 4;
export const MAX_COMPARABLES = 4;

/** Frais plateforme (15,5 %) et TVA : on garde 82 % du brut */
export const PART_APRES_PLATEFORME = 0.82;
/** Commission Perfect Stay de 20 % : le propriétaire garde 80 % */
export const PART_APRES_COMMISSION = 0.8;

export const libelleType = (v: string) => TYPES_BIEN.find((t) => t.value === v)?.label ?? v;
export const libelleStanding = (v: string) => STANDINGS.find((s) => s.value === v)?.label ?? v;

export type Comparable = { titre: string; quartier: string; chambres: number; brutBas: number; brutHaut: number; photo?: string | null };

const arrondi = (n: number) => Math.round(n);

/** Moyenne des revenus bruts annuels bas et hauts des annonces comparables valides. */
export function brutMoyen(comparables: Pick<Comparable, "brutBas" | "brutHaut">[]): { bas: number; haut: number } | null {
  const valides = comparables.filter((c) => c.brutBas > 0 && c.brutHaut > 0);
  if (!valides.length) return null;
  const somme = (f: (c: (typeof valides)[number]) => number) => valides.reduce((s, c) => s + f(c), 0);
  return { bas: arrondi(somme((c) => c.brutBas) / valides.length), haut: arrondi(somme((c) => c.brutHaut) / valides.length) };
}

/** Net propriétaire annuel à partir d'un brut annuel. */
export const netDepuisBrut = (brut: number) => arrondi(brut * PART_APRES_PLATEFORME * PART_APRES_COMMISSION);

/** Brut annuel correspondant à un net (utile quand Amine ajuste la fourchette nette à la main). */
export const brutDepuisNet = (net: number) => arrondi(net / (PART_APRES_PLATEFORME * PART_APRES_COMMISSION));

/** Arrondi commercial pour le document : à la centaine de dirhams. */
export const arrondiCentaine = (n: number) => Math.round(n / 100) * 100;

export const parMois = (annuel: number) => arrondiCentaine(annuel / 12);

/** Les trois étapes du calcul, pour le détail transparent du PDF. */
export function detailCalcul(brut: number) {
  const apresPlateforme = arrondi(brut * PART_APRES_PLATEFORME);
  const net = arrondi(apresPlateforme * PART_APRES_COMMISSION);
  return { brut, fraisPlateforme: brut - apresPlateforme, apresPlateforme, commission: apresPlateforme - net, net };
}

/** « 12 500 » : montant en dirhams sans décimales, séparateur d'espace fine */
export function formatMad0(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n).replace(/\s/g, " ");
}
