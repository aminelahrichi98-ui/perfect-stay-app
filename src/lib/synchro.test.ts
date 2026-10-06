import assert from "node:assert/strict";
import { test } from "node:test";
import type { EvenementIcal } from "./ical.ts";
import {
  appliquerFlux,
  type ChampsReservation,
  type Depot,
  type LienCalendrier,
  type NouvelleReservation,
  type ReservationBD,
  type TacheMenageBD,
} from "./synchro.ts";

/** Faux dépôt en mémoire : se comporte comme la base, pour tester toute la logique. */
function fauxDepot() {
  const reservations: ReservationBD[] = [];
  const taches: (TacheMenageBD & { titre: string; responsable_id: string | null })[] = [];
  let n = 0;
  const depot: Depot = {
    async reservationsDuLien() {
      return reservations.map((r) => ({ ...r }));
    },
    async tachesDesReservations(ids) {
      return taches.filter((t) => ids.includes(t.reservation_id)).map((t) => ({ ...t }));
    },
    async inserer(lignes: NouvelleReservation[]) {
      return lignes.map((l) => {
        const id = `r${++n}`;
        reservations.push({ id, uid: l.uid, type: l.type, code: l.code, resume: l.resume, arrivee: l.arrivee, depart: l.depart, statut: "confirmee" });
        return { id, uid: l.uid };
      });
    },
    async mettreAJour(id: string, champs: ChampsReservation) {
      const r = reservations.find((x) => x.id === id)!;
      const utiles: Record<string, unknown> = { ...champs };
      delete utiles.annule_le;
      delete utiles.vu_le;
      Object.assign(r, utiles);
    },
    async creerMenage(t) {
      assert.ok(!taches.some((x) => x.reservation_id === t.reservation_id), "un seul ménage par réservation");
      taches.push({ id: `t${++n}`, reservation_id: t.reservation_id, echeance: t.echeance, statut: "a_faire", titre: t.titre, responsable_id: t.responsable_id });
    },
    async mettreAJourTache(id, champs) {
      Object.assign(taches.find((t) => t.id === id)!, champs);
    },
  };
  return { depot, reservations, taches };
}

const lien: LienCalendrier = { id: "lien1", logementId: "lg1", nomLogement: "Villa Test", plateforme: "Airbnb" };
const ev = (uid: string, debut: string, fin: string, resume = "Reserved", annule = false): EvenementIcal => ({ uid, debut, fin, resume, description: "", annule });
const ctx = (aujourdhui = "2026-10-05") => ({ aujourdhui, maintenant: `${aujourdhui}T10:00:00Z`, responsableMenage: "abdel" });

test("première synchronisation : réservations créées, ménages seulement pour les départs à venir", async () => {
  const { depot, reservations, taches } = fauxDepot();
  const r = await appliquerFlux(
    depot,
    lien,
    [
      ev("a", "2026-09-20", "2026-09-25"), // déjà partie : pas de ménage
      ev("b", "2026-10-10", "2026-10-14"),
      ev("c", "2026-10-18", "2026-10-20", "Airbnb (Not available)"), // blocage : pas de ménage
      ev("d", "2026-10-03", "2026-10-05"), // part aujourd'hui : ménage
    ],
    ctx(),
  );
  assert.equal(r.nouvelles, 4);
  assert.equal(reservations.find((x) => x.uid === "c")!.type, "blocage");
  assert.equal(r.menagesCrees, 2);
  assert.deepEqual(taches.map((t) => t.echeance).sort(), ["2026-10-05", "2026-10-14"]);
  assert.ok(taches.every((t) => t.titre === "Ménage — Villa Test" && t.responsable_id === "abdel"));
});

test("une seconde synchronisation identique ne change rien", async () => {
  const { depot, taches } = fauxDepot();
  const flux = [ev("b", "2026-10-10", "2026-10-14")];
  await appliquerFlux(depot, lien, flux, ctx());
  const r = await appliquerFlux(depot, lien, flux, ctx());
  assert.deepEqual([r.nouvelles, r.modifiees, r.annulees, r.menagesCrees, r.menagesMisAJour], [0, 0, 0, 0, 0]);
  assert.equal(taches.length, 1);
});

