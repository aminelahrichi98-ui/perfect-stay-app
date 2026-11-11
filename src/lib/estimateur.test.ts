import assert from "node:assert/strict";
import { test } from "node:test";
import { arrondiCentaine, brutDepuisNet, brutMoyen, detailCalcul, formatMad0, netDepuisBrut, parMois } from "./estimateur.ts";

test("brut : moyenne des annonces comparables, les lignes vides sont ignorées", () => {
  assert.deepEqual(
    brutMoyen([
      { brutBas: 100000, brutHaut: 140000 },
      { brutBas: 120000, brutHaut: 160000 },
      { brutBas: 0, brutHaut: 0 },
    ]),
    { bas: 110000, haut: 150000 },
  );
  assert.equal(brutMoyen([]), null);
});

test("net propriétaire = brut × 0,82 × 0,80", () => {
  assert.equal(netDepuisBrut(100000), 65600);
  assert.equal(brutDepuisNet(65600), 100000);
  const d = detailCalcul(100000);
  assert.deepEqual(d, { brut: 100000, fraisPlateforme: 18000, apresPlateforme: 82000, commission: 16400, net: 65600 });
});

test("montants mensuels arrondis à la centaine", () => {
  assert.equal(parMois(65600), 5500);
  assert.equal(arrondiCentaine(5449), 5400);
  assert.equal(formatMad0(65600), "65 600");
});
