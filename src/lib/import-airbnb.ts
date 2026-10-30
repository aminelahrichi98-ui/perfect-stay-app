/*
  Import du relevé de transactions Airbnb (Revenus > Historique des transactions > Exporter en CSV).
  Le fichier mélange réservations, versements bancaires et ajustements : on ne garde que les réservations,
  avec leur code de confirmation, le séjour, le voyageur, l'annonce et le montant versé à l'hôte.
  Les en-têtes peuvent être en français ou en anglais, les dates au format JJ/MM/AAAA ou MM/JJ/AAAA.
*/
import { analyserCsv } from "./csv.ts";
import { ajouterJours } from "./dates.ts";

export type LigneAirbnb = {
  ligne: number; // numéro de ligne dans le fichier (en-têtes = 1)
  code: string;
  arrivee: string;
  depart: string;
  voyageur: string;
  annonce: string;
  devise: string;
  montant: number;
};

export type AnalyseAirbnb =
  | { ok: true; lignes: LigneAirbnb[]; autres: number; erreurs: { ligne: number; raison: string }[] }
  | { ok: false; erreur: string };

const simplifier = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const COLONNES = {
  type: ["type"],
  code: ["confirmation code", "code de confirmation", "code confirmation"],
  debut: ["start date", "date de debut", "date d arrivee", "arrivee", "check in"],
  fin: ["end date", "date de fin", "date de depart", "depart", "check out"],
  nuits: ["nights", "nuits", "nombre de nuits"],
  voyageur: ["guest", "voyageur", "guest name", "nom du voyageur"],
  annonce: ["listing", "annonce", "logement", "listing name", "nom de l annonce"],
  devise: ["currency", "devise"],
  montant: ["amount", "montant"],
} as const;

type Colonne = keyof typeof COLONNES;

function reperer(entetes: string[]): Partial<Record<Colonne, number>> {
  const s = entetes.map(simplifier);
  const res: Partial<Record<Colonne, number>> = {};
  for (const [col, noms] of Object.entries(COLONNES) as [Colonne, readonly string[]][]) {
    const i = s.findIndex((e) => noms.includes(e));
    if (i >= 0) res[col] = i;
  }
  return res;
}

/** Montant écrit « 1 234,56 », « 1,234.56 », « 1234.56 » ou « MAD 1 234 » → nombre. */
export function lireMontant(texte: string): number {
  let t = texte.replace(/\s/g, "").replace(/[^0-9.,-]/g, "");
  if (!t) return NaN;
  const virgule = t.lastIndexOf(",");
  const point = t.lastIndexOf(".");
  if (virgule >= 0 && point >= 0) {
    // Le dernier séparateur est celui des décimales
    t = virgule > point ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  } else if (virgule >= 0) {
    // « 1,234 » : milliers ; « 12,5 » ou « 12,50 » : décimales
    t = /,\d{3}$/.test(t) && t.split(",").length === 2 && !/^-?0,/.test(t) ? t.replace(",", "") : t.replace(/,/g, ".");
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

type OrdreDate = "jma" | "mja";

const DATE_ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})/;
const DATE_COURANTE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/;

/** Devine l'ordre des dates du fichier : 25/10 ne peut être que jour/mois, 10/25 que mois/jour. */
function ordreDesDates(dates: string[], francais: boolean): OrdreDate {
  for (const d of dates) {
    const m = d.trim().match(DATE_COURANTE);
    if (!m) continue;
    if (Number(m[1]) > 12) return "jma";
    if (Number(m[2]) > 12) return "mja";
  }
  return francais ? "jma" : "mja";
}

