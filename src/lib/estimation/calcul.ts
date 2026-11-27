/*
  Moteur de calcul des estimations : déterministe, sans IA, testé.
  Tous les calculs se font sur des valeurs NON arrondies ; l'arrondi n'intervient qu'à l'affichage.

  Formule par défaut (configuration initiale, modifiable dans les paramètres) :
    revenu après plateforme = brut − brut × taux plateforme × (1 + TVA plateforme)
    commission Perfect Stay = base × taux commission × (1 + TVA commission)
      base = revenu après plateforme (par défaut) ou brut
    revenu propriétaire après commissions = revenu après plateforme − commission
  Avec 18 % puis 20 % : le propriétaire garde 65,6 % du brut.
*/

export type ParametresFinanciers = {
  tauxPlateforme: number;
  tvaPlateforme: number;
  tauxCommission: number;
  tvaCommission: number;
  baseCommission: "apres_plateforme" | "brut";
  menageMode: "refacture_voyageur" | "a_charge_proprietaire" | "inconnu";
  menagePlateformePreleve: boolean;
  /** Part du revenu PriceLabs correspondant aux frais de ménage, quand ces frais y sont inclus */
  menagePartRevenu: number | null;
  methodeScenarios: "fourchette" | "percentiles";
  arrondiMensuel: 1 | 10 | 100;
  devise: string;
};

export type MarcheCalcul = {
  revenuAnnuelBas: number | null;
  revenuAnnuelCentral: number | null;
  revenuAnnuelHaut: number | null;
  natureCentral: "moyenne" | "mediane" | "percentile" | "prevision" | "autre" | "inconnu";
  percentiles: { libelle: string; rang: number | null; metrique: string; valeur: number | null }[];
  basePlateformeIncluse: boolean | null;
  baseMenageInclus: boolean | null;
  baseTaxesIncluses: boolean | null;
  devise: string | null;
};

export const POSTES_CHARGES = [
  { cle: "eau", libelle: "Eau" },
  { cle: "electricite", libelle: "Électricité" },
  { cle: "internet", libelle: "Internet" },
  { cle: "syndic", libelle: "Syndic" },
  { cle: "entretien", libelle: "Entretien et maintenance" },
  { cle: "autres", libelle: "Autres dépenses récurrentes" },
] as const;
export type CleCharge = (typeof POSTES_CHARGES)[number]["cle"];
/** Charges mensuelles du propriétaire en courte durée (null = non renseignée, donc non incluse) */
export type Charges = Record<CleCharge, number | null>;
export const chargesVides = (): Charges => ({ eau: null, electricite: null, internet: null, syndic: null, entretien: null, autres: null });

export type SourceLoyer = "crm" | "declare" | "estime_marche" | "fourchette";
export const LIBELLES_SOURCE_LOYER: Record<SourceLoyer, string> = {
  crm: "Loyer actuel (fiche CRM)",
  declare: "Loyer déclaré par le propriétaire",
  estime_marche: "Loyer longue durée estimé (marché)",
  fourchette: "Fourchette de loyers longue durée",
};
export type LongueDuree = {
  source: SourceLoyer | null;
  loyer: number | null;
  loyerBas: number | null;
  loyerHaut: number | null;
  /** Charges mensuelles restant au propriétaire en longue durée (null = non renseignées) */
  charges: number | null;
  date: string | null;
};

export type Offre = { titre: string; description: string; dureeMois: number | null; conditions: string };

export type EntreeCalcul = {
  params: ParametresFinanciers;
  marche: MarcheCalcul;
  charges: Charges;
  longueDuree: LongueDuree;
  offre: Offre | null;
  /** L'utilisateur a confirmé la base de calcul quand la définition des revenus PriceLabs est inconnue */
  baseConfirmee: boolean;
};

export type CleScenario = "prudent" | "central" | "haut";
export type Scenario = {
  cle: CleScenario;
  libelle: string;
  source: string;
  derive: boolean;
  formule: string | null;
  brut: number;
  fraisPlateforme: number;
  apresPlateforme: number;
  menage: number;
  commission: number;
  apresCommissions: number;
  charges: number | null;
  resultat: number | null;
};

export type Comparaison = {
  source: SourceLoyer | null;
  loyerMensuel: number;
  loyerDerive: boolean;
  courteMensuelle: number;
  differenceMensuelle: number;
  differenceAnnuelle: number;
  /** null quand le loyer est nul ou non fiable : aucun pourcentage artificiel */
  pourcentage: number | null;
  base: "revenus" | "resultat";
  note: string;
};

export type ResultatCalcul = {
  scenarios: Scenario[];
  central: Scenario | null;
  fourchette: boolean;
  tauxEffectifPlateforme: number;
  tauxEffectifCommission: number;
  deductionPlateforme: boolean;
  partProprietaire: number | null;
  mentionMenageSansImpact: boolean;
  chargesIncluses: string[];
  chargesNonIncluses: string[];
  chargesMensuelles: number | null;
  comparaison: Comparaison | null;
  offre: (Offre & { valeurPonctuelle: number | null }) | null;
  avertissements: string[];
  bloquants: string[];
};

