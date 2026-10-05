import { z } from "zod";
import { calculerVersement, type ResultatVersement } from "./compta.ts";
import { TAUX_COMMISSION_DEFAUT } from "./logements.ts";

/*
  Reprise de l'ancienne app de comptabilité (cahier des charges §7).
  Format attendu : { logements: [...], transactions: [...] }.
*/

const identifiant = z.union([z.string(), z.number()]).transform(String);
const texte = z.string().nullish().transform((v) => v ?? "");
const montant = z.preprocess((v) => (v === null || v === undefined || v === "" ? 0 : v), z.coerce.number());

export const schemaLogementAncien = z.object({
  id: identifiant,
  nom: z.string().trim().min(1, "un logement n'a pas de nom"),
  proprietaire: texte,
  ville: texte,
  fraisMenage: montant.pipe(z.number().min(0)),
  ical: texte,
  photo: texte,
});

export const schemaTransactionAncienne = z.object({
  id: identifiant,
  logementId: identifiant,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "une date n'est pas au format AAAA-MM-JJ"),
  montant: montant,
  fraisMenage: montant.pipe(z.number().min(0)),
  note: texte,
});

export const schemaImport = z.object({
  logements: z.array(schemaLogementAncien),
  transactions: z.array(schemaTransactionAncienne),
});

export type DonneesAnciennes = z.infer<typeof schemaImport>;
export type LogementAncien = z.infer<typeof schemaLogementAncien>;
export type TransactionAncienne = z.infer<typeof schemaTransactionAncienne>;

/** Ce que représente le champ « montant » de l'ancienne app. À confirmer par Amine sur des exemples. */
export type Hypothese = "recu" | "net";

export const HYPOTHESES: { value: Hypothese; titre: string; detail: string }[] = [
  {
    value: "recu",
    titre: "C'était le montant reçu, ménage inclus",
    detail: "Le montant saisi correspond à ce qu'Airbnb a versé pour le séjour (ménage compris).",
  },
  {
    value: "net",
    titre: "C'était déjà le loyer hors ménage",
    detail: "Le montant saisi ne comprenait pas le ménage : on l'ajoute pour retrouver le montant reçu.",
  },
];

export function lireExport(contenu: string): { ok: true; donnees: DonneesAnciennes } | { ok: false; erreur: string } {
  let brut: unknown;
  try {
    brut = JSON.parse(contenu);
  } catch {
    return { ok: false, erreur: "Ce contenu n'est pas un fichier d'export valide (le texte est incomplet ou abîmé). Refaites l'export depuis l'ancienne app." };
  }
  const r = schemaImport.safeParse(brut);
  if (!r.success) {
    const probleme = r.error.issues[0];
    const chemin = probleme.path.length ? ` (${probleme.path.join(" › ")})` : "";
    if (probleme.path[0] === undefined || (probleme.code === "invalid_type" && probleme.path.length === 1)) {
      return { ok: false, erreur: "Il manque la liste « logements » ou « transactions » dans ce fichier. Vérifiez que c'est bien l'export de l'ancienne app." };
    }
    return { ok: false, erreur: `Le fichier contient une donnée incorrecte${chemin} : ${probleme.message}.` };
  }
  return { ok: true, donnees: r.data };
}

/** Montant reçu à enregistrer, selon ce que représentait l'ancien « montant ». */
export function montantRecu(t: Pick<TransactionAncienne, "montant" | "fraisMenage">, hypothese: Hypothese) {
  return hypothese === "net" ? Math.round((t.montant + t.fraisMenage) * 100) / 100 : t.montant;
}

export type LigneApercu = {
  transactionId: string;
  logement: string;
  date: string;
  note: string;
  calcul: ResultatVersement;
};

export type Apercu = {
  nbLogements: number;
  nbTransactions: number;
  totalMontantRecu: number;
  parLogement: { id: string; nom: string; nbVersements: number; totalMontantRecu: number }[];
  echantillon: LigneApercu[];
  avertissements: string[];
};

/** Résumé et recalcul avec la formule actuelle, pour que le résultat soit vérifié avant d'importer. */
export function construireApercu(
  donnees: DonneesAnciennes,
  hypothese: Hypothese,
  taux: Record<string, number>,
  tailleEchantillon = 8,
): Apercu {
  const noms = new Map(donnees.logements.map((l) => [l.id, l.nom]));
  const tauxDe = (id: string) => taux[id] ?? TAUX_COMMISSION_DEFAUT;
  const avertissements: string[] = [];

  const orphelines = donnees.transactions.filter((t) => !noms.has(t.logementId));
  if (orphelines.length) {
    avertissements.push(`${orphelines.length} versement(s) font référence à un logement absent du fichier : ils seront ignorés.`);
  }
  const negatifs = donnees.transactions.filter((t) => t.montant <= 0);
  if (negatifs.length) avertissements.push(`${negatifs.length} versement(s) ont un montant nul ou négatif : vérifiez-les.`);
  const menageTropGros = donnees.transactions.filter((t) => hypothese === "recu" && t.fraisMenage > t.montant && t.montant > 0);
  if (menageTropGros.length) {
    avertissements.push(
      `${menageTropGros.length} versement(s) ont un ménage supérieur au montant : l'hypothèse « montant reçu, ménage inclus » est peut-être la mauvaise.`,
    );
  }
  const doublons = new Set<string>();
  const vus = new Set<string>();
  for (const l of donnees.logements) {
    const cle = l.nom.trim().toLowerCase();
    if (vus.has(cle)) doublons.add(l.nom);
    vus.add(cle);
  }
  if (doublons.size) avertissements.push(`Plusieurs logements portent le même nom : ${[...doublons].join(", ")}.`);

  const valides = donnees.transactions.filter((t) => noms.has(t.logementId));
  const parLogement = donnees.logements.map((l) => {
    const siens = valides.filter((t) => t.logementId === l.id);
    return {
      id: l.id,
      nom: l.nom,
      nbVersements: siens.length,
      totalMontantRecu: siens.reduce((s, t) => s + montantRecu(t, hypothese), 0),
    };
  });

  // Échantillon : les versements les plus récents de chaque logement, pour couvrir tous les cas
  const recents = [...valides].sort((a, b) => b.date.localeCompare(a.date));
  const echantillon: LigneApercu[] = [];
  const dejaPris = new Set<string>();
  for (const t of recents) {
    if (echantillon.length >= tailleEchantillon) break;
    if (dejaPris.has(t.logementId) && dejaPris.size < Math.min(noms.size, tailleEchantillon)) continue;
    dejaPris.add(t.logementId);
    try {
      echantillon.push({
        transactionId: t.id,
        logement: noms.get(t.logementId) ?? "",
        date: t.date.slice(0, 10),
        note: t.note,
        calcul: calculerVersement({ montantRecu: montantRecu(t, hypothese), fraisMenage: t.fraisMenage, tauxCommission: tauxDe(t.logementId) }),
      });
    } catch {
      /* ligne impossible à calculer : elle sera signalée à l'import */
    }
  }

  return {
    nbLogements: donnees.logements.length,
    nbTransactions: valides.length,
    totalMontantRecu: parLogement.reduce((s, l) => s + l.totalMontantRecu, 0),
    parLogement,
    echantillon,
    avertissements,
  };
}

/** « data:image/jpeg;base64,… » → octets, ou null si ce n'est pas une image acceptée. */
export function lirePhoto(dataUrl: string): Buffer | null {
  const m = dataUrl.match(/^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!m) return null;
  return Buffer.from(m[1].replace(/\s/g, ""), "base64");
}