function lireDate(texte: string, ordre: OrdreDate): string | null {
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

export function analyserAirbnb(texte: string): AnalyseAirbnb {
  const tableau = analyserCsv(texte);
  if (tableau.length < 2) return { ok: false, erreur: "Ce fichier ne contient aucune ligne de données." };
  const [entetes, ...donnees] = tableau;
  const col = reperer(entetes);
  if (col.code === undefined || col.debut === undefined || col.montant === undefined || (col.fin === undefined && col.nuits === undefined)) {
    return {
      ok: false,
      erreur: "Ce fichier ne ressemble pas à un relevé Airbnb : il manque le code de confirmation, la date de début, la date de fin (ou les nuits) ou le montant.",
    };
  }
  const francais = entetes.some((e) => /montant|devise|voyageur|annonce/.test(simplifier(e)));
  const cellule = (l: string[], c: Colonne) => (col[c] === undefined ? "" : (l[col[c]!] ?? "").trim());
  const ordre = ordreDesDates(
    donnees.flatMap((l) => [cellule(l, "debut"), cellule(l, "fin")]),
    francais,
  );

  const parCle = new Map<string, LigneAirbnb>();
  const erreurs: { ligne: number; raison: string }[] = [];
  let autres = 0;
  donnees.forEach((l, i) => {
    const ligne = i + 2;
    const type = simplifier(cellule(l, "type"));
    const code = cellule(l, "code").toUpperCase();
    // Versements bancaires, ajustements, frais d'annulation… : pas une réservation
    if ((col.type !== undefined && !type.startsWith("reservation")) || !code) {
      autres++;
      return;
    }
    const arrivee = lireDate(cellule(l, "debut"), ordre);
    if (!arrivee) return void erreurs.push({ ligne, raison: `${code} : date de début illisible` });
    let depart = col.fin !== undefined ? lireDate(cellule(l, "fin"), ordre) : null;
    if (!depart) {
      const nuits = Number(cellule(l, "nuits"));
      if (Number.isInteger(nuits) && nuits > 0) depart = ajouterJours(arrivee, nuits);
    }
    if (!depart || depart <= arrivee) return void erreurs.push({ ligne, raison: `${code} : date de fin illisible` });
    const montant = lireMontant(cellule(l, "montant"));
    if (!Number.isFinite(montant)) return void erreurs.push({ ligne, raison: `${code} : montant illisible` });

    // Une même réservation peut apparaître sur plusieurs lignes (ajustement de montant) : on additionne
    const cle = `${code}|${arrivee}`;
    const deja = parCle.get(cle);
    if (deja) deja.montant = Math.round((deja.montant + montant) * 100) / 100;
    else
      parCle.set(cle, {
        ligne,
        code,
        arrivee,
        depart,
        voyageur: cellule(l, "voyageur"),
        annonce: cellule(l, "annonce"),
        devise: (cellule(l, "devise") || "MAD").toUpperCase(),
        montant,
      });
  });
  return { ok: true, lignes: [...parCle.values()], autres, erreurs };
}

/* ------------------------- Décision ligne par ligne (aperçu et import) ------------------------- */

/** Ce que la base sait déjà des réservations et versements concernés par le fichier. */
export type ContexteImport = {
  /** Réservation du calendrier portant ce code de confirmation */
  reservations: Record<string, { id: string; logement_id: string }>;
  /** Versements déjà enregistrés : « CODE|arrivée », « logement|arrivée » et réservations déjà payées */
  refs: string[];
  occupes: string[];
  reservationsVersees: string[];
  /** Logements accessibles, avec leurs frais de ménage */
  logements: Record<string, { frais_menage: number }>;
};

export type Decision =
  | { statut: "ok"; logementId: string; reservationId: string | null; montant: number }
  | { statut: "deja" | "a_choisir" | "refuse"; raison: string };

export function decider(l: LigneAirbnb, logementChoisi: string, taux: number, ctx: ContexteImport): Decision {
  const resa = ctx.reservations[l.code];
  const logementId = resa?.logement_id ?? logementChoisi;
  if (ctx.refs.includes(`${l.code}|${l.arrivee}`) || (resa && ctx.reservationsVersees.includes(resa.id))) {
    return { statut: "deja", raison: "Déjà enregistré" };
  }
  if (!logementId || !ctx.logements[logementId]) return { statut: "a_choisir", raison: "Choisissez le logement" };
  if (ctx.occupes.includes(`${logementId}|${l.arrivee}`)) return { statut: "deja", raison: "Un versement existe déjà pour ce check-in" };
  if (!(taux > 0)) return { statut: "refuse", raison: `Indiquez le taux de conversion ${l.devise} → MAD` };
  const montant = Math.round(l.montant * taux * 100) / 100;
  if (!(montant > 0)) return { statut: "refuse", raison: "Montant nul ou négatif" };
  const menage = ctx.logements[logementId].frais_menage;
  if (montant < menage) return { statut: "refuse", raison: `Montant inférieur au ménage (${menage} MAD)` };
  return { statut: "ok", logementId, reservationId: resa?.id ?? null, montant };
}

/** Logement le plus probable pour une annonce Airbnb, d'après les noms. */
export function devinerLogement(annonce: string, logements: { id: string; nom: string }[]): string {
  const a = simplifier(annonce);
  if (!a) return "";
  const exact = logements.find((l) => simplifier(l.nom) === a);
  if (exact) return exact.id;
  const contenu = logements.filter((l) => {
    const n = simplifier(l.nom);
    return n.length >= 3 && (a.includes(n) || n.includes(a));
  });
  return contenu.length === 1 ? contenu[0].id : "";
}
