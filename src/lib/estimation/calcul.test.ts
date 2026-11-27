import assert from "node:assert/strict";
import { test } from "node:test";
import { arrondir, calculer, chargesVides, mensuel, type EntreeCalcul, type ParametresFinanciers } from "./calcul.ts";

const PARAMS: ParametresFinanciers = { tauxPlateforme: 0.18, tvaPlateforme: 0, tauxCommission: 0.2, tvaCommission: 0, baseCommission: "apres_plateforme", menageMode: "refacture_voyageur", menagePlateformePreleve: false, menagePartRevenu: null, methodeScenarios: "fourchette", arrondiMensuel: 100, devise: "MAD" };
const entree = (surcharge: Partial<EntreeCalcul> = {}): EntreeCalcul => ({
  params: PARAMS,
  marche: { revenuAnnuelBas: 139076, revenuAnnuelCentral: null, revenuAnnuelHaut: 174509, natureCentral: "inconnu", percentiles: [], basePlateformeIncluse: true, baseMenageInclus: false, baseTaxesIncluses: false, devise: "MAD" },
  charges: chargesVides(),
  longueDuree: { source: null, loyer: null, loyerBas: null, loyerHaut: null, charges: null, date: null },
  offre: null,
  baseConfirmee: false,
  ...surcharge,
});

test("test 5 : document existant, 18 % puis 20 %, le propriétaire garde 65,6 %", () => {
  const r = calculer(entree());
  const [prudent, central, haut] = r.scenarios;
  assert.deepEqual(r.scenarios.map((s) => s.cle), ["prudent", "central", "haut"]);
  assert.equal(arrondir(prudent.apresCommissions), 91234);
  assert.equal(arrondir(haut.apresCommissions), 114478);
  // Central calculé sur les valeurs non arrondies, et identifié comme tel
  assert.ok(central.derive);
  assert.match(central.source, /calculée/);
  assert.equal(central.formule, "(revenu annuel bas + revenu annuel haut) / 2");
  assert.ok(Math.abs(central.apresCommissions - (prudent.apresCommissions + haut.apresCommissions) / 2) < 1e-6);
  assert.equal(arrondir(central.apresCommissions), 102856);
  assert.ok(Math.abs(r.partProprietaire! - 0.656) < 1e-9);
  // Détail du bas : 139 076 − 25 033,68 = 114 042,32 ; commission 22 808,46
  assert.equal(arrondir(prudent.fraisPlateforme), 25034);
  assert.equal(arrondir(prudent.commission), 22808);
  // Mensuel : affiché à la centaine, détaillé au dirham
  assert.deepEqual([prudent, central, haut].map((s) => arrondir(mensuel(s.apresCommissions), 100)), [7600, 8600, 9500]);
  assert.equal(arrondir(mensuel(central.apresCommissions)), 8571);
  assert.equal(r.bloquants.length, 0);
  assert.ok(r.mentionMenageSansImpact);
});

test("paramètres non codés en dur : TVA sur la commission, base brute", () => {
  const avecTva = calculer(entree({ params: { ...PARAMS, tvaCommission: 0.2 } }));
  assert.equal(arrondir(avecTva.scenarios[0].commission), arrondir(139076 * 0.82 * 0.24));
  const surBrut = calculer(entree({ params: { ...PARAMS, baseCommission: "brut" } }));
  assert.equal(arrondir(surBrut.scenarios[0].commission), arrondir(139076 * 0.2));
});

test("pas de double déduction : revenus déjà nets de frais de plateforme", () => {
  const r = calculer(entree({ marche: { ...entree().marche, basePlateformeIncluse: false } }));
  assert.equal(r.deductionPlateforme, false);
  assert.equal(r.scenarios[0].fraisPlateforme, 0);
  assert.equal(arrondir(r.scenarios[0].apresCommissions), arrondir(139076 * 0.8));
});

test("définition des revenus inconnue : avertissement et confirmation exigée", () => {
  const r = calculer(entree({ marche: { ...entree().marche, basePlateformeIncluse: null } }));
  assert.ok(r.bloquants.some((b) => /Confirmez la base/.test(b)));
  assert.equal(calculer(entree({ marche: { ...entree().marche, basePlateformeIncluse: null }, baseConfirmee: true })).bloquants.length, 0);
});

