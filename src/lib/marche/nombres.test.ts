import assert from "node:assert/strict";
import { test } from "node:test";
import { cle, lireDate, lireDevise, lireEntier, lireMois, lireNombre, lirePourcentage } from "./nombres.ts";

test("cle : accents, casse et ponctuation ignorés", () => {
  assert.equal(cle("  Casa-Finance   City "), "casa finance city");
  assert.equal(cle("Maârif Extension"), "maarif extension");
});

test("lireNombre : formats courants des captures", () => {
  const v = (t: string) => lireNombre(t).valeur;
  assert.equal(v("139 076"), 139076);
  assert.equal(v("139 076 MAD"), 139076);
  assert.equal(v("MAD 9 500"), 9500);
  assert.equal(v("139,076"), 139076);
  assert.equal(v("139.076"), 139076);
  assert.equal(v("1 234,50"), 1234.5);
  assert.equal(v("1.234,50"), 1234.5);
  assert.equal(v("1,234.50"), 1234.5);
  assert.equal(v("1 234 567"), 1234567);
  assert.equal(v("12,5k"), 12500);
  assert.equal(v("139K"), 139000);
  assert.equal(v("65,6 %"), 65.6);
  assert.equal(v("0,5"), 0.5);
  assert.equal(lireNombre(42).valeur, 42);
});

test("lireNombre : rien n'est deviné", () => {
  for (const t of ["", "—", "N/A", "inconnu"]) assert.deepEqual(lireNombre(t), { valeur: null, pourcentage: false, probleme: null });
  assert.equal(lireNombre("environ").valeur, null);
  assert.ok(lireNombre("environ").probleme);
  assert.equal(lireNombre("120 000 - 150 000").valeur, null);
  assert.match(lireNombre("120 000 - 150 000").probleme!, /Fourchette/);
  assert.equal(lireNombre("1,23,45").valeur, null);
  assert.equal(lireNombre(Number.NaN).valeur, null);
});

test("lirePourcentage : 0,68 sans % est ambigu, 140 % refusé", () => {
  assert.equal(lirePourcentage("68 %").valeur, 68);
  assert.equal(lirePourcentage("68").valeur, 68);
  assert.equal(lirePourcentage("0,68").valeur, null);
  assert.match(lirePourcentage("0,68").probleme!, /ambigu/);
  assert.equal(lirePourcentage("140 %").valeur, null);
});

test("lireEntier, lireMois, lireDate, lireDevise", () => {
  assert.equal(lireEntier("2").valeur, 2);
  assert.equal(lireEntier("2,5").valeur, null);
  assert.equal(lireMois("Janvier"), 1);
  assert.equal(lireMois("févr."), 2);
  assert.equal(lireMois("Aug"), 8);
  assert.equal(lireMois("12"), 12);
  assert.equal(lireMois("13"), null);
  assert.equal(lireMois("printemps"), null);
  assert.equal(lireDate("2025-11-01"), "2025-11-01");
  assert.equal(lireDate("01/11/2025"), "2025-11-01");
  assert.equal(lireDate("1 nov. 2025"), "2025-11-01");
  assert.equal(lireDate("31/02/2025"), null);
  assert.equal(lireDate("novembre"), null);
  assert.equal(lireDevise("139 076 MAD"), "MAD");
  assert.equal(lireDevise("9 500 Dhs"), "MAD");
  assert.equal(lireDevise("€"), "EUR");
  assert.equal(lireDevise("USD"), "USD");
  assert.equal(lireDevise(""), null);
});

test("lireNombre : valeurs incertaines ou approximatives refusées", () => {
  assert.equal(lireNombre("1?9 0?6").valeur, null);
  assert.equal(lireNombre("~10 000").valeur, null);
  assert.equal(lireNombre("≈ 9 500").valeur, null);
  assert.equal(lireNombre("environ 9 500").valeur, null);
  assert.equal(lireNombre("139 076 (2025)").valeur, null);
});
