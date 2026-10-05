import { classerEvenement, type EvenementIcal, type TypeEvenement } from "./ical.ts";
import type { Jour } from "./dates.ts";

/*
  Synchronisation d'un calendrier iCal : compare le flux reçu avec les réservations déjà enregistrées,
  puis crée / met à jour / annule les réservations et les ménages du jour de départ.
  Ce fichier ne parle pas à la base : il passe par un « dépôt » (voir `Depot`), ce qui permet de
  le tester entièrement avec un faux dépôt en mémoire.
*/

export type ReservationBD = {
  id: string;
  uid: string;
  type: TypeEvenement;
  code: string;
  resume: string;
  arrivee: Jour;
  depart: Jour;
  statut: "confirmee" | "annulee";
};

export type NouvelleReservation = {
  logement_id: string;
  ical_id: string;
  plateforme: string;
  uid: string;
  type: TypeEvenement;
  code: string;
  resume: string;
  arrivee: Jour;
  depart: Jour;
};

export type ChampsReservation = Partial<Pick<ReservationBD, "type" | "code" | "resume" | "arrivee" | "depart" | "statut">> & {
  annule_le?: string | null;
  vu_le?: string;
};

export type TacheMenageBD = { id: string; reservation_id: string; echeance: Jour | null; statut: string };

export interface Depot {
  reservationsDuLien(icalId: string): Promise<ReservationBD[]>;
  tachesDesReservations(reservationIds: string[]): Promise<TacheMenageBD[]>;
  inserer(lignes: NouvelleReservation[]): Promise<{ id: string; uid: string }[]>;
  mettreAJour(id: string, champs: ChampsReservation): Promise<void>;
  creerMenage(tache: { titre: string; logement_id: string; reservation_id: string; echeance: Jour; responsable_id: string | null }): Promise<void>;
  mettreAJourTache(id: string, champs: { echeance?: Jour; statut?: string }): Promise<void>;
}

export type LienCalendrier = { id: string; logementId: string; nomLogement: string; plateforme: string };

export type ResultatSynchro = {
  evenements: number;
  nouvelles: number;
  modifiees: number;
  annulees: number;
  retablies: number;
  menagesCrees: number;
  menagesMisAJour: number;
  menagesAnnules: number;
};

/** Seuil de sécurité : un flux vide alors qu'au moins N réservations à venir existent n'est pas cru. */
const SEUIL_FLUX_VIDE = 3;

