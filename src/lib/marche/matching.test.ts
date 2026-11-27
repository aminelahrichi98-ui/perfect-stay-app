import assert from "node:assert/strict";
import { test } from "node:test";
import { chercherMarche, famille, fraicheur, resoudreQuartier, type AliasRef, type QuartierRef, type SegmentRef } from "./matching.ts";

const Q: QuartierRef[] = [
  { id: "q-fb", villeCle: "casablanca", cle: "ferme bretonne", nom: "Ferme Bretonne", ville: "Casablanca" },
  { id: "q-cfc", villeCle: "casablanca", cle: "casablanca finance city", nom: "Casablanca Finance City", ville: "Casablanca" },
  { id: "q-gt", villeCle: "casablanca", cle: "gauthier", nom: "Gauthier", ville: "Casablanca" },
  { id: "q-gm", villeCle: "marrakech", cle: "gueliz", nom: "Guéliz", ville: "Marrakech" },
];
const A: AliasRef[] = [
  { quartierId: "q-cfc", villeCle: "casablanca", cle: "cfc" },
  { quartierId: "q-cfc", villeCle: "casablanca", cle: "casa finance city" },
];
const version = (id: string, dateImport: string) => ({ id, numero: 1, dateImport, periodeDebut: "2025-11-01", periodeFin: "2026-10-31" });
const seg = (id: string, quartierId: string, type: SegmentRef["type"], chambres: number, plus: Partial<SegmentRef> = {}): SegmentRef => ({
  id, quartierId, type, chambres, chambresMax: null, capacite: null, standing: null, statut: "actif", version: version(`v-${id}`, "2026-11-10T10:00:00Z"), ...plus,
});
const S: SegmentRef[] = [
  seg("fb-1", "q-fb", "appartement", 1, { capacite: 4 }),
  seg("fb-2", "q-fb", "appartement", 2),
  seg("fb-studio", "q-fb", "studio", 0),
  seg("cfc-1", "q-cfc", "appartement", 1),
  seg("gt-1", "q-gt", "appartement", 1),
  seg("fb-3-archive", "q-fb", "appartement", 3, { statut: "archive" }),
  seg("fb-4-brouillon", "q-fb", "appartement", 4, { version: null }),
];
const OPTIONS = { aujourdhui: "2026-11-27", seuils: { recente: 30, alerte: 90 }, standingObligatoire: false, toleranceCapacite: 1 };
const bien = (plus = {}) => ({ ville: "Casablanca", quartier: "Ferme Bretonne", type: "appartement", chambres: 1, capacite: 4, standing: null, ...plus });

test("test 3 : correspondance exacte Ferme Bretonne 1 chambre", () => {
  const r = chercherMarche(bien(), S, Q, A, OPTIONS);
  assert.equal(r.statut, "trouve");
  assert.equal(r.choix!.segment.id, "fb-1");
  assert.equal(r.choix!.correspondance, "exacte");
  assert.deepEqual(r.choix!.ecarts, []);
  assert.equal(r.choix!.fraicheur!.niveau, "recente");
});

test("alias et normalisation : CFC, Casa Finance City, casse et accents", () => {
  for (const nom of ["CFC", "Casa Finance City", "casablanca  finance-city"]) {
    const r = chercherMarche(bien({ quartier: nom }), S, Q, A, OPTIONS);
    assert.equal(r.choix?.segment.id, "cfc-1", nom);
  }
  assert.equal(resoudreQuartier("Marrakech", "gueliz", Q, A)?.id, "q-gm");
  assert.equal(resoudreQuartier("Marrakech", "CFC", Q, A), null); // un alias vaut pour sa ville
});

test("un studio n'est jamais confondu avec un 1 chambre", () => {
  assert.equal(chercherMarche(bien({ type: "studio", chambres: 1 }), S, Q, A, OPTIONS).choix!.segment.id, "fb-studio");
  assert.equal(chercherMarche(bien({ type: "appartement", chambres: 0 }), S, Q, A, OPTIONS).choix!.segment.id, "fb-studio");
  assert.deepEqual(famille("Penthouse"), { type: "appartement", studio: false });
});

test("test 4 : quartier inconnu, aucun chiffre, alternatives seulement proposées", () => {
  const r = chercherMarche(bien({ quartier: "Bourgogne" }), S, Q, A, OPTIONS);
  assert.equal(r.statut, "quartier_inconnu");
  assert.equal(r.choix, null);
  assert.ok(r.alternatives.length > 0);
  assert.ok(r.alternatives.every((c) => c.correspondance === "approximation" && c.ecarts.includes("autre quartier")));
  assert.match(r.message, /n'existe pas/);
});

test("segment absent : aucune donnée, pas d'approximation silencieuse", () => {
  const r = chercherMarche(bien({ chambres: 3 }), S, Q, A, OPTIONS);
  assert.equal(r.statut, "aucune_donnee");
  assert.equal(r.choix, null);
  assert.deepEqual(r.alternatives.map((c) => c.segment.id), ["fb-2"]); // archivé et brouillon exclus
  assert.match(r.alternatives[0].ecarts[0], /2 chambre\(s\) au lieu de 3/);
});

test("informations manquantes : pas de recherche", () => {
  const r = chercherMarche(bien({ chambres: null, type: null }), S, Q, A, OPTIONS);
  assert.equal(r.statut, "incomplet");
  assert.deepEqual(r.manquants, ["type de logement", "nombre de chambres"]);
});

test("regroupement 2 à 3 chambres seulement s'il existe dans PriceLabs, exact prioritaire", () => {
  const avecGroupe = [...S, seg("fb-2-3", "q-fb", "appartement", 2, { chambresMax: 3, version: version("v-g", "2026-11-20T10:00:00Z") })];
  assert.equal(chercherMarche(bien({ chambres: 3 }), avecGroupe, Q, A, OPTIONS).choix!.segment.id, "fb-2-3");
  assert.equal(chercherMarche(bien({ chambres: 3 }), avecGroupe, Q, A, OPTIONS).choix!.correspondance, "regroupement");
  assert.equal(chercherMarche(bien({ chambres: 2 }), avecGroupe, Q, A, OPTIONS).choix!.segment.id, "fb-2");
});

test("standing et capacité affinent ; standing obligatoire exclut", () => {
  const avecStanding = [seg("p", "q-fb", "appartement", 1, { standing: "premium" }), seg("s", "q-fb", "appartement", 1, { standing: "standard" })];
  assert.equal(chercherMarche(bien({ standing: "premium" }), avecStanding, Q, A, OPTIONS).choix!.segment.id, "p");
  const r = chercherMarche(bien({ standing: "superieur" }), avecStanding, Q, A, { ...OPTIONS, standingObligatoire: true });
  assert.equal(r.statut, "aucune_donnee");
});

test("fraîcheur : seuils 30 et 90 jours", () => {
  const s = { recente: 30, alerte: 90 };
  assert.equal(fraicheur("2026-11-01T00:00:00Z", "2026-11-27", s).niveau, "recente");
  assert.equal(fraicheur("2026-09-01T00:00:00Z", "2026-11-27", s).niveau, "surveiller");
  assert.equal(fraicheur("2026-06-01T00:00:00Z", "2026-11-27", s).niveau, "actualiser");
});
