import assert from "node:assert/strict";
import { test } from "node:test";
import { calculerVersement, repartirTva } from "./compta.ts";

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

test("la commission est un montant TTC : 940 MAD TTC = 783,33 HT + 156,67 de TVA à 20 %", () => {
  const r = calculerVersement({ montantRecu: 5000, fraisMenage: 300, tauxCommission: 20 });
  assert.equal(r.commission, 940); // inchangé : c'est ce que Perfect Stay reçoit
  assert.equal(r.commissionHT, 783.33);
  assert.equal(r.tvaCommission, 156.67);
  assert.equal(r.revenuProprietaire, 3760); // la TVA ne change pas le revenu du propriétaire
  assert.equal(r.encaisseParPerfectStay, 1240);
});

test("HT + TVA = TTC, toujours exactement, quel que soit le montant", () => {
  for (let ttc = 0.01; ttc < 3000; ttc += 13.37) {
    const { ht, tva, ttc: t } = repartirTva(ttc, 20);
    assert.equal(Math.round((ht + tva) * 100), Math.round(t * 100));
  }
});

test("TVA à 0 % : le HT est égal au TTC", () => {
  assert.deepEqual(repartirTva(1000, 0), { ht: 1000, tva: 0, ttc: 1000 });
});