test("ménage : mention « sans impact » seulement si elle est vraie", () => {
  assert.equal(calculer(entree({ params: { ...PARAMS, menagePlateformePreleve: true } })).mentionMenageSansImpact, false);
  assert.equal(calculer(entree({ params: { ...PARAMS, menageMode: "inconnu" } })).mentionMenageSansImpact, false);
  const inclus = calculer(entree({ marche: { ...entree().marche, baseMenageInclus: true }, params: { ...PARAMS, menagePartRevenu: 0.1 } }));
  assert.equal(inclus.mentionMenageSansImpact, false);
  assert.equal(arrondir(inclus.scenarios[0].menage), arrondir(139076 * 0.82 * 0.1));
  assert.ok(calculer(entree({ marche: { ...entree().marche, baseMenageInclus: true } })).avertissements.some((a) => /surestimé/.test(a)));
});

test("charges : résultat locatif avant fiscalité, postes non renseignés listés", () => {
  const r = calculer(entree({ charges: { ...chargesVides(), syndic: 400, internet: 300 } }));
  assert.equal(r.chargesMensuelles, 700);
  assert.equal(arrondir(r.central!.resultat!), arrondir(r.central!.apresCommissions - 8400));
  assert.deepEqual(r.chargesIncluses, ["Internet", "Syndic"]);
  assert.ok(r.chargesNonIncluses.includes("Électricité"));
  assert.equal(calculer(entree()).central!.resultat, null);
});

test("scénarios : percentiles PriceLabs conservés avec leurs libellés", () => {
  const marche = { ...entree().marche, percentiles: [25, 50, 75].map((rang, i) => ({ libelle: `${rang}e percentile`, rang, metrique: "revenu_annuel", valeur: [120000, 150000, 190000][i] })) };
  const r = calculer(entree({ marche, params: { ...PARAMS, methodeScenarios: "percentiles" } }));
  assert.deepEqual(r.scenarios.map((s) => [s.cle, s.brut, s.source]), [["prudent", 120000, "25e percentile (PriceLabs)"], ["central", 150000, "50e percentile (PriceLabs)"], ["haut", 190000, "75e percentile (PriceLabs)"]]);
  // Percentiles incomplets : retour à la fourchette, avec avertissement
  const incomplet = calculer(entree({ marche: { ...marche, percentiles: marche.percentiles.slice(0, 2) }, params: { ...PARAMS, methodeScenarios: "percentiles" } }));
  assert.equal(incomplet.scenarios[0].brut, 139076);
  assert.ok(incomplet.avertissements.some((a) => /percentiles/.test(a)));
});

test("une seule valeur : pas de fourchette inventée ; aucune valeur : blocage", () => {
  const seule = calculer(entree({ marche: { ...entree().marche, revenuAnnuelBas: null, revenuAnnuelHaut: null, revenuAnnuelCentral: 150000, natureCentral: "mediane" } }));
  assert.deepEqual(seule.scenarios.map((s) => s.cle), ["central"]);
  assert.equal(seule.fourchette, false);
  assert.equal(seule.scenarios[0].source, "Médiane (PriceLabs)");
  const rien = calculer(entree({ marche: { ...entree().marche, revenuAnnuelBas: null, revenuAnnuelHaut: null } }));
  assert.ok(rien.bloquants.some((b) => /Aucun revenu/.test(b)));
});

