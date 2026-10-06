import assert from "node:assert/strict";
import { test } from "node:test";
import { etatsDuMois, grilleMois, nuitsReservees, tauxOccupation } from "./calendrier.ts";

const resa = (id: string, arrivee: string, depart: string, type: "reservation" | "blocage" = "reservation") => ({ id, arrivee, depart, type });

test("les nuits vont de l'arrivée au jour avant le départ", () => {
  const e = etatsDuMois("2026-10", [resa("a", "2026-10-10", "2026-10-14")]);
  const nuits = e.filter((x) => x.etat === "nuit").map((x) => x.jour);
  assert.deepEqual(nuits, ["2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13"]);
  assert.equal(e.find((x) => x.jour === "2026-10-10")!.debut, true);
  assert.equal(e.find((x) => x.jour === "2026-10-13")!.fin, true);
  assert.equal(e.find((x) => x.jour === "2026-10-14")!.depart, true); // jour de ménage
  assert.equal(e.find((x) => x.jour === "2026-10-14")!.etat, "libre");
});

test("jour de rotation : un départ et une arrivée le même jour", () => {
  const e = etatsDuMois("2026-10", [resa("a", "2026-10-10", "2026-10-14"), resa("b", "2026-10-14", "2026-10-16")]);
  const j = e.find((x) => x.jour === "2026-10-14")!;
  assert.equal(j.etat, "nuit");
  assert.equal(j.reservationId, "b");
  assert.equal(j.depart, true);
});

test("séjour à cheval sur deux mois : seule la partie du mois est colorée", () => {
  const octobre = etatsDuMois("2026-10", [resa("a", "2026-10-29", "2026-11-03")]);
  assert.equal(nuitsReservees(octobre), 3); // 29, 30, 31
  assert.equal(octobre.at(-1)!.fin, false);
  const novembre = etatsDuMois("2026-11", [resa("a", "2026-10-29", "2026-11-03")]);
  assert.equal(nuitsReservees(novembre), 2); // 1er et 2
  assert.equal(novembre[0].debut, false);
  assert.equal(novembre[2].depart, true);
});

test("taux d'occupation : les blocages ne comptent pas", () => {
  const e = etatsDuMois("2026-10", [resa("a", "2026-10-01", "2026-10-11"), resa("b", "2026-10-20", "2026-10-25", "blocage")]);
  assert.equal(nuitsReservees(e), 10);
  assert.equal(Math.round(tauxOccupation(e) * 1000) / 10, 32.3); // 10 nuits sur 31
  assert.equal(e.find((x) => x.jour === "2026-10-22")!.etat, "blocage");
});

test("une réservation prime sur un blocage qui la recouvre", () => {
  const e = etatsDuMois("2026-10", [resa("blocage", "2026-10-10", "2026-10-20", "blocage"), resa("a", "2026-10-12", "2026-10-14")]);
  assert.equal(e.find((x) => x.jour === "2026-10-12")!.etat, "nuit");
  assert.equal(e.find((x) => x.jour === "2026-10-15")!.etat, "blocage");
});

test("grille du mois : semaines du lundi au dimanche", () => {
  const g = grilleMois("2026-10"); // le 1er octobre 2026 est un jeudi
  assert.equal(g[0].filter((x) => x === null).length, 3);
  assert.equal(g[0][3], "2026-10-01");
  assert.equal(g.length, 5);
  assert.ok(g.every((s) => s.length === 7));
  assert.equal(grilleMois("2026-02").length, 5); // le 1er février 2026 est un dimanche : 5 lignes
  assert.equal(grilleMois("2027-02").length, 4); // le 1er février 2027 est un lundi et le mois a 28 jours : 4 lignes
});