const LIBELLE: Record<CleScenario, string> = { prudent: "Prudent", central: "Central", haut: "Haut" };

/** Arrondi d'affichage (au dirham, à la dizaine ou à la centaine). */
export const arrondir = (n: number, pas = 1) => Math.round(n / pas) * pas;
export const mensuel = (annuel: number) => annuel / 12;

function sourcesScenarios(m: MarcheCalcul, methode: ParametresFinanciers["methodeScenarios"], avert: string[]) {
  const r: { cle: CleScenario; brut: number; source: string; derive: boolean; formule: string | null }[] = [];
  if (methode === "percentiles") {
    const p = (rang: number) => m.percentiles.find((x) => x.metrique === "revenu_annuel" && x.rang === rang && x.valeur !== null);
    const [p25, p50, p75] = [p(25), p(50), p(75)];
    if (p25 && p50 && p75) {
      return [
        { cle: "prudent" as const, brut: p25.valeur!, source: `${p25.libelle} (PriceLabs)`, derive: false, formule: null },
        { cle: "central" as const, brut: p50.valeur!, source: `${p50.libelle} (PriceLabs)`, derive: false, formule: null },
        { cle: "haut" as const, brut: p75.valeur!, source: `${p75.libelle} (PriceLabs)`, derive: false, formule: null },
      ];
    }
    avert.push("Méthode « percentiles » choisie, mais les 25e, 50e et 75e percentiles de revenu annuel ne sont pas tous disponibles : la fourchette bas/haut est utilisée.");
  }
  const { revenuAnnuelBas: bas, revenuAnnuelCentral: centre, revenuAnnuelHaut: haut } = m;
  if (bas !== null) r.push({ cle: "prudent", brut: bas, source: "Revenu annuel bas (PriceLabs)", derive: false, formule: null });
  if (centre !== null) {
    const nature = { moyenne: "Moyenne", mediane: "Médiane", percentile: "Percentile", prevision: "Prévision", autre: "Valeur centrale", inconnu: "Valeur centrale" }[m.natureCentral];
    r.push({ cle: "central", brut: centre, source: `${nature} (PriceLabs)`, derive: false, formule: null });
  } else if (bas !== null && haut !== null) {
    r.push({ cle: "central", brut: (bas + haut) / 2, source: "Estimation centrale calculée (moyenne du bas et du haut)", derive: true, formule: "(revenu annuel bas + revenu annuel haut) / 2" });
  }
  if (haut !== null) r.push({ cle: "haut", brut: haut, source: "Revenu annuel haut (PriceLabs)", derive: false, formule: null });
  if (r.length === 1) {
    avert.push("Une seule valeur de revenu est disponible : l'estimation est présentée sans fourchette.");
    r[0].cle = "central";
  }
  return r;
}

