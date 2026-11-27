/*
  Extraction des captures PriceLabs.
  1. Le modèle d'IA recopie ce qu'il VOIT, sous forme de texte (« 139 076 MAD », « 68 % »),
     avec le libellé d'origine, le numéro de la capture et un niveau de confiance (SchemaExtractionIA).
  2. Ce fichier convertit ce texte en nombres de façon déterministe et testée (normaliserExtraction),
     sans jamais compléter une valeur absente ni reconstituer une série illisible.
  3. controlerDonnees signale les incohérences ; champsBloquants liste ce qui empêche la validation.
*/
import { z } from "zod";
import { cle, lireDate, lireDevise, lireEntier, lireMois, lireNombre, lirePourcentage } from "./nombres.ts";
import { CONFIANCES, METRIQUES_PERCENTILE, NATURES_CENTRAL, NATURES_MENSUEL, type DonneesMarche, type Preuve, type Standing, type TypeSegment, donneesVides, LIBELLES_CHAMPS } from "./schema.ts";

/* ------------------------------ Ce que l'IA renvoie ------------------------------ */

/*
  Format volontairement simple pour la sortie structurée : pas de valeurs nulles.
  Texte vide = valeur absente ou illisible ; capture 0 = numéro inconnu ; confiance « absente » = rien à lire.
*/
const Lu = z.object({
  texte: z.string().describe("Valeur recopiée exactement comme affichée (chiffres, séparateurs, unité, symbole). Chaîne vide si la valeur n'apparaît pas ou n'est pas lisible."),
  libelle: z.string().describe("Libellé d'origine affiché à côté de la valeur, tel quel. Chaîne vide si aucun."),
  capture: z.number().int().describe("Numéro de la capture (1, 2, 3…) où la valeur apparaît. 0 si la valeur est absente."),
  confiance: z.enum([...CONFIANCES, "absente"]).describe("haute : lu sans doute possible ; moyenne : lisible mais petit ou partiellement masqué ; basse : incertain ; absente : rien à lire."),
});
const OuiNon = z.enum(["oui", "non", "inconnu"]);

