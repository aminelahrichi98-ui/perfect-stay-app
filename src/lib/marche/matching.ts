/*
  Recherche des données de marché pour un logement : quartier (avec alias), typologie, chambres,
  puis standing et capacité pour affiner. Une approximation (autre quartier, autre nombre de
  chambres) n'est JAMAIS choisie automatiquement : elle est proposée et doit être confirmée.
*/
import { cle } from "./nombres.ts";
import type { Standing, TypeSegment } from "./schema.ts";

export type QuartierRef = { id: string; villeCle: string; cle: string; nom: string; ville: string };
export type AliasRef = { quartierId: string; villeCle: string; cle: string };

export type VersionRef = { id: string; numero: number; dateImport: string; periodeDebut: string | null; periodeFin: string | null };
export type SegmentRef = {
  id: string;
  quartierId: string;
  type: TypeSegment;
  chambres: number;
  chambresMax: number | null;
  capacite: number | null;
  standing: Standing | null;
  statut: "actif" | "archive";
  version: VersionRef | null; // version active validée
};

export type BienRecherche = { ville: string; quartier: string; type: string | null; chambres: number | null; capacite: number | null; standing: string | null };
export type Seuils = { recente: number; alerte: number };
export type Fraicheur = { jours: number; niveau: "recente" | "surveiller" | "actualiser" };

export type Candidat = {
  segment: SegmentRef;
  correspondance: "exacte" | "regroupement" | "approximation";
  ecarts: string[];
  fraicheur: Fraicheur | null;
  score: number;
};
export type ResultatRecherche = {
  statut: "trouve" | "incomplet" | "quartier_inconnu" | "aucune_donnee";
  quartierId: string | null;
  choix: Candidat | null;
  autresExacts: Candidat[];
  alternatives: Candidat[];
  manquants: string[];
  message: string;
};

/** Famille comparable : un studio est un appartement de 0 chambre. Duplex et penthouse restent des appartements. */
export function famille(type: string | null): { type: "appartement" | "villa" | "riad"; studio: boolean } | null {
  const c = cle(type ?? "");
  if (!c) return null;
  if (c === "studio") return { type: "appartement", studio: true };
  if (["appartement", "duplex", "penthouse"].includes(c)) return { type: "appartement", studio: false };
  if (c === "villa") return { type: "villa", studio: false };
  if (c === "riad") return { type: "riad", studio: false };
  return null;
}

/** Quartier canonique d'une ville, par son nom ou un alias validé. Jamais de rapprochement approximatif. */
export function resoudreQuartier(ville: string, quartier: string, quartiers: QuartierRef[], alias: AliasRef[]): QuartierRef | null {
  const v = cle(ville);
  const q = cle(quartier);
  if (!v || !q) return null;
  const direct = quartiers.find((x) => x.villeCle === v && x.cle === q);
  if (direct) return direct;
  const a = alias.find((x) => x.villeCle === v && x.cle === q);
  return a ? (quartiers.find((x) => x.id === a.quartierId) ?? null) : null;
}

export function fraicheur(dateIso: string, aujourdhui: string, seuils: Seuils): Fraicheur {
  const jours = Math.max(0, Math.floor((Date.parse(`${aujourdhui}T00:00:00Z`) - Date.parse(dateIso)) / 86400000));
  return { jours, niveau: jours <= seuils.recente ? "recente" : jours <= seuils.alerte ? "surveiller" : "actualiser" };
}

const BONUS_FRAICHEUR = { recente: 2, surveiller: 1, actualiser: 0 } as const;

