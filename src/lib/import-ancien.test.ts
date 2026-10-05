import assert from "node:assert/strict";
import { test } from "node:test";
import { calculerVersement } from "./compta.ts";
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
  assert.equal(montantRecu({ montant: 4700, fraisMenage: 300 }, "net", 20), 5000);
  assert.equal(montantRecu({ montant: 5000, fraisMenage: 300 }, "recu", 20), 5000);
});

test("« part de Perfect Stay » : on retrouve le montant reçu à partir du taux", () => {
  // Perfect Stay a encaissé 1 240 = ménage 300 + commission 940 ; à 20 %, le loyer net était 4 700, le montant reçu 5 000
  assert.equal(montantRecu({ montant: 1240, fraisMenage: 300 }, "encaisse", 20), 5000);
  // sans ménage (villa) : tout est de la commission
  assert.equal(montantRecu({ montant: 300, fraisMenage: 0 }, "encaisse", 15), 2000);
});

test("« part de Perfect Stay » : la formule retombe au centime près sur l'ancien montant", () => {
  let essais = 0;
  for (const taux of [10, 15, 17.5, 18, 20, 22, 25, 30, 33]) {
    for (let i = 0; i < 400; i++) {
      const menage = 50 * (i % 17);
      const commissionCentimes = 1 + ((i * 7919 + taux * 104729) % 4_000_000);
      const montant = (menage * 100 + commissionCentimes) / 100;
      const recu = montantRecu({ montant, fraisMenage: menage }, "encaisse", taux);
      const r = calculerVersement({ montantRecu: recu, fraisMenage: menage, tauxCommission: taux });
      assert.equal(Math.round(r.encaisseParPerfectStay * 100), Math.round(montant * 100), `taux ${taux}, montant ${montant}, ménage ${menage}`);
      essais++;
    }
  }
  assert.ok(essais > 3000);
});

test("« part de Perfect Stay » : refuse un taux nul ou un montant inférieur au ménage", () => {
  assert.throws(() => montantRecu({ montant: 1000, fraisMenage: 300 }, "encaisse", 0));
  assert.throws(() => montantRecu({ montant: 200, fraisMenage: 300 }, "encaisse", 20));
});

test("l'aperçu recalcule avec la formule validée et signale les versements orphelins", () => {
  const r = lireExport(JSON.stringify(export1));
  assert.ok(r.ok);
  if (!r.ok) return;
  const a = construireApercu(r.donnees, "recu", { a: 20, "2": 15 });
  assert.equal(a.totalMontantAncien, 7200);
  assert.equal(a.nbImpossibles, 0);
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

test("l'aperçu « part de Perfect Stay » retrouve exactement le total de l'ancienne app", () => {
  const r = lireExport(JSON.stringify({
    logements: [{ id: "a", nom: "Appart", fraisMenage: 450 }, { id: "b", nom: "Villa", fraisMenage: 0 }],
    transactions: [
      { id: "1", logementId: "a", date: "2026-07-31", montant: 5705.26, fraisMenage: 2700, note: "juillet" },
      { id: "2", logementId: "b", date: "2026-09-30", montant: 3409.68, fraisMenage: 0, note: "septembre" },
    ],
  }));
  assert.ok(r.ok);
  if (!r.ok) return;
  const a = construireApercu(r.donnees, "encaisse", { a: 18, b: 15 });
  assert.equal(a.totalMontantAncien, 9114.94);
  assert.equal(a.totalEncaisseRecalcule, 9114.94);
  assert.equal(a.nbImpossibles, 0);
});

test("le taux de commission du fichier est repris, et reste facultatif", () => {
  const r = lireExport(JSON.stringify({
    logements: [{ id: "a", nom: "A", tauxCommission: 18 }, { id: "b", nom: "B" }, { id: "c", nom: "C", tauxCommission: null }],
    transactions: [],
  }));
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.donnees.logements[0].tauxCommission, 18);
    assert.equal(r.donnees.logements[1].tauxCommission, undefined);
    assert.equal(r.donnees.logements[2].tauxCommission, undefined);
  }
  assert.ok(!lireExport(JSON.stringify({ logements: [{ id: "a", nom: "A", tauxCommission: 150 }], transactions: [] })).ok);
});

test("rejette ce qui n'est pas une image", () => {
  assert.equal(lirePhoto("data:text/html;base64,PGI+"), null);
  assert.ok(lirePhoto("data:image/jpeg;base64,/9j/4AAQ")?.length);
});