export const SchemaExtractionIA = z.object({
  source: z.string().describe("Outil ou page affichée (ex. « PriceLabs Market Dashboard »), chaîne vide si inconnu."),
  localisation: z.object({ pays: Lu, ville: Lu, quartier: Lu }),
  logement: z.object({ type: Lu, chambres: Lu, capacite: Lu, standing: Lu }),
  periode: z.object({ debut: Lu, fin: Lu, type: Lu.describe("Nature de la période telle qu'affichée : « 12 derniers mois », « Next 365 days », « 2025 »…") }),
  devise: Lu,
  base_revenus: z.object({
    frais_plateforme_inclus: OuiNon.describe("Les revenus affichés incluent-ils les frais de plateforme ? « inconnu » si la capture ne le dit pas."),
    frais_menage_inclus: OuiNon,
    taxes_incluses: OuiNon,
    definition: Lu.describe("Texte de la capture qui définit les revenus (infobulle, note, légende)."),
  }),
  metriques: z.object({
    revenu_annuel_bas: Lu,
    revenu_annuel_central: Lu,
    revenu_annuel_haut: Lu,
    revenu_mensuel_moyen: Lu,
    prix_moyen_nuit: Lu,
    taux_occupation: Lu,
    nuits_reservees: Lu,
    nombre_logements: Lu.describe("Nombre de logements analysés par l'outil (taille de l'échantillon)."),
  }),
  nature_valeur_centrale: z.enum(NATURES_CENTRAL).describe("Nature exacte de la valeur centrale si elle est affichée ; « inconnu » sinon."),
  percentiles: z.array(z.object({ libelle: z.string(), rang: z.number().int().describe("25 pour « 25th percentile », 0 si non indiqué."), metrique: z.enum(METRIQUES_PERCENTILE), texte: z.string(), capture: z.number().int(), confiance: z.enum(CONFIANCES) })),
  revenus_mensuels: z.array(
    z.object({
      mois: z.string().describe("Mois tel qu'affiché (« Jan », « Janvier », « 01 »)."),
      annee: z.number().int().describe("Année si affichée, 0 sinon."),
      texte: z.string().describe("Valeur affichée en chiffres. Chaîne vide si la valeur n'est visible que sous forme de barre ou de courbe."),
      nature: z.enum(NATURES_MENSUEL),
      lisible: z.boolean().describe("true seulement si la valeur est écrite en chiffres sur la capture."),
      capture: z.number().int(),
    }),
  ),
  comparables: z.array(
    z.object({
      nom: z.string(),
      quartier: z.string(),
      type: z.string(),
      chambres: z.string(),
      capacite: z.string(),
      revenu_annuel: z.string(),
      revenu_annuel_bas: z.string(),
      revenu_annuel_haut: z.string(),
      prix_moyen_nuit: z.string(),
      taux_occupation: z.string(),
      note: z.string(),
      nb_avis: z.string(),
      equipements: z.array(z.string()),
      url: z.string().describe("Adresse complète seulement si elle est écrite en entier sur la capture. Chaîne vide sinon : ne jamais reconstruire une adresse."),
      identifiant: z.string().describe("Identifiant d'annonce affiché (ex. numéro Airbnb), chaîne vide sinon."),
      capture: z.number().int(),
    }),
  ),
  parametres_recherche: z.array(z.object({ libelle: z.string(), valeur: z.string() })).describe("Filtres et réglages visibles sur la capture (rayon, chambres, type, dates…)."),
  infos_frais: z.string().describe("Toute mention des frais (plateforme, ménage, taxes) recopiée telle quelle. Chaîne vide sinon."),
  autres_metriques: z.array(z.object({ libelle: z.string(), texte: z.string(), unite: z.string(), capture: z.number().int() })),
  plusieurs_segments: z.boolean().describe("true si les captures montrent des segments différents (autre quartier, autre nombre de chambres…)."),
  segments_detectes: z.array(z.string()),
  avertissements: z.array(z.string()).describe("Problèmes de lecture : flou, valeur coupée, graphique sans chiffres, incohérence visible."),
  champs_manquants: z.array(z.string()),
});
export type ExtractionIA = z.infer<typeof SchemaExtractionIA>;
type LuIA = z.infer<typeof Lu>;

/* ------------------------------ Conversion déterministe ------------------------------ */

const court = (t: string | null | undefined, max: number) => (t ?? "").trim().slice(0, max);

function typeDepuisTexte(t: string | null): TypeSegment | null {
  const c = cle(t ?? "");
  if (!c) return null;
  if (/\bstudio\b/.test(c)) return "studio";
  if (/\briad\b/.test(c)) return "riad";
  if (/\b(villa|house|maison)\b/.test(c)) return "villa";
  if (/\b(appartement|apartment|apt|flat|condo|entire home|logement entier)\b/.test(c)) return "appartement";
  return null;
}

function standingDepuisTexte(t: string | null): Standing | null {
  const c = cle(t ?? "");
  if (!c) return null;
  if (/\b(premium|luxe|luxury|haut de gamme|high end)\b/.test(c)) return "premium";
  if (/\b(superieur|superior|upscale)\b/.test(c)) return "superieur";
  if (/\b(standard|economique|budget|economy)\b/.test(c)) return "standard";
  return null;
}

const oui = (v: "oui" | "non" | "inconnu") => (v === "oui" ? true : v === "non" ? false : null);
const urlSure = (u: string | null) => {
  const t = (u ?? "").trim();
  if (!t) return "";
  try {
    const x = new URL(t);
    return x.protocol === "https:" && !x.username && !x.password ? x.toString().slice(0, 500) : "";
  } catch {
    return "";
  }
};

