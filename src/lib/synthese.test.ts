import assert from "node:assert/strict";
import { test } from "node:test";
import { calculerLigne, dansLeMois, syntheseDuMois, totaliser, variation, type VersementBrut } from "./synthese.ts";

const v = (id: string, logement_id: string, date: string, montant: number, menage: number, taux: number): VersementBrut => ({
  id,
  logement_id,
  date_versement: date,
  montant_recu: montant,
  frais_menage: menage,
  taux_commission: taux,
});

test("totaux : les parts se recomposent exactement, TVA calculée une seule fois sur le total", () => {
  const lignes = [calculerLigne(v("1", "a", "2026-09-05", 5000, 300, 20)), calculerLigne(v("2", "a", "2026-09-20", 2200, 200, 18))];
  const t = totaliser(lignes);
  assert.equal(t.montantsRecus, 7200);
  assert.equal(t.menage, 500);
  assert.equal(t.loyerNet, 6700);
  assert.equal(t.commissionTTC, 940 + 360);
  assert.equal(Math.round((t.commissionHT + t.tva) * 100), Math.round(t.commissionTTC * 100));
  assert.equal(t.revenuProprietaire, 6700 - 1300);
  assert.equal(t.encaisse, 500 + 1300);
  assert.equal(Math.round((t.revenuProprietaire + t.encaisse) * 100), Math.round(t.montantsRecus * 100));
});

test("aucun versement : tout est à zéro", () => {
  const t = totaliser([]);
  assert.deepEqual([t.nbVersements, t.commissionTTC, t.tva, t.encaisse], [0, 0, 0, 0]);
});

test("un versement appartient au mois de sa date", () => {
  assert.equal(dansLeMois("2026-09-30", "2026-09"), true);
  assert.equal(dansLeMois("2026-10-01", "2026-09"), false);
  assert.equal(dansLeMois("2026-08-31", "2026-09"), false);
});

test("synthèse du mois : par logement, occupation depuis le calendrier, dépenses par catégorie", () => {
  const s = syntheseDuMois({
    mois: "2026-09",
    tauxTva: 20,
    logements: [
      { id: "a", nom: "LUXURIA 21", aUnCalendrier: true },
      { id: "b", nom: "Villa Targa", aUnCalendrier: false },
    ],
    versements: [
      v("1", "a", "2026-09-05", 5000, 300, 20),
      v("2", "b", "2026-09-12", 20000, 0, 15),
      v("3", "a", "2026-10-02", 999, 0, 20), // autre mois : ignoré
    ],
    reservations: [{ id: "r1", logement_id: "a", arrivee: "2026-09-01", depart: "2026-09-16", type: "reservation" }],
    depenses: [
      { logement_id: "a", categorie: "maintenance", montant: 450, date_depense: "2026-09-10" },
      { logement_id: null, categorie: "marketing", montant: 1000, date_depense: "2026-09-11" },
      { logement_id: null, categorie: "marketing", montant: 500, date_depense: "2026-08-31" }, // autre mois
    ],
  });
  const a = s.lignes[0];
  assert.equal(a.nuits, 15);
  assert.equal(Math.round((a.occupation ?? 0) * 100), 50); // 15 nuits sur 30
  assert.equal(a.totaux.commissionTTC, 940);
  assert.equal(a.depenses, 450);
  assert.equal(s.lignes[1].occupation, null);
  assert.equal(s.total.commissionTTC, 940 + 3000);
  assert.deepEqual(s.depensesParCategorie, { maintenance: 450, marketing: 1000 });
  assert.equal(s.depensesTotal, 1450);
  assert.equal(s.solde, s.total.encaisse - 1450);
});

test("variation par rapport au mois précédent", () => {
  assert.equal(variation(100, 125), 25);
  assert.equal(variation(200, 100), -50);
  assert.equal(variation(0, 100), null);
});