test("test 6 : comparaison longue durée (renseignée, absente, nulle, supérieure)", () => {
  const ld = (loyer: number | null, plus = {}) => entree({ longueDuree: { source: "crm", loyer, loyerBas: null, loyerHaut: null, charges: null, date: "2026-11-20", ...plus } });
  const c = calculer(ld(6500)).comparaison!;
  assert.equal(arrondir(c.courteMensuelle), 8571);
  assert.equal(arrondir(c.differenceMensuelle), 2071);
  assert.equal(arrondir(c.differenceAnnuelle), 24856);
  assert.equal(Math.round(c.pourcentage!), 32);
  assert.equal(c.base, "revenus");
  assert.equal(calculer(ld(null)).comparaison, null);
  const zero = calculer(ld(0));
  assert.equal(zero.comparaison!.pourcentage, null);
  const superieur = calculer(ld(10000));
  assert.ok(superieur.comparaison!.differenceMensuelle < 0);
  assert.ok(superieur.avertissements.some((a) => /longue durée rapporte davantage/.test(a)));
  // Fourchette de loyers : milieu calculé et signalé
  const f = calculer(entree({ longueDuree: { source: "fourchette", loyer: null, loyerBas: 6000, loyerHaut: 7000, charges: null, date: null } })).comparaison!;
  assert.equal(f.loyerMensuel, 6500);
  assert.ok(f.loyerDerive);
  // Charges des deux côtés : comparaison après charges
  const net = calculer(entree({ charges: { ...chargesVides(), syndic: 400 }, longueDuree: { source: "declare", loyer: 6500, loyerBas: null, loyerHaut: null, charges: 400, date: null } })).comparaison!;
  assert.equal(net.base, "resultat");
  assert.equal(arrondir(net.loyerMensuel), 6100);
});

test("offre : avantage ponctuel séparé du revenu récurrent", () => {
  const r = calculer(entree({ offre: { titre: "Premier mois offert", description: "", dureeMois: 1, conditions: "Nouveau mandat" } }));
  assert.equal(arrondir(r.offre!.valeurPonctuelle!), arrondir(mensuel(r.central!.commission)));
  assert.equal(arrondir(r.central!.apresCommissions), 102856); // le revenu récurrent n'intègre pas la promotion
});

test("devises différentes : jamais de conversion implicite", () => {
  const r = calculer(entree({ marche: { ...entree().marche, devise: "EUR" } }));
  assert.ok(r.bloquants.some((b) => /aucune conversion/.test(b)));
});

test("paramètres : valeurs par défaut et lien WhatsApp", async () => {
  const { parametresDepuisLigne, lienWhatsapp, numeroWhatsapp } = await import("./parametres.ts");
  const p = parametresDepuisLigne(null);
  assert.equal(p.financier.tauxPlateforme, 0.18);
  assert.equal(p.financier.tauxCommission, 0.2);
  assert.equal(p.donnees.fraicheurRecente, 30);
  assert.equal(numeroWhatsapp("06 12 34 56 78"), "212612345678");
  assert.equal(numeroWhatsapp("+212 6 12 34 56 78"), "212612345678");
  assert.equal(numeroWhatsapp("abc"), "");
  assert.equal(lienWhatsapp("0612345678", "Bonjour, j'ai reçu"), "https://wa.me/212612345678?text=Bonjour%2C%20j'ai%20re%C3%A7u");
  assert.equal(lienWhatsapp("", "x"), "");
});

test("snapshot : type historique, recommandations, saisonnalité fiable", async () => {
  const { typeBienHerite, recommandationsProposees, saisonnaliteFiable, manquantsBien, bienVide } = await import("./snapshot.ts");
  assert.equal(typeBienHerite("studio", 0), "studio_1ch");
  assert.equal(typeBienHerite("appartement", 1), "studio_1ch");
  assert.equal(typeBienHerite("appartement", 2), "2ch");
  assert.equal(typeBienHerite("duplex", 4), "3ch_plus");
  assert.equal(typeBienHerite("riad", 5), "villa");
  // On ne recommande pas un équipement déjà présent
  const avecWifi = recommandationsProposees(["wifi", "serrure_connectee"]);
  assert.ok(!avecWifi.some((r) => /fibre/.test(r)));
  assert.ok(!avecWifi.some((r) => /serrure/.test(r)));
  assert.ok(recommandationsProposees([]).some((r) => /fibre/.test(r)));
  const douze = Array.from({ length: 12 }, (_, i) => ({ mois: i + 1, nature: "historique" }));
  assert.equal(saisonnaliteFiable(douze), true);
  assert.equal(saisonnaliteFiable(douze.slice(0, 11)), false);
  assert.equal(saisonnaliteFiable([...douze.slice(0, 6), ...douze.slice(6).map((m) => ({ ...m, nature: "prevision" }))]), false);
  assert.deepEqual(manquantsBien(bienVide()), ["quartier", "type de logement", "nombre de chambres"]);
  assert.deepEqual(manquantsBien({ ...bienVide(), quartier: "Gauthier", type_logement: "studio" }), []);
});
