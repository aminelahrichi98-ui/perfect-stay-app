import assert from "node:assert/strict";
import { test } from "node:test";
import { correspond, dernierJourDuMois, libelleRegle, occurrences } from "./recurrence.ts";
import { analyserListe } from "./liste-taches.ts";

test("dernier jour du mois, années bissextiles comprises", () => {
  assert.equal(dernierJourDuMois("2026-02-10"), "2026-02-28");
  assert.equal(dernierJourDuMois("2028-02-10"), "2028-02-29");
  assert.equal(dernierJourDuMois("2026-04-01"), "2026-04-30");
  assert.equal(dernierJourDuMois("2026-12-31"), "2026-12-31");
});

test("« Comptabilité du mois » : le dernier jour de chaque mois", () => {
  const regle = { frequence: "dernier_jour_mois", jour_semaine: null, jour_mois: null } as const;
  assert.deepEqual(occurrences(regle, "2026-10-01", "2027-02-28"), ["2026-10-31", "2026-11-30", "2026-12-31", "2027-01-31", "2027-02-28"]);
});

test("chaque semaine : le lundi = 0, le dimanche = 6", () => {
  const lundi = { frequence: "semaine", jour_semaine: 0, jour_mois: null } as const;
  assert.deepEqual(occurrences(lundi, "2026-10-05", "2026-10-20"), ["2026-10-05", "2026-10-12", "2026-10-19"]);
  const dimanche = { frequence: "semaine", jour_semaine: 6, jour_mois: null } as const;
  assert.deepEqual(occurrences(dimanche, "2026-10-05", "2026-10-12"), ["2026-10-11"]);
});

test("chaque mois à un jour précis : le 31 tombe sur le dernier jour d'un mois plus court", () => {
  const le31 = { frequence: "mois", jour_semaine: null, jour_mois: 31 } as const;
  assert.deepEqual(occurrences(le31, "2026-01-01", "2026-04-30"), ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  const le15 = { frequence: "mois", jour_semaine: null, jour_mois: 15 } as const;
  assert.equal(correspond(le15, "2026-10-15"), true);
  assert.equal(correspond(le15, "2026-10-14"), false);
});

test("chaque jour", () => {
  assert.equal(occurrences({ frequence: "jour", jour_semaine: null, jour_mois: null }, "2026-10-01", "2026-10-07").length, 7);
});

test("libellés de règle", () => {
  assert.equal(libelleRegle({ frequence: "semaine", jour_semaine: 2, jour_mois: null }), "Chaque mercredi");
  assert.equal(libelleRegle({ frequence: "mois", jour_semaine: null, jour_mois: 1 }), "Le 1er de chaque mois");
});

test("coller une liste : puces, numéros, cases à cocher et lignes vides", () => {
  const liste = analyserListe("- Appeler le plombier\n• Commander du linge\n\n1. Relancer Mme Alaoui\n2) Payer la patente\n[ ] Vérifier le wifi\n☐ Photos Villa Targa");
  assert.deepEqual(
    liste.map((l) => l.titre),
    ["Appeler le plombier", "Commander du linge", "Relancer Mme Alaoui", "Payer la patente", "Vérifier le wifi", "Photos Villa Targa"],
  );
});

test("coller une liste : les lignes en retrait deviennent des sous-tâches", () => {
  const liste = analyserListe("- Préparer l'arrivée\n  - Linge\n  - Courses\n- Facturer");
  assert.deepEqual(liste, [
    { titre: "Préparer l'arrivée", sousTaches: ["Linge", "Courses"] },
    { titre: "Facturer", sousTaches: [] },
  ]);
});

test("coller une liste : puce seule ignorée, titre trop long coupé, 100 lignes maximum", () => {
  assert.deepEqual(analyserListe("-\n•  \n"), []);
  assert.equal(analyserListe("x".repeat(500))[0].titre.length, 160);
  assert.equal(analyserListe(Array.from({ length: 150 }, (_, i) => `Tâche ${i}`).join("\n")).length, 100);
});
