import assert from "node:assert/strict";
import { test } from "node:test";
import { adresseAutorisee, analyserMeta, codeCreative, deviseDeLEntete, devinerColonnes, indicateurs, recommander, REGLAGES_DEPART, sortDeLaLigne, totaliser } from "./creative.ts";

const FR = [
  "Jour;Nom de la publicité;ID de la publicité;Montant dépensé (EUR);Impressions;Clics sur un lien;Prospects",
  "01/11/2026;ANG-001 Data V1;120210000000000001;12,50;1 240;18;2",
  "02/11/2026;ANG-001 Data V1;120210000000000001;9,80;980;11;0",
  "02/11/2026;Photo V1;120210000000000002;4,20;410;3;",
  ";Total;;26,50;2 630;32;2",
].join("\n");

const EN = [
  "Reporting starts,Reporting ends,Ad name,Ad ID,Amount spent (EUR),Impressions,Link clicks,Leads",
  '11/01/2026,11/30/2026,Hook V1,120210000000000003,"1,234.56","45,210",612,31',
].join("\n");

test("export français : dates JJ/MM, virgules décimales, ligne de total ignorée", () => {
  const a = analyserMeta(FR);
  assert.ok(a.ok);
  assert.equal(a.devise, "EUR");
  assert.equal(a.lignes.length, 3);
  assert.equal(a.ignorees, 1);
  assert.deepEqual(a.lignes[0], { adId: "120210000000000001", nom: "ANG-001 Data V1", debut: "2026-11-01", fin: "2026-11-01", depenses: 12.5, impressions: 1240, clics: 18, leads: 2 });
  assert.equal(a.lignes[2].leads, 0); // cellule vide = 0 lead
});

test("export anglais : période, dates MM/JJ, milliers à l'anglaise", () => {
  const a = analyserMeta(EN);
  assert.ok(a.ok);
  assert.deepEqual(a.lignes[0], { adId: "120210000000000003", nom: "Hook V1", debut: "2026-11-01", fin: "2026-11-30", depenses: 1234.56, impressions: 45210, clics: 612, leads: 31 });
});

