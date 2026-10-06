import assert from "node:assert/strict";
import { test } from "node:test";
import { ajouterJours, aujourdhui, jourSemaine, moisPrecedent, moisSuivant, nbJoursDuMois, nbNuits } from "./dates.ts";

test("calculs de jours sans décalage", () => {
  assert.equal(ajouterJours("2026-10-31", 1), "2026-11-01");
  assert.equal(ajouterJours("2026-03-01", -1), "2026-02-28");
  assert.equal(nbNuits("2026-10-10", "2026-10-14"), 4);
  assert.equal(nbJoursDuMois("2026-02"), 28);
  assert.equal(nbJoursDuMois("2028-02"), 29);
  assert.equal(nbJoursDuMois("2026-10"), 31);
});

test("mois suivant et précédent à cheval sur l'année", () => {
  assert.equal(moisSuivant("2026-12"), "2027-01");
  assert.equal(moisPrecedent("2027-01"), "2026-12");
});

test("semaine du lundi : le 5 octobre 2026 est un lundi", () => {
  assert.equal(jourSemaine("2026-10-05"), 0);
  assert.equal(jourSemaine("2026-10-11"), 6);
});

test("aujourd'hui est donné à l'heure du Maroc", () => {
  assert.equal(aujourdhui(new Date("2026-10-05T23:30:00Z")), "2026-10-06"); // 00:30 à Casablanca
});
