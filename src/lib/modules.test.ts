import assert from "node:assert/strict";
import { test } from "node:test";

// Le module importe des icônes (React) : on ne teste ici que la logique pure, extraite par chargement dynamique.
const { fusionnerDroits } = await import("./modules.ts");

const abdelkarim = {
  admin: false,
  droits: {
    logements: { voir: true, modifier: true },
    calendrier: { voir: true, modifier: false },
    parametres: { voir: true, modifier: true },
  },
};

test("l'administrateur peut tout accorder", () => {
  const r = fusionnerDroits({ comptabilite: { voir: true, modifier: true } }, {}, { admin: true, droits: {} });
  assert.deepEqual(r.refuses, []);
  assert.deepEqual(r.droits.comptabilite, { voir: true, modifier: true });
});

test("Abdelkarim ne peut pas donner accès à la Comptabilité", () => {
  const r = fusionnerDroits({ comptabilite: { voir: true, modifier: false } }, {}, abdelkarim);
  assert.deepEqual(r.refuses, ["comptabilite"]);
  assert.equal(r.droits.comptabilite, undefined);
});

test("Abdelkarim peut donner ce qu'il a (Logements en modification)", () => {
  const r = fusionnerDroits({ logements: { voir: true, modifier: true } }, {}, abdelkarim);
  assert.deepEqual(r.refuses, []);
  assert.deepEqual(r.droits.logements, { voir: true, modifier: true });
});

test("il ne peut pas donner « Modifier » sur un module qu'il ne peut que voir", () => {
  const r = fusionnerDroits({ calendrier: { voir: true, modifier: true } }, {}, abdelkarim);
  assert.deepEqual(r.refuses, ["calendrier"]);
  assert.deepEqual(r.droits.calendrier, { voir: true, modifier: false });
});

test("modifier un compte conserve les droits que l'accordant n'a pas lui-même", () => {
  const existants = { comptabilite: { voir: true, modifier: true } };
  // Case Comptabilité absente du formulaire (désactivée) : le droit existant reste.
  const r = fusionnerDroits({ logements: { voir: true, modifier: false } }, existants, abdelkarim);
  assert.deepEqual(r.refuses, []);
  assert.deepEqual(r.droits.comptabilite, { voir: true, modifier: true });
});

test("« Modifier » implique « Voir »", () => {
  const r = fusionnerDroits({ logements: { voir: false, modifier: true } }, {}, abdelkarim);
  assert.deepEqual(r.droits.logements, { voir: true, modifier: true });
});