test("colonnes : reconnues en français et en anglais, devise lue dans l'intitulé", () => {
  const m = devinerColonnes(["Day", "Ad ID", "Amount spent (USD)", "Impressions", "Link clicks", "Leads", "Ad name"]);
  assert.deepEqual([m.date, m.adId, m.depenses, m.impressions, m.clics, m.leads, m.nom], [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(deviseDeLEntete("Amount spent (USD)"), "USD");
  assert.equal(deviseDeLEntete("Dépenses"), null);
});

test("colonne obligatoire manquante : refus avec le nom de la colonne", () => {
  const a = analyserMeta("Jour;Nom de la publicité;Montant dépensé (EUR);Impressions;Clics sur un lien;Prospects\n01/11/2026;A;1;1;1;1");
  assert.equal(a.ok, false);
  assert.match(a.ok ? "" : a.erreur, /Identifiant de la publicité/);
});

test("correspondance manuelle : l'utilisateur désigne la colonne des leads", () => {
  const texte = "Jour;ID de la publicité;Montant dépensé (EUR);Impressions;Clics sur un lien;Résultats\n01/11/2026;120210000000000001;5;100;4;1";
  assert.equal(analyserMeta(texte).ok, false);
  const a = analyserMeta(texte, { leads: 5 });
  assert.ok(a.ok);
  assert.equal(a.lignes[0].leads, 1);
});

test("lignes illisibles : listées en erreur, jamais importées", () => {
  const a = analyserMeta(
    ["Jour;ID de la publicité;Montant dépensé (EUR);Impressions;Clics sur un lien;Prospects", "01/11/2026;1,2021E+17;5;100;4;1", "32/11/2026;120210000000000001;5;100;4;1", "01/11/2026;120210000000000001;abc;100;4;1", "01/11/2026;120210000000000002;5;100;4;1"].join("\n"),
  );
  assert.ok(a.ok);
  assert.equal(a.lignes.length, 1);
  assert.deepEqual(a.erreurs.map((e) => e.ligne), [2, 3, 4]);
  assert.match(a.erreurs[0].message, /tableur/);
});

test("répartitions (âge, placement) : les lignes d'une même publicité et d'un même jour s'additionnent", () => {
  const a = analyserMeta(["Jour;ID de la publicité;Montant dépensé (EUR);Impressions;Clics sur un lien;Prospects", "01/11/2026;120210000000000001;0,10;100;4;1", "01/11/2026;120210000000000001;0,20;50;1;0"].join("\n"));
  assert.ok(a.ok);
  assert.equal(a.lignes.length, 1);
  assert.equal(a.regroupees, 1);
  assert.deepEqual([a.lignes[0].depenses, a.lignes[0].impressions, a.lignes[0].clics, a.lignes[0].leads], [0.3, 150, 5, 1]);
});

test("doublons : même période = mise à jour, période qui se recouvre = refus", () => {
  const base = [{ adId: "1", debut: "2026-11-01", fin: "2026-11-01" }, { adId: "1", debut: "2026-11-02", fin: "2026-11-02" }];
  assert.equal(sortDeLaLigne({ adId: "1", debut: "2026-11-01", fin: "2026-11-01" }, base), "mise_a_jour");
  assert.equal(sortDeLaLigne({ adId: "1", debut: "2026-11-03", fin: "2026-11-03" }, base), "nouvelle");
  assert.equal(sortDeLaLigne({ adId: "1", debut: "2026-11-01", fin: "2026-11-30" }, base), "chevauchement");
  assert.equal(sortDeLaLigne({ adId: "2", debut: "2026-11-01", fin: "2026-11-30" }, base), "nouvelle");
});

test("indicateurs : calculés sur les totaux, jamais une moyenne de CPL", () => {
  const a = { depenses: 10, impressions: 1000, clics: 10, leads: 1 }; // CPL 10
  const b = { depenses: 90, impressions: 3000, clics: 60, leads: 3 }; // CPL 30
  const i = indicateurs(totaliser([a, b]));
  assert.equal(i.cpl, 25); // 100 ÷ 4, et non (10 + 30) ÷ 2 = 20
  assert.equal(i.ctr, 1.75);
  assert.equal(i.cpc, 1.43);
  assert.deepEqual(indicateurs({ depenses: 5, impressions: 0, clics: 0, leads: 0 }), { depenses: 5, impressions: 0, clics: 0, leads: 0, ctr: null, cpc: null, cpl: null });
  assert.equal(totaliser([{ ...a, depenses: 0.1 }, { ...a, depenses: 0.2 }]).depenses, 0.3);
});

test("recommandations : jamais de gagnant sans données suffisantes", () => {
  const r = { ...REGLAGES_DEPART, cplConfirme: true };
  assert.equal(recommander({ depenses: 0, impressions: 0, clics: 0, leads: 0 }, r).statut, "INSUFFICIENT_DATA");
  // 2 leads à 4 € : excellent en apparence, mais moins de 3 leads
  const mince = recommander({ depenses: 8, impressions: 900, clics: 20, leads: 2 }, r);
  assert.equal(mince.statut, "INSUFFICIENT_DATA");
  assert.match(mince.raisons[0], /provisoire/);
  assert.equal(recommander({ depenses: 12, impressions: 700, clics: 9, leads: 0 }, r).statut, "INSUFFICIENT_DATA");
});

test("recommandations : continuer, tester une image, mettre en pause, avec leurs raisons", () => {
  const r = { ...REGLAGES_DEPART, cplConfirme: true };
  assert.equal(recommander({ depenses: 27, impressions: 4000, clics: 60, leads: 3 }, r).statut, "CONTINUE"); // CPL 9
  assert.equal(recommander({ depenses: 36, impressions: 4000, clics: 60, leads: 3 }, r).statut, "TEST_NEW_IMAGE"); // CPL 12
  assert.equal(recommander({ depenses: 60, impressions: 4000, clics: 60, leads: 3 }, r).statut, "PAUSE"); // CPL 20
  const sansLead = recommander({ depenses: 22, impressions: 3000, clics: 40, leads: 0 }, r);
  assert.equal(sansLead.statut, "PAUSE");
  assert.match(sansLead.raisons[0], /sans aucun lead/);
  // CTR 0,3 % avec assez d'impressions et peu dépensé : l'image n'accroche pas
  assert.equal(recommander({ depenses: 9, impressions: 2000, clics: 6, leads: 0 }, r).statut, "TEST_NEW_IMAGE");
  assert.equal(recommander({ depenses: 45, impressions: 3000, clics: 40, leads: 1 }, r).statut, "PAUSE"); // 1 lead à 45 €
});

test("CPL cible non confirmé : la raison le signale", () => {
  const avis = recommander({ depenses: 27, impressions: 4000, clics: 60, leads: 3 }, REGLAGES_DEPART);
  assert.match(avis.raisons[0], /à confirmer dans les réglages/);
});

test("code d'une image", () => {
  assert.equal(codeCreative("ANG-003", "data", 2), "ANG-003-DATA-V2");
  assert.equal(codeCreative("ANG-010", "avant_apres", 1), "ANG-010-AVAP-V1");
});

test("dépôt par adresse : seuls les fichiers https de Higgsfield sont acceptés", () => {
  assert.ok(adresseAutorisee("https://d8j0ntlcm91z4.cloudfront.net/user_x/image.png"));
  for (const refusee of ["http://d8j0ntlcm91z4.cloudfront.net/a.png", "https://exemple.com/a.png", "https://d8j0ntlcm91z4.cloudfront.net.exemple.com/a.png", "https://user@d8j0ntlcm91z4.cloudfront.net/a.png", "https://d8j0ntlcm91z4.cloudfront.net:8443/a.png", "https://169.254.169.254/latest", "file:///etc/passwd", "pas une adresse"]) {
    assert.equal(adresseAutorisee(refusee), null, refusee);
  }
});