/**
 * Convertit la sortie de l'IA en données numériques. `nbCaptures` sert à refuser un numéro de capture
 * inexistant. Toute valeur illisible devient null avec un avertissement : rien n'est complété.
 */
export function normaliserExtraction(ia: ExtractionIA, nbCaptures: number): DonneesMarche {
  const d = donneesVides();
  const preuves: Preuve[] = [];
  const avert: string[] = [];
  const capture = (n: number | null | undefined): number | null => (typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= nbCaptures ? n : null);
  const confiance = (c: LuIA["confiance"] | null) => (c === "absente" ? null : c);
  const trace = (champ: string, lu: LuIA) => {
    if (!court(lu.texte, 300) && !court(lu.libelle, 200)) return;
    preuves.push({ champ, texte: court(lu.texte, 300) || null, libelle: court(lu.libelle, 200) || null, capture: capture(lu.capture), confiance: confiance(lu.confiance) });
    if (lu.confiance === "basse") avert.push(`${LIBELLES_CHAMPS[champ] ?? champ} : lecture incertaine (« ${court(lu.texte, 60)} »), à vérifier sur la capture.`);
  };
  const nombre = (champ: string, lu: LuIA, lire = lireNombre) => {
    trace(champ, lu);
    if (!court(lu.texte, 300)) return null;
    const l = lire(lu.texte);
    if (l.probleme) avert.push(`${LIBELLES_CHAMPS[champ] ?? champ} : ${l.probleme}`);
    if (l.valeur !== null && l.valeur < 0) {
      avert.push(`${LIBELLES_CHAMPS[champ] ?? champ} : valeur négative ignorée.`);
      return null;
    }
    return l.valeur;
  };

  // Localisation et logement
  trace("ville", ia.localisation.ville);
  trace("quartier", ia.localisation.quartier);
  d.segment.ville = court(ia.localisation.ville.texte, 80);
  d.segment.quartier = court(ia.localisation.quartier.texte, 120);
  const pays = cle(ia.localisation.pays.texte ?? "");
  if (pays && !["ma", "maroc", "morocco"].includes(pays)) avert.push(`Pays lu : « ${court(ia.localisation.pays.texte, 40)} ». La base est prévue pour le Maroc : vérifiez.`);

  trace("type_logement", ia.logement.type);
  d.segment.type_logement = typeDepuisTexte(ia.logement.type.texte);
  if (ia.logement.type.texte && !d.segment.type_logement) avert.push(`Type de logement « ${court(ia.logement.type.texte, 60)} » non reconnu : choisissez-le.`);
  const chambres = nombre("chambres", ia.logement.chambres, lireEntier);
  d.segment.chambres = d.segment.type_logement === "studio" ? 0 : chambres !== null && chambres <= 20 ? chambres : null;
  if (d.segment.type_logement === "studio" && chambres !== null && chambres > 0) avert.push(`Capture : « studio » et ${chambres} chambre(s) à la fois. Vérifiez la typologie.`);
  const capacite = nombre("capacite", ia.logement.capacite, lireEntier);
  d.segment.capacite = capacite !== null && capacite >= 1 && capacite <= 50 ? capacite : null;
  trace("standing", ia.logement.standing);
  d.segment.standing = standingDepuisTexte(ia.logement.standing.texte);

  // Période et devise
  trace("periode", ia.periode.debut);
  trace("periode", ia.periode.fin);
  d.periode.debut = lireDate(ia.periode.debut.texte);
  d.periode.fin = lireDate(ia.periode.fin.texte);
  d.periode.type = court(ia.periode.type.texte, 120);
  if ((ia.periode.debut.texte && !d.periode.debut) || (ia.periode.fin.texte && !d.periode.fin)) {
    avert.push(`Période lue « ${court(ia.periode.debut.texte, 30)} – ${court(ia.periode.fin.texte, 30)} » : dates à saisir au format JJ/MM/AAAA.`);
  }
  trace("devise", ia.devise);
  d.devise = lireDevise(ia.devise.texte);

  // Base des revenus
  d.base = {
    plateforme_incluse: oui(ia.base_revenus.frais_plateforme_inclus),
    menage_inclus: oui(ia.base_revenus.frais_menage_inclus),
    taxes_incluses: oui(ia.base_revenus.taxes_incluses),
    definition: court(ia.base_revenus.definition.texte, 600),
  };
  trace("base_plateforme", ia.base_revenus.definition);

  // Métriques
  const m = ia.metriques;
  d.metriques.revenu_annuel_bas = nombre("revenu_annuel_bas", m.revenu_annuel_bas);
  d.metriques.revenu_annuel_central = nombre("revenu_annuel_central", m.revenu_annuel_central);
  d.metriques.revenu_annuel_haut = nombre("revenu_annuel_haut", m.revenu_annuel_haut);
  d.metriques.revenu_mensuel_moyen = nombre("revenu_mensuel_moyen", m.revenu_mensuel_moyen);
  d.metriques.adr = nombre("adr", m.prix_moyen_nuit);
  d.metriques.occupation = nombre("occupation", m.taux_occupation, lirePourcentage);
  const nuits = nombre("nuits_reservees", m.nuits_reservees);
  d.metriques.nuits_reservees = nuits !== null && nuits <= 366 ? nuits : null;
  const echantillon = nombre("echantillon", m.nombre_logements, lireEntier);
  d.metriques.echantillon = echantillon;
  d.central_nature = d.metriques.revenu_annuel_central === null ? "inconnu" : ia.nature_valeur_centrale;

  // Percentiles : libellés et valeurs conservés tels quels
  for (const p of ia.percentiles.slice(0, 20)) {
    const l = lireNombre(p.texte);
    if (l.probleme) avert.push(`Percentile « ${court(p.libelle, 40)} » : ${l.probleme}`);
    const rang = p.rang || (Number(cle(p.libelle).match(/(?:^|[^0-9])(\d{1,2})(?:st|nd|rd|th|e|er|eme)?(?![0-9])/)?.[1]) || null);
    d.percentiles.push({ libelle: court(p.libelle, 80) || "Percentile", rang: rang && rang >= 1 && rang <= 99 ? rang : null, metrique: p.metrique, valeur: l.valeur !== null && l.valeur >= 0 ? l.valeur : null });
    if (p.texte) preuves.push({ champ: `percentile:${court(p.libelle, 40)}`, texte: court(p.texte, 300), libelle: court(p.libelle, 200), capture: capture(p.capture), confiance: p.confiance });
  }

  // Revenus mensuels : uniquement les valeurs lisibles, jamais reconstituées depuis un graphique
  const vus = new Set<string>();
  let illisibles = 0;
  for (const r of ia.revenus_mensuels.slice(0, 24)) {
    const mois = lireMois(r.mois);
    const l = lireNombre(r.texte);
    if (!r.lisible || mois === null || l.valeur === null || l.valeur < 0) {
      illisibles++;
      continue;
    }
    const k = `${r.annee || ""}-${mois}-${r.nature}`;
    if (vus.has(k)) {
      avert.push(`Revenus mensuels : le mois ${mois} apparaît deux fois, seule la première valeur est gardée.`);
      continue;
    }
    vus.add(k);
    d.mensuels.push({ mois, annee: r.annee >= 2000 && r.annee <= 2100 ? r.annee : null, valeur: l.valeur, nature: r.nature });
  }
  if (illisibles) avert.push(`${illisibles} valeur(s) mensuelle(s) illisible(s) ou non chiffrée(s) : elles ne sont pas reprises.`);

  // Comparables
  for (const c of ia.comparables.slice(0, 30)) {
    const val = (t: string | null, lire = lireNombre) => {
      const l = lire(t);
      return l.valeur !== null && l.valeur >= 0 ? l.valeur : null;
    };
    const url = urlSure(c.url);
    if (c.url && !url) avert.push(`Comparable « ${court(c.nom, 40)} » : lien « ${court(c.url, 60)} » non retenu (adresse https complète attendue).`);
    const ch = val(c.chambres, lireEntier);
    const cap = val(c.capacite, lireEntier);
    const note = val(c.note);
    const avis = val(c.nb_avis, lireEntier);
    d.comparables.push({
      nom: court(c.nom, 200),
      quartier: court(c.quartier, 120),
      type_logement: court(c.type, 60),
      chambres: ch !== null && ch <= 20 ? ch : null,
      capacite: cap !== null && cap >= 1 && cap <= 50 ? cap : null,
      revenu_annuel: val(c.revenu_annuel),
      revenu_annuel_bas: val(c.revenu_annuel_bas),
      revenu_annuel_haut: val(c.revenu_annuel_haut),
      adr: val(c.prix_moyen_nuit),
      occupation: val(c.taux_occupation, lirePourcentage),
      note: note !== null && note <= 5 ? note : null,
      nb_avis: avis,
      equipements: c.equipements.map((e) => court(e, 80)).filter(Boolean).slice(0, 40),
      url,
      identifiant: court(c.identifiant, 100),
      capture: capture(c.capture),
      affichable: true,
    });
  }

  d.parametres_recherche = ia.parametres_recherche.slice(0, 30).map((p) => ({ libelle: court(p.libelle, 120), valeur: court(p.valeur, 300) }));
  d.infos_frais = court(ia.infos_frais, 1000);
  d.autres = ia.autres_metriques.slice(0, 30).map((a) => ({ libelle: court(a.libelle, 120), valeur: lireNombre(a.texte).valeur, unite: court(a.unite, 30) }));
  d.plusieurs_segments = ia.plusieurs_segments;
  if (ia.plusieurs_segments) avert.push(`Les captures semblent concerner plusieurs segments (${ia.segments_detectes.map((s) => court(s, 60)).join(" ; ") || "non précisés"}). Vérifiez avant de regrouper.`);
  for (const a of ia.avertissements.slice(0, 20)) avert.push(`Signalé à la lecture : ${court(a, 300)}`);

  d.preuves = preuves.slice(0, 300);
  d.avertissements = [...new Set(avert)].slice(0, 60);
  d.manquants = [...new Set([...champsManquants(d), ...ia.champs_manquants.map((c) => court(c, 80))])].slice(0, 60);
  return d;
}

