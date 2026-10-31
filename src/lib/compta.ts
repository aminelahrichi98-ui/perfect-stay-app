/**
 * Formule de calcul des versements (cahier des charges §6.10, validée par Amine).
 *
 *   Loyer net hors ménage = Montant reçu − Frais de ménage
 *   Commission Perfect Stay = Loyer net hors ménage × taux du logement
 *   Revenu net propriétaire = Loyer net hors ménage − Commission
 *   Encaissé par Perfect Stay = Frais de ménage + Commission
 *
 * Quand le logement indique que le ménage est encaissé par le propriétaire, la commission ne change pas
 * (elle porte toujours sur le loyer hors ménage) mais le ménage revient au propriétaire :
 *   Revenu net propriétaire = Loyer net hors ménage − Commission + Frais de ménage
 *   Encaissé par Perfect Stay = Commission
 *
 * Tout est calculé en centimes entiers pour éviter les erreurs d'arrondi.
 * Le taux est en pourcentage (20 = 20 %) et propre à chaque logement.
 */

/** TVA marocaine par défaut */
export const TAUX_TVA_DEFAUT = 20;

export type EntreeVersement = {
  /** Chiffre d'affaires de la réservation − commission de la plateforme (MAD) */
  montantRecu: number;
  /** Frais de ménage fixes du logement (MAD) */
  fraisMenage: number;
  /** Taux de commission du logement, en % */
  tauxCommission: number;
  /** Le ménage est-il encaissé par le propriétaire (et non par Perfect Stay) ? */
  menageProprietaire?: boolean;
  /** TVA en % (20 par défaut) */
  tauxTva?: number;
};

export type ResultatVersement = {
  montantRecu: number;
  fraisMenage: number;
  /** Part du ménage qui revient à Perfect Stay (gestionnaire) ou au propriétaire : l'une des deux vaut 0 */
  menageGestionnaire: number;
  menageProprietaire: number;
  loyerNetHorsMenage: number;
  /** Commission TTC : c'est ce que Perfect Stay reçoit réellement */
  commission: number;
  /** Même commission hors taxe, et la TVA qu'elle contient */
  commissionHT: number;
  tvaCommission: number;
  revenuProprietaire: number;
  encaisseParPerfectStay: number;
};

const enCentimes = (mad: number) => Math.round(mad * 100);
const enMad = (centimes: number) => centimes / 100;

/**
 * Sépare un montant TTC en hors taxe et TVA. L'arrondi se fait une seule fois, sur le HT,
 * la TVA étant le reste : HT + TVA = TTC, toujours exactement.
 */
export function repartirTva(ttc: number, tauxTva: number = TAUX_TVA_DEFAUT) {
  if (![ttc, tauxTva].every(Number.isFinite) || tauxTva < 0) throw new Error("Montant ou taux de TVA invalide.");
  const ttcCentimes = enCentimes(ttc);
  const htCentimes = Math.round((ttcCentimes * 100) / (100 + tauxTva));
  return { ht: enMad(htCentimes), tva: enMad(ttcCentimes - htCentimes), ttc: enMad(ttcCentimes) };
}

export function calculerVersement({
  montantRecu,
  fraisMenage,
  tauxCommission,
  menageProprietaire = false,
  tauxTva = TAUX_TVA_DEFAUT,
}: EntreeVersement): ResultatVersement {
  if (![montantRecu, fraisMenage, tauxCommission].every(Number.isFinite)) {
    throw new Error("Les montants doivent être des nombres valides.");
  }
  if (tauxCommission < 0 || tauxCommission > 100) {
    throw new Error("Le taux de commission doit être compris entre 0 et 100 %.");
  }

  const recu = enCentimes(montantRecu);
  const menage = enCentimes(fraisMenage);
  const loyerNet = recu - menage;
  const commission = Math.round((loyerNet * tauxCommission) / 100);
  const menagePerfectStay = menageProprietaire ? 0 : menage;
  const menagePourProprietaire = menageProprietaire ? menage : 0;
  const revenuProprietaire = loyerNet - commission + menagePourProprietaire;
  const encaisse = menagePerfectStay + commission;

  const { ht, tva } = repartirTva(enMad(commission), tauxTva);

  return {
    montantRecu: enMad(recu),
    fraisMenage: enMad(menage),
    menageGestionnaire: enMad(menagePerfectStay),
    menageProprietaire: enMad(menagePourProprietaire),
    loyerNetHorsMenage: enMad(loyerNet),
    commission: enMad(commission),
    commissionHT: ht,
    tvaCommission: tva,
    revenuProprietaire: enMad(revenuProprietaire),
    encaisseParPerfectStay: enMad(encaisse),
  };
}
