/*
  Creative Intelligence : angles marketing, images publicitaires (statiques uniquement), import des
  performances Meta Ads (CSV) et aide à la décision. Tout ce fichier est du calcul pur, testé.

  Règles de fond :
  - une annonce Meta n'est rattachée à une image que par son identifiant Meta, saisi sur l'image :
    aucune association n'est devinée à partir d'un nom ;
  - les taux et coûts se calculent toujours sur des TOTAUX (jamais une moyenne de CPL) ;
  - une recommandation n'est jamais appliquée automatiquement.
*/
import { analyserCsv } from "./csv.ts";
import { lireMontant } from "./import-airbnb.ts";

export const SEGMENTS = [
  { value: "longue", label: "Location longue durée" },
  { value: "vacant", label: "Logement vacant" },
  { value: "courte", label: "Déjà en courte durée" },
  { value: "tous", label: "Tous les propriétaires" },
] as const;

export const STATUTS_ANGLE = [
  { value: "backlog", label: "Backlog", ton: "neutre" },
  { value: "testing", label: "Testing", ton: "attention" },
  { value: "active", label: "Active", ton: "ok" },
  { value: "paused", label: "Paused", ton: "danger" },
  { value: "archived", label: "Archived", ton: "neutre" },
] as const;

export const TYPES_IMAGE = [
  { value: "photo", label: "Photo immobilière premium", abrege: "PHOTO" },
  { value: "data", label: "Data / Rentabilité", abrege: "DATA" },
  { value: "avant_apres", label: "Avant / Après", abrege: "AVAP" },
  { value: "emotion", label: "Problème émotionnel", abrege: "EMO" },
  { value: "bold_hook", label: "Bold Hook", abrege: "HOOK" },
  { value: "case_study", label: "Case Study", abrege: "CASE" },
] as const;

export const STATUTS_CREATIVE = [
  { value: "brouillon", label: "Brouillon", ton: "neutre" },
  { value: "prete", label: "Prête à publier", ton: "marque" },
  { value: "publiee", label: "Publiée", ton: "ok" },
  { value: "en_pause", label: "En pause", ton: "attention" },
  { value: "archivee", label: "Archivée", ton: "neutre" },
] as const;

export type Ton = "neutre" | "ok" | "attention" | "danger" | "marque";
const trouver = <T extends { value: string }>(liste: readonly T[], v: string) => liste.find((x) => x.value === v);
export const libelleSegment = (v: string) => trouver(SEGMENTS, v)?.label ?? v;
export const libelleType = (v: string) => trouver(TYPES_IMAGE, v)?.label ?? v;
export const statutAngle = (v: string) => trouver(STATUTS_ANGLE, v) ?? { value: v, label: v, ton: "neutre" as Ton };
export const statutCreative = (v: string) => trouver(STATUTS_CREATIVE, v) ?? { value: v, label: v, ton: "neutre" as Ton };

/** Identifiant Meta d'une annonce : uniquement des chiffres (15 à 20 en pratique). */
export const META_AD_ID = /^\d{6,25}$/;

/** Code lisible d'une image : angle, type, version. Ex. « ANG-003-DATA-V2 ». */
export function codeCreative(codeAngle: string, type: string, version: number) {
  return `${codeAngle}-${trouver(TYPES_IMAGE, type)?.abrege ?? "IMG"}-V${version}`;
}

/* ---------------------------------------------------------------------------------------------
   Indicateurs
--------------------------------------------------------------------------------------------- */

export type Totaux = { depenses: number; impressions: number; clics: number; leads: number };
export const ZERO: Totaux = { depenses: 0, impressions: 0, clics: 0, leads: 0 };

const centimes = (n: number) => Math.round(n * 100) / 100;

/** Somme de lignes de performance. Les dépenses sont additionnées en centimes pour éviter les écarts d'arrondi. */
export function totaliser(lignes: Totaux[]): Totaux {
  let c = 0;
  let impressions = 0;
  let clics = 0;
  let leads = 0;
  for (const l of lignes) {
    c += Math.round(l.depenses * 100);
    impressions += l.impressions;
    clics += l.clics;
    leads += l.leads;
  }
  return { depenses: c / 100, impressions, clics, leads };
}