test("dates modifiées : la réservation et l'échéance du ménage suivent", async () => {
  const { depot, reservations, taches } = fauxDepot();
  await appliquerFlux(depot, lien, [ev("b", "2026-10-10", "2026-10-14")], ctx());
  const r = await appliquerFlux(depot, lien, [ev("b", "2026-10-10", "2026-10-16")], ctx());
  assert.equal(r.modifiees, 1);
  assert.equal(reservations[0].depart, "2026-10-16");
  assert.equal(taches[0].echeance, "2026-10-16");
  assert.equal(r.menagesMisAJour, 1);
});

test("réservation disparue du calendrier : annulée, ménage annulé", async () => {
  const { depot, reservations, taches } = fauxDepot();
  await appliquerFlux(depot, lien, [ev("b", "2026-10-10", "2026-10-14"), ev("x", "2026-11-01", "2026-11-03")], ctx());
  const r = await appliquerFlux(depot, lien, [ev("x", "2026-11-01", "2026-11-03")], ctx());
  assert.equal(r.annulees, 1);
  assert.equal(reservations.find((x) => x.uid === "b")!.statut, "annulee");
  assert.equal(taches.find((t) => t.reservation_id === "r1")!.statut, "annule");
  assert.equal(r.menagesAnnules, 1);
});

test("une réservation passée qui sort du flux n'est jamais annulée", async () => {
  const { depot, reservations } = fauxDepot();
  await appliquerFlux(depot, lien, [ev("vieille", "2026-09-01", "2026-09-05"), ev("b", "2026-10-10", "2026-10-14")], ctx("2026-09-02"));
  const r = await appliquerFlux(depot, lien, [ev("b", "2026-10-10", "2026-10-14")], ctx("2026-10-05"));
  assert.equal(r.annulees, 0);
  assert.equal(reservations.find((x) => x.uid === "vieille")!.statut, "confirmee");
});

test("statut CANCELLED dans le flux : annulation, puis rétablissement si elle revient", async () => {
  const { depot, reservations, taches } = fauxDepot();
  await appliquerFlux(depot, lien, [ev("b", "2026-10-10", "2026-10-14")], ctx());
  let r = await appliquerFlux(depot, lien, [ev("b", "2026-10-10", "2026-10-14", "Reserved", true)], ctx());
  assert.equal(r.annulees, 1);
  assert.equal(taches[0].statut, "annule");
  r = await appliquerFlux(depot, lien, [ev("b", "2026-10-10", "2026-10-14")], ctx());
  assert.equal(r.retablies, 1);
  assert.equal(reservations[0].statut, "confirmee");
  assert.equal(taches[0].statut, "a_faire");
});

test("un ménage déjà terminé n'est jamais rouvert ni déplacé", async () => {
  const { depot, taches } = fauxDepot();
  await appliquerFlux(depot, lien, [ev("b", "2026-10-10", "2026-10-14")], ctx());
  taches[0].statut = "termine";
  await appliquerFlux(depot, lien, [ev("b", "2026-10-10", "2026-10-16")], ctx());
  assert.equal(taches[0].echeance, "2026-10-14");
  await appliquerFlux(depot, lien, [], ctx()).catch(() => {});
  assert.equal(taches[0].statut, "termine");
});

test("garde-fou : un calendrier soudain vide n'annule pas l'avenir", async () => {
  const { depot, reservations } = fauxDepot();
  await appliquerFlux(depot, lien, [ev("a", "2026-10-10", "2026-10-12"), ev("b", "2026-10-15", "2026-10-17"), ev("c", "2026-10-20", "2026-10-22")], ctx());
  await assert.rejects(() => appliquerFlux(depot, lien, [], ctx()), /vide/);
  assert.ok(reservations.every((r) => r.statut === "confirmee"));
});

test("un calendrier vide est accepté s'il n'y avait presque rien", async () => {
  const { depot } = fauxDepot();
  await appliquerFlux(depot, lien, [ev("a", "2026-10-10", "2026-10-12")], ctx());
  const r = await appliquerFlux(depot, lien, [], ctx());
  assert.equal(r.annulees, 1);
});

test("un blocage qui devient réservation crée son ménage", async () => {
  const { depot, taches } = fauxDepot();
  await appliquerFlux(depot, lien, [ev("c", "2026-10-18", "2026-10-20", "Airbnb (Not available)")], ctx());
  assert.equal(taches.length, 0);
  await appliquerFlux(depot, lien, [ev("c", "2026-10-18", "2026-10-20", "Reserved")], ctx());
  assert.equal(taches.length, 1);
});