export async function appliquerFlux(
  depot: Depot,
  lien: LienCalendrier,
  evenements: EvenementIcal[],
  contexte: { aujourdhui: Jour; maintenant: string; responsableMenage: string | null },
): Promise<ResultatSynchro> {
  const { aujourdhui, maintenant, responsableMenage } = contexte;
  const resultat: ResultatSynchro = {
    evenements: evenements.length,
    nouvelles: 0,
    modifiees: 0,
    annulees: 0,
    retablies: 0,
    menagesCrees: 0,
    menagesMisAJour: 0,
    menagesAnnules: 0,
  };

  const existantes = await depot.reservationsDuLien(lien.id);
  const parUid = new Map(existantes.map((r) => [r.uid, r]));

  // Garde-fou : un calendrier soudain vide ne doit pas annuler tout l'avenir
  const aVenirActives = existantes.filter((r) => r.statut === "confirmee" && r.type === "reservation" && r.depart >= aujourdhui);
  if (evenements.length === 0 && aVenirActives.length >= SEUIL_FLUX_VIDE) {
    throw new Error(
      `Le calendrier reçu est vide alors que ${aVenirActives.length} réservations à venir sont enregistrées : synchronisation ignorée par sécurité.`,
    );
  }

  const finales = new Map<string, ReservationBD>(existantes.map((r) => [r.id, { ...r }]));
  const aInserer: NouvelleReservation[] = [];
  const vus = new Set<string>();

  for (const e of evenements) {
    vus.add(e.uid);
    const { type, code } = classerEvenement(e, lien.plateforme);
    const existante = parUid.get(e.uid);

    if (!existante) {
      if (e.annule) continue; // un événement annulé qu'on n'a jamais vu : rien à enregistrer
      aInserer.push({
        logement_id: lien.logementId,
        ical_id: lien.id,
        plateforme: lien.plateforme,
        uid: e.uid,
        type,
        code,
        resume: e.resume,
        arrivee: e.debut,
        depart: e.fin,
      });
      continue;
    }

    const champs: ChampsReservation = {};
    if (existante.arrivee !== e.debut) champs.arrivee = e.debut;
    if (existante.depart !== e.fin) champs.depart = e.fin;
    if (existante.type !== type) champs.type = type;
    if (existante.code !== code) champs.code = code;
    if (existante.resume !== e.resume) champs.resume = e.resume;

    if (e.annule && existante.statut === "confirmee") {
      champs.statut = "annulee";
      champs.annule_le = maintenant;
      resultat.annulees++;
    } else if (!e.annule && existante.statut === "annulee") {
      champs.statut = "confirmee";
      champs.annule_le = null;
      resultat.retablies++;
    }

    if (Object.keys(champs).length) {
      const modifieDates = champs.arrivee !== undefined || champs.depart !== undefined || champs.type !== undefined;
      if (modifieDates) resultat.modifiees++;
      champs.vu_le = maintenant;
      await depot.mettreAJour(existante.id, champs);
      Object.assign(finales.get(existante.id)!, champs);
    }
  }

  // Réservations à venir qui ont disparu du calendrier : annulées. Les anciennes (déjà parties) ne
  // sont jamais touchées : les plateformes retirent les vieux événements de leurs flux.
  for (const r of existantes) {
    if (vus.has(r.uid) || r.statut !== "confirmee" || r.depart < aujourdhui) continue;
    await depot.mettreAJour(r.id, { statut: "annulee", annule_le: maintenant });
    finales.get(r.id)!.statut = "annulee";
    resultat.annulees++;
  }

  if (aInserer.length) {
    const creees = await depot.inserer(aInserer);
    const idParUid = new Map(creees.map((c) => [c.uid, c.id]));
    for (const n of aInserer) {
      const id = idParUid.get(n.uid);
      if (!id) continue;
      finales.set(id, { id, uid: n.uid, type: n.type, code: n.code, resume: n.resume, arrivee: n.arrivee, depart: n.depart, statut: "confirmee" });
      resultat.nouvelles++;
    }
  }

  // Ménages : un par réservation, le jour du départ
  const concernees = [...finales.values()].filter((r) => r.type === "reservation" && (r.statut === "annulee" || r.depart >= aujourdhui));
  const taches = new Map((await depot.tachesDesReservations(concernees.map((r) => r.id))).map((t) => [t.reservation_id, t]));

  for (const r of concernees) {
    const tache = taches.get(r.id);
    if (r.statut === "confirmee") {
      if (!tache) {
        await depot.creerMenage({
          titre: `Ménage — ${lien.nomLogement}`,
          logement_id: lien.logementId,
          reservation_id: r.id,
          echeance: r.depart,
          responsable_id: responsableMenage,
        });
        resultat.menagesCrees++;
      } else if (tache.statut === "annule") {
        await depot.mettreAJourTache(tache.id, { statut: "a_faire", echeance: r.depart });
        resultat.menagesMisAJour++;
      } else if (tache.statut !== "termine" && tache.echeance !== r.depart) {
        await depot.mettreAJourTache(tache.id, { echeance: r.depart });
        resultat.menagesMisAJour++;
      }
    } else if (tache && tache.statut !== "termine" && tache.statut !== "annule") {
      await depot.mettreAJourTache(tache.id, { statut: "annule" });
      resultat.menagesAnnules++;
    }
  }

  return resultat;
}
