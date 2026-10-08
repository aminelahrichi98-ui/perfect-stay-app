import assert from "node:assert/strict";
import { test } from "node:test";
import { alerteStock, etapesDetectees, etapesFaites, etatMenage, pointsManquants, progression, soldesParLogement, sommeMad } from "./operations.ts";

test("état d'un ménage : avancement et contrôle qualité réunis", () => {
  assert.equal(etatMenage({ statut: "a_faire", controle: "en_attente" }).cle, "a_faire");
  assert.equal(etatMenage({ statut: "en_cours", controle: "en_attente" }).cle, "en_cours");
  assert.equal(etatMenage({ statut: "termine", controle: "en_attente" }).libelle, "À contrôler");
  assert.equal(etatMenage({ statut: "termine", controle: "valide" }).cle, "valide");
  assert.equal(etatMenage({ statut: "a_faire", controle: "a_refaire" }).cle, "a_refaire");
  assert.equal(etatMenage({ statut: "annule", controle: "valide" }).cle, "annule");
});

test("progression en pourcentage", () => {
  assert.equal(progression(0, 0), 0);
  assert.equal(progression(3, 8), 38);
  assert.equal(progression(8, 8), 100);
});

test("points manquants d'une check-list", () => {
  const points = [
    { id: "a", fait: true, photo_requise: true },
    { id: "b", fait: false, photo_requise: false },
    { id: "c", fait: true, photo_requise: true },
  ];
  assert.deepEqual(pointsManquants(points, new Set(["a"])), { nonCoches: 1, photosManquantes: 1 });
});

test("sommes en centimes, sans écart d'arrondi", () => {
  assert.equal(sommeMad([0.1, 0.2]), 0.3);
  assert.equal(sommeMad([450, 300.55]), 750.55);
});

test("ce que chaque logement doit rembourser", () => {
  const s = soldesParLogement([
    { logement_id: "L1", remboursement: "a_rembourser", frais: 750 },
    { logement_id: "L1", remboursement: "a_rembourser", frais: 120.5 },
    { logement_id: "L1", remboursement: "rembourse", frais: 300 },
    { logement_id: "L1", remboursement: "sans_objet", frais: 9999 },
    { logement_id: "L2", remboursement: "rembourse", frais: 200 },
  ]);
  const l1 = s.find((x) => x.logementId === "L1");
  assert.deepEqual(l1, { logementId: "L1", aRembourser: 870.5, rembourse: 300, nb: 2 });
  assert.equal(s.find((x) => x.logementId === "L2")?.aRembourser, 0);
});

test("alertes de stock", () => {
  assert.equal(alerteStock(30, 10), "ok");
  assert.equal(alerteStock(10, 10), "ok");
  assert.equal(alerteStock(9, 10), "bas");
  assert.equal(alerteStock(0, 10), "rupture");
  assert.equal(alerteStock(5, 0), "ok");
});

test("onboarding : étapes cochées ou reconnues dans la fiche", () => {
  const detectees = etapesDetectees({ nbPhotos: 4, nbIcal: 0, aContrat: true });
  assert.deepEqual([...detectees].sort(), ["contrat", "photos"]);
  const faites = etapesFaites(new Set(["visite", "ical"]), detectees);
  assert.deepEqual(faites, ["visite", "photos", "contrat", "ical"]);
});
