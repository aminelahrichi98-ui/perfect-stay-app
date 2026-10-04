import assert from "node:assert/strict";
import { test } from "node:test";
import { calculerVersement } from "./compta.ts";

test("exemple du cahier des charges : 5 000 MAD, ménage 300, commission 20 %", () => {
  const r = calculerVersement({ montantRecu: 5000, fraisMenage: 300, tauxCommission: 20 });
  assert.equal(r.loyerNetHorsMenage, 4700);
  assert.equal(r.commission, 940);
  assert.equal(r.revenuProprietaire, 3760);
  assert.equal(r.encaisseParPerfectStay, 1240);
});

test("un taux différent par logement (15 %)", () => {
  const r = calculerVersement({ montantRecu: 5000, fraisMenage: 300, tauxCommission: 15 });
  assert.equal(r.commission, 705);
  assert.equal(r.revenuProprietaire, 3995);
  assert.equal(r.encaisseParPerfectStay, 1005);
});

test("les parts propriétaire + Perfect Stay = montant reçu", () => {
  const r = calculerVersement({ montantRecu: 1234.56, fraisMenage: 250, tauxCommission: 18.5 });
  const somme = Math.round((r.revenuProprietaire + r.encaisseParPerfectStay) * 100);
  assert.equal(somme, Math.round(r.montantRecu * 100));
});

test("refuse un taux invalide", () => {
  assert.throws(() => calculerVersement({ montantRecu: 100, fraisMenage: 0, tauxCommission: 120 }));
});