export function chercherMarche(
  bien: BienRecherche,
  segments: SegmentRef[],
  quartiers: QuartierRef[],
  alias: AliasRef[],
  options: { aujourdhui: string; seuils: Seuils; standingObligatoire: boolean; toleranceCapacite: number },
): ResultatRecherche {
  const fam = famille(bien.type);
  const chambres = fam?.studio ? 0 : bien.chambres;
  const manquants = [!bien.ville && "ville", !bien.quartier && "quartier", !fam && "type de logement", chambres === null && "nombre de chambres"].filter(Boolean) as string[];
  const vide: ResultatRecherche = { statut: "incomplet", quartierId: null, choix: null, autresExacts: [], alternatives: [], manquants, message: "" };
  if (manquants.length) return { ...vide, message: `Informations manquantes pour chercher les données de marché : ${manquants.join(", ")}.` };

  const q = resoudreQuartier(bien.ville, bien.quartier, quartiers, alias);
  const villeCle = cle(bien.ville);
  const quartiersVille = new Set(quartiers.filter((x) => x.villeCle === villeCle).map((x) => x.id));
  const utilisables = segments.filter((s) => s.statut === "actif" && s.version);

  const evaluer = (s: SegmentRef, base: Candidat["correspondance"]): Candidat => {
    const ecarts: string[] = [];
    let score = 0;
    if (bien.standing && s.standing) {
      if (bien.standing === s.standing) score += 3;
      else ecarts.push(`standing ${s.standing} (logement : ${bien.standing})`);
    } else if (!s.standing) score += 1;
    if (bien.capacite && s.capacite) {
      if (Math.abs(bien.capacite - s.capacite) <= options.toleranceCapacite) score += 1;
      else ecarts.push(`capacité ${s.capacite} voyageurs (logement : ${bien.capacite})`);
    }
    const f = s.version ? fraicheur(s.version.dateImport, options.aujourdhui, options.seuils) : null;
    if (f) score += BONUS_FRAICHEUR[f.niveau];
    if (base === "regroupement") score -= 1;
    return { segment: s, correspondance: base, ecarts, fraicheur: f, score };
  };
  const trier = (l: Candidat[]) => l.sort((a, b) => b.score - a.score || (b.segment.version?.dateImport ?? "").localeCompare(a.segment.version?.dateImport ?? ""));
  const memeFamille = (s: SegmentRef) => (s.type === "studio" ? "appartement" : s.type) === fam!.type;
  const couvre = (s: SegmentRef, n: number) => n >= s.chambres && n <= (s.chambresMax ?? s.chambres);

  if (!q) {
    const alternatives = trier(utilisables.filter((s) => quartiersVille.has(s.quartierId) && memeFamille(s) && couvre(s, chambres!)).map((s) => ({ ...evaluer(s, "approximation"), ecarts: ["autre quartier"] })));
    return { ...vide, statut: "quartier_inconnu", manquants: [], alternatives, message: `Le quartier « ${bien.quartier} » n'existe pas dans la base de données marché de ${bien.ville}. Ajoutez-le (ou un alias), importez des données, ou choisissez explicitement un autre segment.` };
  }

  const duQuartier = utilisables.filter((s) => s.quartierId === q.id && memeFamille(s));
  let exacts = duQuartier.filter((s) => s.chambresMax === null && s.chambres === chambres).map((s) => evaluer(s, "exacte"));
  let regroupes = duQuartier.filter((s) => s.chambresMax !== null && couvre(s, chambres!)).map((s) => evaluer(s, "regroupement"));
  if (options.standingObligatoire && bien.standing) {
    const exige = (c: Candidat) => !c.segment.standing || c.segment.standing === bien.standing;
    exacts = exacts.filter(exige);
    regroupes = regroupes.filter(exige);
  }
  const retenus = trier([...trier(exacts), ...trier(regroupes)]);
  if (retenus.length) {
    const [choix, ...autres] = retenus;
    return { statut: "trouve", quartierId: q.id, choix, autresExacts: autres, alternatives: [], manquants: [], message: "" };
  }

  const alternatives = trier([
    ...utilisables.filter((s) => s.quartierId === q.id && memeFamille(s) && !couvre(s, chambres!) && Math.abs(s.chambres - chambres!) <= 1).map((s) => ({ ...evaluer(s, "approximation"), ecarts: [`${s.chambres} chambre(s) au lieu de ${chambres}`] })),
    ...utilisables.filter((s) => s.quartierId !== q.id && quartiersVille.has(s.quartierId) && memeFamille(s) && couvre(s, chambres!)).map((s) => ({ ...evaluer(s, "approximation"), ecarts: ["autre quartier"] })),
  ]);
  return {
    ...vide,
    statut: "aucune_donnee",
    quartierId: q.id,
    manquants: [],
    alternatives,
    message: `Aucune donnée de marché validée pour ${fam!.studio ? "un studio" : `${chambres} chambre(s)`} à ${q.nom}. Importez des données PriceLabs pour ce segment, ou choisissez explicitement une approximation.`,
  };
}
