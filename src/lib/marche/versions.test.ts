import assert from "node:assert/strict";
import { test } from "node:test";
import { donneesVides } from "./schema.ts";
import { comparerVersions, verifierDoublon, type ResumeVersion } from "./versions.ts";

const v1: ResumeVersion = { numero: 1, periode_debut: "2025-11-01", periode_fin: "2026-10-31", devise: "MAD", revenu_annuel_bas: 139076, revenu_annuel_central: null, revenu_annuel_haut: 174509, adr: 620, occupation: 68, nuits_reservees: null, echantillon: 37 };
const donnees = (plus: Partial<ResumeVersion> = {}) => {
  const d = donneesVides();
  const s = { ...v1, ...plus };
  d.periode = { debut: s.periode_debut, fin: s.periode_fin, type: "" };
  d.devise = s.devise;
  d.metriques = { ...d.metriques, revenu_annuel_bas: s.revenu_annuel_bas, revenu_annuel_central: s.revenu_annuel_central, revenu_annuel_haut: s.revenu_annuel_haut, adr: s.adr, occupation: s.occupation, nuits_reservees: s.nuits_reservees, echantillon: s.echantillon };
  return d;
};

test("test 8 : doublon détecté, même période signalée, nouvelle période acceptée", () => {
  assert.deepEqual(verifierDoublon(donnees(), [v1]), { type: "doublon", numero: 1 });
  assert.deepEqual(verifierDoublon(donnees({ revenu_annuel_bas: 140000 }), [v1]), { type: "meme_periode", numero: 1 });
  assert.equal(verifierDoublon(donnees({ periode_debut: "2026-01-01", periode_fin: "2026-12-31" }), [v1]), null);
  assert.equal(verifierDoublon(donnees({ periode_debut: null, periode_fin: null }), [{ ...v1, periode_debut: null, periode_fin: null }]), null);
});

test("comparaison de deux versions : écarts en %", () => {
  const v2 = { ...v1, numero: 2, periode_debut: "2026-02-01", periode_fin: "2027-01-31", revenu_annuel_bas: 150000, occupation: null };
  const d = comparerVersions(v1, v2);
  assert.deepEqual(d.map((x) => x.champ), ["periode", "revenu_annuel_bas", "occupation"]);
  assert.equal(Math.round(d[1].ecart! * 10) / 10, 7.9);
  assert.equal(d[2].ecart, null);
});
