import assert from "node:assert/strict";
import { test } from "node:test";
import { comparerTaches, enRetard, initiales, joursDeLaSemaine, lundiDe } from "./taches.ts";

test("la semaine commence le lundi", () => {
  assert.equal(lundiDe("2026-10-07"), "2026-10-05"); // mercredi
  assert.equal(lundiDe("2026-10-05"), "2026-10-05");
  assert.equal(lundiDe("2026-10-11"), "2026-10-05"); // dimanche
  assert.deepEqual(joursDeLaSemaine("2026-10-05"), ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"]);
});

test("tri : urgent d'abord, puis l'échéance la plus proche, sans date à la fin", () => {
  const liste = [
    { priorite: "normal", echeance: "2026-10-01", titre: "b" },
    { priorite: "urgent", echeance: null, titre: "c" },
    { priorite: "urgent", echeance: "2026-10-09", titre: "a" },
    { priorite: "normal", echeance: null, titre: "d" },
  ];
  assert.deepEqual(liste.sort(comparerTaches).map((t) => t.titre), ["a", "c", "b", "d"]);
});

test("retard et initiales", () => {
  assert.equal(enRetard({ statut: "a_faire", echeance: "2026-10-01" }, "2026-10-07"), true);
  assert.equal(enRetard({ statut: "termine", echeance: "2026-10-01" }, "2026-10-07"), false);
  assert.equal(enRetard({ statut: "a_faire", echeance: null }, "2026-10-07"), false);
  assert.equal(enRetard({ statut: "a_faire", echeance: "2026-10-07" }, "2026-10-07"), false);
  assert.equal(initiales("Amine Lahrichi"), "AL");
  assert.equal(initiales("abdelkarim"), "A");
});
