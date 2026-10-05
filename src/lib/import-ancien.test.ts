import assert from "node:assert/strict";
import { test } from "node:test";
import { construireApercu, lireExport, lirePhoto, montantRecu } from "./import-ancien.ts";

const export1 = {
  logements: [
    { id: "a", nom: "Villa Palmeraie", proprietaire: "M. Alami", ville: "Marrakech", fraisMenage: 300, ical: "https://airbnb/ical/a", photo: "" },
    { id: 2, nom: "Appart Gueliz", proprietaire: null, ville: "Marrakech", fraisMenage: 200, ical: null, photo: null },
  ],
  transactions: [
    { id: "t1", logementId: "a", date: "2026-07-14", montant: 5000, fraisMenage: 300, note: "Juillet" },
    { id: "t2", logementId: 2, date: "2026-08-02", montant: 2200, fraisMenage: 200, note: "" },
    { id: "t3", logementId: "inconnu", date: "2026-08-03", montant: 100, fraisMenage: 0, note: "" },
  ],
};

test("lit l'export, accepte les identifiants numériques et les champs vides", () => {
  const r = lireExport(JSON.stringify(export1));
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.donnees.logements[1].id, "2");
    assert.equal(r.donnees.logements[1].ical, "");
    assert.equal(r.donnees.transactions[1].logementId, "2");
  }
});

test("messages d'erreur clairs", () => {
  const abime = lireExport("{ pas du json");
  assert.ok(!abime.ok && /export valide/.test(abime.erreur));
  const vide = lireExport(JSON.stringify({ truc: [] }));
  assert.ok(!vide.ok && /logements/.test(vide.erreur));
  const mauvaiseDate = lireExport(JSON.stringify({ ...export1, transactions: [{ ...export1.transactions[0], date: "14/07/2026" }] }));
  assert.ok(!mauvaiseDate.ok && /AAAA-MM-JJ/.test(mauvaiseDate.erreur));
});

test("l'hypothèse « loyer hors ménage » ajoute le ménage pour retrouver le montant reçu", () => {
  assert.equal(montantRecu({ montant: 4700, fraisMenage: 300 }, "net"), 5000);
  assert.equal(montantRecu({ montant: 5000, fraisMenage: 300 }, "recu"), 5000);
});

test("l'aperçu recalcule avec la formule validée et signale les versements orphelins", () => {
  const r = lireExport(JSON.stringify(export1));
  assert.ok(r.ok);
  if (!r.ok) return;
  const a = construireApercu(r.donnees, "recu", { a: 20, "2": 15 });
  assert.equal(a.nbLogements, 2);
  assert.equal(a.nbTransactions, 2);
  assert.equal(a.totalMontantRecu, 7200);
  assert.ok(a.avertissements.some((w) => /absent du fichier/.test(w)));
  const villa = a.echantillon.find((e) => e.logement === "Villa Palmeraie");
  assert.equal(villa?.calcul.commission, 940);
  assert.equal(villa?.calcul.encaisseParPerfectStay, 1240);
  const appart = a.echantillon.find((e) => e.logement === "Appart Gueliz");
  assert.equal(appart?.calcul.commission, 300); // (2200 − 200) × 15 %
});

test("rejette ce qui n'est pas une image", () => {
  assert.equal(lirePhoto("data:text/html;base64,PGI+"), null);
  assert.ok(lirePhoto("data:image/jpeg;base64,/9j/4AAQ")?.length);
});
