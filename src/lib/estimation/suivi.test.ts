import assert from "node:assert/strict";
import { test } from "node:test";
import { indicateurs, parGroupe, type EstimationSuivi } from "./suivi.ts";

const est = (id: string, plus: Partial<EstimationSuivi> = {}): EstimationSuivi => ({ id, createdBy: "a", createdAt: "2026-11-01T10:00:00Z", statut: "brouillon", modele: "v2", dureeS: null, quartier: "Gauthier", leadId: null, envoyeeLe: null, ...plus });

test("suivi : envoi explicite, conversions après envoi seulement", () => {
  const liste = [
    est("1", { statut: "envoyee", leadId: "L1", envoyeeLe: "2026-11-02T10:00:00Z", dureeS: 50 }),
    est("2", { statut: "envoyee", leadId: "L2", envoyeeLe: "2026-11-03T10:00:00Z", dureeS: 70 }),
    est("3", { statut: "validee", leadId: "L3", dureeS: 600 }),
    est("4", { statut: "envoyee", modele: "v1", envoyeeLe: "2026-11-04T10:00:00Z" }), // ancien modèle : pas de prospect lié
    est("5"),
  ];
  const etapes = [
    { leadId: "L1", etape: "rdv", date: "2026-11-05T09:00:00Z" },
    { leadId: "L1", etape: "signe", date: "2026-11-20T09:00:00Z" },
    { leadId: "L2", etape: "rdv", date: "2026-10-30T09:00:00Z" }, // avant l'envoi : ne compte pas
    { leadId: "L3", etape: "signe", date: "2026-11-10T09:00:00Z" }, // jamais envoyée : ne compte pas
  ];
  const i = indicateurs(liste, etapes);
  assert.deepEqual([i.creees, i.validees, i.envoyees, i.mesurables, i.rdv, i.signes], [5, 4, 3, 2, 1, 1]);
  assert.equal(i.tempsMedianS, 70);
  assert.equal(i.tauxEnvoi, 75);
  assert.equal(i.tauxRdv, 50);
  const modeles = parGroupe(liste, etapes, (e) => e.modele);
  assert.deepEqual(modeles.map((m) => [m.groupe, m.ind.mesurables, m.ind.tauxRdv]), [["v2", 2, 50], ["v1", 0, null]]);
});
