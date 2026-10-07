import { calculerVersement, repartirTva, TAUX_TVA_DEFAUT, type ResultatVersement } from "./compta.ts";
import { etatsDuMois, nuitsReservees, tauxOccupation, type ReservationCalendrier } from "./calendrier.ts";
import { moisSuivant, nbJoursDuMois, premierDuMois, type Mois } from "./dates.ts";

export type VersementBrut = {
  id: string;
  logement_id: string;
  date_versement: string;
  montant_recu: number;
  frais_menage: number;
  taux_commission: number;
  note?: string;
  reservation_id?: string | null;
};

export type LigneCalculee = VersementBrut & { calcul: ResultatVersement };

export function calculerLigne(v: VersementBrut, tauxTva: number = TAUX_TVA_DEFAUT): LigneCalculee {
  return {
    ...v,
    calcul: calculerVersement({
      montantRecu: v.montant_recu,
      fraisMenage: v.frais_menage,
      tauxCommission: v.taux_commission,
      tauxTva,
    }),
  };
}

export type Totaux = {
  nbVersements: number;
  montantsRecus: number;
  menage: number;
  loyerNet: number;
  /** Somme des commissions TTC : ce que Perfect Stay reçoit au titre de la commission */
  commissionTTC: number;
  commissionHT: number;
  tva: number;
  revenuProprietaire: number;
  /** Ménage + commission TTC : l'argent réellement encaissé par Perfect Stay */
  encaisse: number;
};

const c = (mad: number) => Math.round(mad * 100);
const m = (centimes: number) => centimes / 100;

/**
 * Totaux d'un ensemble de versements. Tout est additionné en centimes, puis la TVA est
 * calculée UNE seule fois sur le total (c'est ainsi qu'une facture se calcule), de sorte que
 * HT + TVA = TTC exactement.
 */
export function totaliser(lignes: LigneCalculee[], tauxTva: number = TAUX_TVA_DEFAUT): Totaux {
  const somme = (f: (l: LigneCalculee) => number) => lignes.reduce((s, l) => s + c(f(l)), 0);
  const commission = somme((l) => l.calcul.commission);
  const menage = somme((l) => l.calcul.fraisMenage);
  const loyerNet = somme((l) => l.calcul.loyerNetHorsMenage);
  const { ht, tva } = repartirTva(m(commission), tauxTva);
  return {
    nbVersements: lignes.length,
    montantsRecus: m(somme((l) => l.calcul.montantRecu)),
    menage: m(menage),
    loyerNet: m(loyerNet),
    commissionTTC: m(commission),
    commissionHT: ht,
    tva,
    revenuProprietaire: m(loyerNet - commission),
    encaisse: m(menage + commission),
  };
}

export const TOTAUX_VIDES: Totaux = totaliser([]);

/** Le versement tombe-t-il dans ce mois ? */
export function dansLeMois(date: string, mois: Mois) {
  return date >= premierDuMois(mois) && date < premierDuMois(moisSuivant(mois));
}

export type LigneSynthese = {
  logementId: string;
  nom: string;
  nbSejours: number;
  nuits: number;
  joursDuMois: number;
  /** null quand aucun calendrier n'est relié au logement */
  occupation: number | null;
  totaux: Totaux;
  depenses: number;
};

export type Synthese = {
  mois: Mois;
  lignes: LigneSynthese[];
  total: Totaux;
  depensesParCategorie: Record<string, number>;
  depensesTotal: number;
  /** Ce que Perfect Stay garde : encaissé (ménage + commission TTC) moins les dépenses */
  solde: number;
};

export function syntheseDuMois(args: {
  mois: Mois;
  tauxTva: number;
  logements: { id: string; nom: string; aUnCalendrier: boolean }[];
  versements: VersementBrut[];
  reservations: (ReservationCalendrier & { logement_id: string })[];
  depenses: { logement_id: string | null; categorie: string; montant: number; date_depense: string }[];
}): Synthese {
  const { mois, tauxTva } = args;
  const versements = args.versements.filter((v) => dansLeMois(v.date_versement, mois));
  const depenses = args.depenses.filter((d) => dansLeMois(d.date_depense, mois));

  const lignes: LigneSynthese[] = args.logements.map((l) => {
    const siens = versements.filter((v) => v.logement_id === l.id).map((v) => calculerLigne(v, tauxTva));
    const etats = etatsDuMois(
      mois,
      args.reservations.filter((r) => r.logement_id === l.id),
    );
    const sejours = args.reservations.filter(
      (r) => r.logement_id === l.id && r.type === "reservation" && r.arrivee < premierDuMois(moisSuivant(mois)) && r.depart > premierDuMois(mois),
    );
    return {
      logementId: l.id,
      nom: l.nom,
      nbSejours: sejours.length,
      nuits: nuitsReservees(etats),
      joursDuMois: nbJoursDuMois(mois),
      occupation: l.aUnCalendrier ? tauxOccupation(etats) : null,
      totaux: totaliser(siens, tauxTva),
      depenses: m(depenses.filter((d) => d.logement_id === l.id).reduce((s, d) => s + c(d.montant), 0)),
    };
  });

  const toutes = versements.filter((v) => args.logements.some((l) => l.id === v.logement_id)).map((v) => calculerLigne(v, tauxTva));
  const total = totaliser(toutes, tauxTva);

  const parCategorie: Record<string, number> = {};
  for (const d of depenses) parCategorie[d.categorie] = m(c(parCategorie[d.categorie] ?? 0) + c(d.montant));
  const depensesTotal = m(depenses.reduce((s, d) => s + c(d.montant), 0));

  return {
    mois,
    lignes,
    total,
    depensesParCategorie: parCategorie,
    depensesTotal,
    solde: m(c(total.encaisse) - c(depensesTotal)),
  };
}

/** Évolution en % par rapport à une valeur précédente (null s'il n'y a pas de base de comparaison) */
export function variation(precedent: number, actuel: number): number | null {
  if (!precedent) return null;
  return ((actuel - precedent) / Math.abs(precedent)) * 100;
}