export type Indicateurs = Totaux & { ctr: number | null; cpc: number | null; cpl: number | null };

/**
 * CTR lien (%), CPC lien et CPL, calculés sur les totaux fournis. `null` quand le dénominateur
 * est nul : on n'affiche jamais « 0 » pour un coût qu'on ne peut pas calculer.
 */
export function indicateurs(t: Totaux): Indicateurs {
  return {
    ...t,
    ctr: t.impressions > 0 ? Math.round((t.clics / t.impressions) * 10000) / 100 : null,
    cpc: t.clics > 0 ? centimes(t.depenses / t.clics) : null,
    cpl: t.leads > 0 ? centimes(t.depenses / t.leads) : null,
  };
}

/* ---------------------------------------------------------------------------------------------
   Import CSV Meta Ads Manager
--------------------------------------------------------------------------------------------- */

export const CHAMPS_META = [
  { cle: "date", label: "Date (jour)", requis: false },
  { cle: "debut", label: "Début des rapports", requis: false },
  { cle: "fin", label: "Fin des rapports", requis: false },
  { cle: "adId", label: "Identifiant de la publicité", requis: true },
  { cle: "nom", label: "Nom de la publicité", requis: false },
  { cle: "depenses", label: "Montant dépensé", requis: true },
  { cle: "impressions", label: "Impressions", requis: true },
  { cle: "clics", label: "Clics sur un lien", requis: true },
  { cle: "leads", label: "Leads (prospects)", requis: true },
] as const;
export type ChampMeta = (typeof CHAMPS_META)[number]["cle"];
/** Pour chaque champ, l'indice de la colonne du fichier (-1 = non trouvé). */
export type Mapping = Record<ChampMeta, number>;

const simple = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Intitulés des exports Meta, en français et en anglais (du plus précis au plus général). */
const ALIAS: Record<ChampMeta, string[]> = {
  date: ["jour", "day", "date"],
  debut: ["debut des rapports", "reporting starts"],
  fin: ["fin des rapports", "reporting ends"],
  adId: ["id de la publicite", "identifiant de la publicite", "ad id", "id publicite"],
  nom: ["nom de la publicite", "ad name"],
  depenses: ["montant depense", "amount spent", "depenses", "spend"],
  impressions: ["impressions"],
  clics: ["clics sur un lien", "clics sur le lien", "link clicks"],
  leads: ["prospects", "leads", "prospects sur facebook", "on facebook leads", "prospects sur meta", "meta leads", "prospects sur le site web", "website leads"],
};

export function devinerColonnes(entetes: string[]): Mapping {
  const propres = entetes.map(simple);
  const m = {} as Mapping;
  for (const { cle } of CHAMPS_META) {
    let trouve = -1;
    for (const alias of ALIAS[cle]) {
      trouve = propres.indexOf(alias);
      if (trouve >= 0) break;
    }
    m[cle] = trouve;
  }
  return m;
}

/** Devise écrite dans l'intitulé de la colonne des dépenses : « Montant dépensé (EUR) » → EUR. */
export function deviseDeLEntete(entete: string | undefined): string | null {
  return entete?.match(/\(([A-Z]{3})\)/)?.[1] ?? null;
}

const DATE_ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})/;
const DATE_COURANTE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/;
type Ordre = "jma" | "mja";

function ordreDesDates(dates: string[], defaut: Ordre): Ordre {
  for (const d of dates) {
    const m = d.trim().match(DATE_COURANTE);
    if (!m) continue;
    if (Number(m[1]) > 12) return "jma";
    if (Number(m[2]) > 12) return "mja";
  }
  return defaut;
}

function lireDate(texte: string, ordre: Ordre): string | null {
  const t = texte.trim();
  let a: number, m: number, j: number;
  const iso = t.match(DATE_ISO);
  if (iso) [a, m, j] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else {
    const c = t.match(DATE_COURANTE);
    if (!c) return null;
    a = Number(c[3]) < 100 ? 2000 + Number(c[3]) : Number(c[3]);
    [j, m] = ordre === "jma" ? [Number(c[1]), Number(c[2])] : [Number(c[2]), Number(c[1])];
  }
  const jour = `${a}-${String(m).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
  const d = new Date(`${jour}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(jour) ? jour : null;
}