export function calculer(e: EntreeCalcul): ResultatCalcul {
  const { params: p, marche: m } = e;
  const avertissements: string[] = [];
  const bloquants: string[] = [];

  if (m.devise && m.devise !== p.devise) bloquants.push(`Les données de marché sont en ${m.devise} et l'estimation en ${p.devise} : aucune conversion n'est faite.`);
  if (m.baseTaxesIncluses === true) avertissements.push("Les revenus PriceLabs incluent des taxes (taxe de séjour) qui sont reversées : le revenu peut être surestimé.");

  const tauxEffectifPlateforme = p.tauxPlateforme * (1 + p.tvaPlateforme);
  const tauxEffectifCommission = p.tauxCommission * (1 + p.tvaCommission);
  let deductionPlateforme = true;
  if (m.basePlateformeIncluse === false) {
    deductionPlateforme = false;
    avertissements.push("Les revenus PriceLabs sont déjà nets des frais de plateforme : aucune déduction supplémentaire n'est appliquée.");
  } else if (m.basePlateformeIncluse === null) {
    avertissements.push("La définition des revenus PriceLabs (frais de plateforme inclus ou non) n'est pas connue : la déduction des frais de plateforme est appliquée par précaution.");
    if (!e.baseConfirmee) bloquants.push("Confirmez la base de calcul des revenus avant de valider l'estimation.");
  }

  // Ménage : déduit seulement s'il est inclus dans le revenu et que sa part est connue
  let partMenage = 0;
  let mentionMenageSansImpact = false;
  if (m.baseMenageInclus === true) {
    if (p.menagePartRevenu !== null) partMenage = p.menagePartRevenu;
    else avertissements.push("Les revenus PriceLabs incluent les frais de ménage, mais leur part n'est pas paramétrée : le revenu peut être surestimé.");
  } else if (m.baseMenageInclus === false) {
    if (p.menageMode === "refacture_voyageur" && !p.menagePlateformePreleve) mentionMenageSansImpact = true;
    if (p.menageMode === "a_charge_proprietaire") avertissements.push("Le ménage est à la charge du propriétaire et n'est pas inclus dans les revenus : son coût n'est pas déduit, sauf s'il figure dans les charges.");
    if (p.menageMode === "inconnu") avertissements.push("Le traitement des frais de ménage n'est pas paramétré : la mention « sans impact sur votre revenu » n'est pas affichée.");
  } else {
    avertissements.push("On ignore si les revenus PriceLabs incluent les frais de ménage.");
  }

  const postes = POSTES_CHARGES.filter((c) => e.charges[c.cle] !== null && Number.isFinite(e.charges[c.cle]!) && e.charges[c.cle]! >= 0);
  const chargesMensuelles = postes.length ? postes.reduce((s, c) => s + e.charges[c.cle]!, 0) : null;

  const sources = sourcesScenarios(m, p.methodeScenarios, avertissements);
  if (!sources.length) bloquants.push("Aucun revenu annuel n'est disponible dans les données de marché.");
  const scenarios: Scenario[] = sources.map((s) => {
    const fraisPlateforme = deductionPlateforme ? s.brut * tauxEffectifPlateforme : 0;
    const apresPlateforme = s.brut - fraisPlateforme;
    const menage = apresPlateforme * partMenage;
    const base = p.baseCommission === "brut" ? s.brut * (1 - partMenage) : apresPlateforme - menage;
    const commission = base * tauxEffectifCommission;
    const apresCommissions = apresPlateforme - menage - commission;
    const charges = chargesMensuelles === null ? null : chargesMensuelles * 12;
    return { cle: s.cle, libelle: LIBELLE[s.cle], source: s.source, derive: s.derive, formule: s.formule, brut: s.brut, fraisPlateforme, apresPlateforme, menage, commission, apresCommissions, charges, resultat: charges === null ? null : apresCommissions - charges };
  });
  const central = scenarios.find((s) => s.cle === "central") ?? null;
  const fourchette = scenarios.some((s) => s.cle === "prudent") && scenarios.some((s) => s.cle === "haut");

  // Comparaison avec la longue durée
  let comparaison: Comparaison | null = null;
  const ld = e.longueDuree;
  let loyer = ld.loyer;
  let loyerDerive = false;
  if (loyer === null && ld.source === "fourchette" && ld.loyerBas !== null && ld.loyerHaut !== null) {
    loyer = (ld.loyerBas + ld.loyerHaut) / 2;
    loyerDerive = true;
  }
  if (central && loyer !== null) {
    const surResultat = central.resultat !== null && ld.charges !== null;
    const courte = mensuel(surResultat ? central.resultat! : central.apresCommissions);
    const longue = surResultat ? loyer - ld.charges! : loyer;
    const diff = courte - longue;
    comparaison = {
      source: ld.source,
      loyerMensuel: longue,
      loyerDerive,
      courteMensuelle: courte,
      differenceMensuelle: diff,
      differenceAnnuelle: diff * 12,
      pourcentage: longue > 0 ? (diff / longue) * 100 : null,
      base: surResultat ? "resultat" : "revenus",
      note: surResultat
        ? "Comparaison après charges du propriétaire, dans les deux modes d'exploitation."
        : "Comparaison des revenus avant charges d'exploitation et fiscalité, dans les deux modes d'exploitation.",
    };
    if (longue <= 0) avertissements.push("Le loyer longue durée est nul : le gain en pourcentage n'est pas calculé.");
    if (diff < 0) avertissements.push("Avec ces données, la location longue durée rapporte davantage que la courte durée.");
  }

  const offre = e.offre ? { ...e.offre, valeurPonctuelle: e.offre.dureeMois && central ? mensuel(central.commission) * e.offre.dureeMois : null } : null;

  return {
    scenarios,
    central,
    fourchette,
    tauxEffectifPlateforme,
    tauxEffectifCommission,
    deductionPlateforme,
    partProprietaire: central && central.brut > 0 ? central.apresCommissions / central.brut : null,
    mentionMenageSansImpact,
    chargesIncluses: postes.map((c) => c.libelle),
    chargesNonIncluses: POSTES_CHARGES.filter((c) => !postes.includes(c)).map((c) => c.libelle),
    chargesMensuelles,
    comparaison,
    offre,
    avertissements,
    bloquants,
  };
}

/** Paramètres de la base (colonnes snake_case) vers le moteur. */
export function parametresDepuisBase(r: Record<string, unknown>): ParametresFinanciers {
  const n = (v: unknown) => Number(v);
  const arrondi = n(r.arrondi_mensuel);
  return {
    tauxPlateforme: n(r.taux_plateforme),
    tvaPlateforme: n(r.tva_plateforme),
    tauxCommission: n(r.taux_commission),
    tvaCommission: n(r.tva_commission),
    baseCommission: r.base_commission === "brut" ? "brut" : "apres_plateforme",
    menageMode: r.menage_mode === "refacture_voyageur" || r.menage_mode === "a_charge_proprietaire" ? r.menage_mode : "inconnu",
    menagePlateformePreleve: Boolean(r.menage_plateforme_preleve),
    menagePartRevenu: r.menage_part_revenu === null || r.menage_part_revenu === undefined ? null : n(r.menage_part_revenu),
    methodeScenarios: r.methode_scenarios === "percentiles" ? "percentiles" : "fourchette",
    arrondiMensuel: arrondi === 1 || arrondi === 10 ? arrondi : 100,
    devise: String(r.devise ?? "MAD"),
  };
}