/* ------------------------------ Contrôles ------------------------------ */

export function champsManquants(d: DonneesMarche): string[] {
  const m: string[] = [];
  if (!d.segment.ville) m.push("ville");
  if (!d.segment.quartier) m.push("quartier");
  if (!d.segment.type_logement) m.push("type_logement");
  if (d.segment.chambres === null) m.push("chambres");
  if (!d.devise) m.push("devise");
  if (!d.periode.debut && !d.periode.fin && !d.periode.type) m.push("periode");
  const r = d.metriques;
  if (r.revenu_annuel_bas === null && r.revenu_annuel_central === null && r.revenu_annuel_haut === null) m.push("revenus");
  if (r.adr === null) m.push("adr");
  if (r.occupation === null) m.push("occupation");
  if (d.base.plateforme_incluse === null) m.push("base_plateforme");
  if (d.base.menage_inclus === null) m.push("base_menage");
  return m;
}

/** Ce qui empêche de valider des données (les autres manques sont signalés mais n'empêchent rien). */
export function champsBloquants(d: DonneesMarche): string[] {
  return champsManquants(d).filter((c) => ["ville", "quartier", "type_logement", "chambres", "devise", "revenus"].includes(c));
}

export type Incoherence = { niveau: "alerte" | "bloquant"; message: string };