/** Nombre entier d'un export (« 1 234 », « 1,234 », « 1.234 », vide = 0). */
function lireEntier(texte: string): number {
  const t = texte.trim();
  if (!t) return 0;
  const chiffres = t.replace(/[\s  .,']/g, "");
  if (!/^\d+$/.test(chiffres)) return NaN;
  // « 12,5 » ou « 12.50 » ne sont pas des entiers : on refuse plutôt que d'inventer
  if (/[.,]\d{1,2}$/.test(t) && !/[.,]\d{3}$/.test(t)) return NaN;
  return Number(chiffres);
}

export type LigneMeta = { adId: string; nom: string; debut: string; fin: string } & Totaux;
export type ErreurImport = { ligne: number; message: string };
export type AnalyseMeta =
  | { ok: false; erreur: string; entetes: string[]; mapping: Mapping }
  | { ok: true; entetes: string[]; mapping: Mapping; devise: string | null; lignes: LigneMeta[]; erreurs: ErreurImport[]; ignorees: number; regroupees: number };

/**
 * Lit un export Meta Ads Manager. Une ligne = une publicité sur une période (idéalement un jour).
 * Les lignes sans identifiant de publicité (totaux) sont ignorées ; les lignes illisibles sont
 * listées en erreur, jamais corrigées « au mieux ». Plusieurs lignes pour la même publicité et la
 * même période (répartition par âge, placement…) sont additionnées.
 */
export function analyserMeta(texte: string, choix?: Partial<Mapping>): AnalyseMeta {
  const table = analyserCsv(texte);
  const entetes = table[0] ?? [];
  const mapping = { ...devinerColonnes(entetes), ...choix } as Mapping;
  if (table.length < 2) return { ok: false, erreur: "Le fichier est vide ou ne contient que des intitulés.", entetes, mapping };

  const manquants = CHAMPS_META.filter((c) => c.requis && mapping[c.cle] < 0).map((c) => c.label);
  if (manquants.length) return { ok: false, erreur: `Colonnes introuvables : ${manquants.join(", ")}. Choisissez-les dans la correspondance des colonnes.`, entetes, mapping };
  if (mapping.date < 0 && (mapping.debut < 0 || mapping.fin < 0)) {
    return { ok: false, erreur: "Aucune colonne de date : il faut soit « Jour », soit « Début des rapports » et « Fin des rapports ».", entetes, mapping };
  }

  const corps = table.slice(1);
  const cellule = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");
  const colonnesDate = [mapping.date, mapping.debut, mapping.fin].filter((i) => i >= 0);
  const francais = entetes.some((e) => /publicit|rapports|jour|montant/i.test(e));
  const ordre = ordreDesDates(corps.flatMap((l) => colonnesDate.map((i) => l[i] ?? "")), francais ? "jma" : "mja");

  const parCle = new Map<string, LigneMeta>();
  const erreurs: ErreurImport[] = [];
  let ignorees = 0;
  let regroupees = 0;

  corps.forEach((l, i) => {
    const numero = i + 2; // la ligne 1 porte les intitulés
    const brut = cellule(l, mapping.adId);
    if (!brut) {
      ignorees++; // ligne de total ou ligne vide
      return;
    }
    if (/e\+/i.test(brut)) {
      erreurs.push({ ligne: numero, message: `Identifiant « ${brut} » abîmé par un tableur. Exportez le fichier depuis Meta sans l'ouvrir dans Excel.` });
      return;
    }
    const adId = brut.replace(/^['"=]+|['"]+$/g, "");
    if (!META_AD_ID.test(adId)) {
      erreurs.push({ ligne: numero, message: `Identifiant de publicité illisible : « ${brut} ».` });
      return;
    }
    let debut: string | null;
    let fin: string | null;
    if (mapping.date >= 0 && cellule(l, mapping.date)) debut = fin = lireDate(cellule(l, mapping.date), ordre);
    else {
      debut = lireDate(cellule(l, mapping.debut), ordre);
      fin = lireDate(cellule(l, mapping.fin), ordre);
    }
    if (!debut || !fin || fin < debut) {
      erreurs.push({ ligne: numero, message: "Date illisible ou période inversée." });
      return;
    }
    const depenses = cellule(l, mapping.depenses) ? lireMontant(cellule(l, mapping.depenses)) : 0;
    const impressions = lireEntier(cellule(l, mapping.impressions));
    const clics = lireEntier(cellule(l, mapping.clics));
    const leads = lireEntier(cellule(l, mapping.leads));
    if (![depenses, impressions, clics, leads].every((n) => Number.isFinite(n) && n >= 0)) {
      erreurs.push({ ligne: numero, message: "Un des nombres (dépenses, impressions, clics, leads) est illisible." });
      return;
    }
    const cle = `${adId}|${debut}|${fin}`;
    const deja = parCle.get(cle);
    if (deja) {
      regroupees++;
      Object.assign(deja, totaliser([deja, { depenses, impressions, clics, leads }]));
    } else parCle.set(cle, { adId, nom: cellule(l, mapping.nom).slice(0, 200), debut, fin, depenses: centimes(depenses), impressions, clics, leads });
  });

  return {
    ok: true,
    entetes,
    mapping,
    devise: deviseDeLEntete(entetes[mapping.depenses]),
    lignes: [...parCle.values()].sort((a, b) => a.debut.localeCompare(b.debut) || a.adId.localeCompare(b.adId)),
    erreurs,
    ignorees,
    regroupees,
  };
}

export type PeriodeExistante = { adId: string; debut: string; fin: string };
export type SortLigne = "nouvelle" | "mise_a_jour" | "chevauchement";

/**
 * Sort réservé à une ligne importée, pour ne jamais compter deux fois la même dépense :
 * même publicité et même période déjà en base → mise à jour ; période qui recouvre partiellement
 * une période existante (ex. un total mensuel après des lignes journalières) → refusée.
 */
export function sortDeLaLigne(l: PeriodeExistante, existantes: PeriodeExistante[]): SortLigne {
  let identique = false;
  for (const e of existantes) {
    if (e.adId !== l.adId) continue;
    if (e.debut === l.debut && e.fin === l.fin) identique = true;
    else if (e.debut <= l.fin && l.debut <= e.fin) return "chevauchement";
  }
  return identique ? "mise_a_jour" : "nouvelle";
}

/* ---------------------------------------------------------------------------------------------
   Aide à la décision
--------------------------------------------------------------------------------------------- */

export type Reglages = {
  devise: string;
  budgetMensuel: number;
  cplCible: number;
  /** Faux tant que l'utilisateur n'a pas confirmé son CPL cible : les raisons le signalent. */
  cplConfirme: boolean;
  impressionsMin: number;
  leadsMin: number;
  /** CTR lien minimal attendu, en % */
  ctrMin: number;
  /** Au-delà de CPL cible × tolérance, la publicité est jugée trop chère */
  tolerance: number;
};

export const REGLAGES_DEPART: Reglages = { devise: "EUR", budgetMensuel: 300, cplCible: 10, cplConfirme: false, impressionsMin: 1000, leadsMin: 3, ctrMin: 0.8, tolerance: 1.3 };

export const RECOMMANDATIONS = {
  CONTINUE: { label: "Continuer", ton: "ok" },
  TEST_NEW_IMAGE: { label: "Tester une nouvelle image", ton: "attention" },
  PAUSE: { label: "Mettre en pause", ton: "danger" },
  INSUFFICIENT_DATA: { label: "Données insuffisantes", ton: "neutre" },
} as const satisfies Record<string, { label: string; ton: Ton }>;
export type Recommandation = keyof typeof RECOMMANDATIONS;
export type Avis = { statut: Recommandation; raisons: string[] };

const nb = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

/**
 * Recommandation pour une image (ou un angle) à partir de ses totaux. Elle explique toujours
 * pourquoi, et ne désigne jamais de gagnant tant que les données sont trop minces.
 */
export function recommander(t: Totaux, r: Reglages): Avis {
  const i = indicateurs(t);
  const d = r.devise;
  const raisons: string[] = [];
  const cible = `CPL cible de ${nb(r.cplCible)} ${d}${r.cplConfirme ? "" : " (valeur de départ, à confirmer dans les réglages)"}`;
  const ctrFaible = i.ctr !== null && t.impressions >= r.impressionsMin && i.ctr < r.ctrMin;
  const noteCtr = ctrFaible ? `CTR lien de ${nb(i.ctr!)} %, sous le seuil de ${nb(r.ctrMin)} % : l'image accroche peu.` : null;

  if (t.impressions === 0 && t.depenses === 0) return { statut: "INSUFFICIENT_DATA", raisons: ["Aucune performance importée pour l'instant."] };

  if (t.leads === 0) {
    if (t.depenses >= r.cplCible * 2) {
      raisons.push(`${nb(t.depenses)} ${d} dépensés sans aucun lead, soit au moins 2 fois le ${cible}.`);
      if (noteCtr) raisons.push(noteCtr);
      return { statut: "PAUSE", raisons };
    }
    if (ctrFaible) {
      raisons.push(noteCtr!, `Aucun lead pour ${nb(t.depenses)} ${d} : trop tôt pour arrêter, mais l'image mérite d'être remplacée.`);
      return { statut: "TEST_NEW_IMAGE", raisons };
    }
    raisons.push(`Aucun lead, mais seulement ${nb(t.depenses)} ${d} dépensés (moins de 2 fois le ${cible}).`);
    if (t.impressions < r.impressionsMin) raisons.push(`${t.impressions} impressions, sous le minimum de ${r.impressionsMin}.`);
    return { statut: "INSUFFICIENT_DATA", raisons };
  }

  const cpl = i.cpl!;
  if (t.leads < r.leadsMin) {
    if (cpl > r.cplCible * 2 && t.depenses >= r.cplCible * 3) {
      raisons.push(`CPL de ${nb(cpl)} ${d} pour ${t.leads} lead${t.leads > 1 ? "s" : ""}, plus de 2 fois le ${cible}, après ${nb(t.depenses)} ${d} dépensés.`);
      if (noteCtr) raisons.push(noteCtr);
      return { statut: "PAUSE", raisons };
    }
    raisons.push(`Seulement ${t.leads} lead${t.leads > 1 ? "s" : ""} (minimum ${r.leadsMin} pour juger) : le CPL de ${nb(cpl)} ${d} est provisoire.`);
    if (noteCtr) raisons.push(noteCtr);
    return { statut: "INSUFFICIENT_DATA", raisons };
  }

  if (cpl <= r.cplCible) {
    raisons.push(`CPL de ${nb(cpl)} ${d} sur ${t.leads} leads, dans le ${cible}.`);
    if (noteCtr) raisons.push(noteCtr);
    return { statut: "CONTINUE", raisons };
  }
  if (cpl <= r.cplCible * r.tolerance) {
    raisons.push(`CPL de ${nb(cpl)} ${d} sur ${t.leads} leads, un peu au-dessus du ${cible}.`, "L'angle fonctionne : une nouvelle image peut faire baisser le coût.");
    if (noteCtr) raisons.push(noteCtr);
    return { statut: "TEST_NEW_IMAGE", raisons };
  }
  raisons.push(`CPL de ${nb(cpl)} ${d} sur ${t.leads} leads, plus de ${nb(r.tolerance)} fois le ${cible}.`);
  if (noteCtr) raisons.push(noteCtr);
  return { statut: "PAUSE", raisons };
}

/** Montant dans la devise du compte publicitaire, à la française (« 12,50 € »). */
export function formatDevise(montant: number | null, devise: string): string {
  if (montant === null) return "—";
  const symbole = devise === "EUR" ? "€" : devise === "USD" ? "$" : devise;
  return `${montant.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[  ]/g, " ")} ${symbole}`;
}
export const formatPourcent = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`);
export const formatEntier = (n: number) => n.toLocaleString("fr-FR").replace(/[  ]/g, " ");

/* ---------------------------------------------------------------------------------------------
   Dépôt d'une image par Claude
--------------------------------------------------------------------------------------------- */

/** Hébergeurs d'où une image peut être récupérée par adresse (les fichiers produits par Higgsfield). */
export const HOTES_IMAGES = ["d8j0ntlcm91z4.cloudfront.net"];

/** N'accepte qu'une adresse https d'un hébergeur autorisé : le serveur ne va chercher aucun autre fichier. */
export function adresseAutorisee(adresse: string): URL | null {
  try {
    const u = new URL(adresse);
    return u.protocol === "https:" && !u.username && !u.port && HOTES_IMAGES.includes(u.hostname) ? u : null;
  } catch {
    return null;
  }
}