export function controlerDonnees(d: DonneesMarche): Incoherence[] {
  const r: Incoherence[] = [];
  const { revenu_annuel_bas: bas, revenu_annuel_central: centre, revenu_annuel_haut: haut, adr, occupation, revenu_mensuel_moyen: mensuel } = d.metriques;
  if (bas !== null && haut !== null && bas > haut) r.push({ niveau: "bloquant", message: "Le revenu annuel bas est supérieur au revenu haut." });
  if (centre !== null && bas !== null && centre < bas) r.push({ niveau: "alerte", message: "La valeur centrale est inférieure au revenu bas." });
  if (centre !== null && haut !== null && centre > haut) r.push({ niveau: "alerte", message: "La valeur centrale est supérieure au revenu haut." });
  if (d.segment.type_logement === "studio" && (d.segment.chambres ?? 0) > 0) r.push({ niveau: "bloquant", message: "Un studio compte 0 chambre." });
  if (d.segment.chambres_max !== null && d.segment.chambres !== null && d.segment.chambres_max <= d.segment.chambres) r.push({ niveau: "bloquant", message: "Le regroupement doit aller au-delà du nombre de chambres." });
  if (d.periode.debut && d.periode.fin && d.periode.fin < d.periode.debut) r.push({ niveau: "bloquant", message: "La période se termine avant de commencer." });

  const reference = centre ?? (bas !== null && haut !== null ? (bas + haut) / 2 : null);
  if (adr !== null && occupation !== null && reference) {
    const theorique = adr * (occupation / 100) * 365;
    const ecart = theorique / reference;
    if (ecart < 0.65 || ecart > 1.35) {
      r.push({ niveau: "alerte", message: `Prix moyen × occupation × 365 = ${Math.round(theorique).toLocaleString("fr-FR")}, loin du revenu annuel (${Math.round(reference).toLocaleString("fr-FR")}). Vérifiez les unités ou la période (frais de ménage inclus ?).` });
    }
  }
  if (mensuel !== null && reference && Math.abs((mensuel * 12) / reference - 1) > 0.25) r.push({ niveau: "alerte", message: "Le revenu mensuel moyen × 12 ne correspond pas au revenu annuel (écart supérieur à 25 %)." });

  const parMetrique = new Map<string, { rang: number; valeur: number }[]>();
  for (const p of d.percentiles) if (p.rang !== null && p.valeur !== null) parMetrique.set(p.metrique, [...(parMetrique.get(p.metrique) ?? []), { rang: p.rang, valeur: p.valeur }]);
  for (const [metrique, liste] of parMetrique) {
    const tri = [...liste].sort((a, b) => a.rang - b.rang);
    if (tri.some((p, i) => i > 0 && p.valeur < tri[i - 1].valeur)) r.push({ niveau: "alerte", message: `Percentiles (${metrique}) : les valeurs ne croissent pas avec le rang.` });
  }

  const historiques = d.mensuels.filter((x) => x.nature !== "prevision");
  if (historiques.length === 12 && reference) {
    const somme = historiques.reduce((s, x) => s + x.valeur, 0);
    if (Math.abs(somme / reference - 1) > 0.25) r.push({ niveau: "alerte", message: "La somme des 12 revenus mensuels s'écarte de plus de 25 % du revenu annuel." });
  }
  if (d.mensuels.some((x) => x.nature === "prevision") && d.mensuels.some((x) => x.nature === "historique")) r.push({ niveau: "alerte", message: "Les revenus mensuels mélangent historique et prévision : ils seront affichés séparément." });
  const ch = d.segment.chambres;
  const autres = d.comparables.filter((c) => c.chambres !== null && ch !== null && c.chambres !== ch).length;
  if (autres) r.push({ niveau: "alerte", message: `${autres} comparable(s) n'ont pas le même nombre de chambres que le segment.` });
  return r;
}
