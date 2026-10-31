import assert from "node:assert/strict";
import { test } from "node:test";
import { analyserAirbnb, decider, devinerLogement, lireMontant, type ContexteImport, type LigneAirbnb } from "./import-airbnb.ts";

const ANGLAIS = [
  "Date,Arriving by date,Type,Confirmation Code,Booking date,Start date,End date,Nights,Guest,Listing,Details,Reference code,Currency,Amount,Paid out,Service fee,Fast pay fee,Cleaning fee,Gross earnings,Occupancy taxes,Earnings year",
  "10/06/2026,10/06/2026,Payout,,,,,,,,Transfer to ****1234,,MAD,,3200.00,,,,,,",
  "10/06/2026,,Reservation,HMABC12345,09/20/2026,10/05/2026,10/08/2026,3,Sara B,Riad Jasmin Médina,,,MAD,\"1,850.50\",,55.50,,300.00,1906.00,,2026",
  "10/12/2026,,Reservation,HMXYZ67890,09/30/2026,10/11/2026,,4,John D,Appart Gueliz,,,MAD,1349.5,,40.00,,250.00,1389.50,,2026",
  "10/13/2026,,Resolution Adjustment,HMXYZ67890,,,,,,Appart Gueliz,,,MAD,-100,,,,,,,2026",
].join("\n");

const FRANCAIS = [
  "Date;Date de disponibilité prévue;Type;Code de confirmation;Date de réservation;Date de début;Date de fin;Nuits;Voyageur;Annonce;Détails;Code de référence;Devise;Montant;Versé;Frais de service",
  "06/10/2026;;Réservation;HMFR000001;20/09/2026;05/10/2026;08/10/2026;3;Amine;Riad Jasmin;;;EUR;180,50;;5,40",
  "06/10/2026;;Versement;;;;;;;;Virement;;EUR;;180,50;",
].join("\n");

test("relevé Airbnb en anglais : seules les réservations sont gardées", () => {
  const a = analyserAirbnb(ANGLAIS);
  assert.ok(a.ok);
  if (!a.ok) return;
  assert.equal(a.lignes.length, 2);
  assert.equal(a.autres, 2); // le virement et l'ajustement
  assert.deepEqual(a.erreurs, []);
  const [r1, r2] = a.lignes;
  assert.deepEqual(
    { code: r1.code, arrivee: r1.arrivee, depart: r1.depart, montant: r1.montant, annonce: r1.annonce, voyageur: r1.voyageur, devise: r1.devise },
    { code: "HMABC12345", arrivee: "2026-10-05", depart: "2026-10-08", montant: 1850.5, annonce: "Riad Jasmin Médina", voyageur: "Sara B", devise: "MAD" },
  );
  // Pas de date de fin : calculée avec les nuits
  assert.equal(r2.depart, "2026-10-15");
});

test("relevé Airbnb en français : dates JJ/MM et virgule décimale", () => {
  const a = analyserAirbnb(FRANCAIS);
  assert.ok(a.ok);
  if (!a.ok) return;
  assert.equal(a.lignes.length, 1);
  assert.equal(a.lignes[0].arrivee, "2026-10-05");
  assert.equal(a.lignes[0].depart, "2026-10-08");
  assert.equal(a.lignes[0].montant, 180.5);
  assert.equal(a.lignes[0].devise, "EUR");
});

test("un fichier qui n'est pas un relevé Airbnb est refusé", () => {
  const a = analyserAirbnb("Nom,Téléphone\nSara,0600000000");
  assert.equal(a.ok, false);
});

test("les montants s'écrivent de plusieurs façons", () => {
  assert.equal(lireMontant("1 234,56"), 1234.56);
  assert.equal(lireMontant("1,234.56"), 1234.56);
  assert.equal(lireMontant("1.234,56"), 1234.56);
  assert.equal(lireMontant("1,234"), 1234);
  assert.equal(lireMontant("12,5"), 12.5);
  assert.equal(lireMontant("MAD 980"), 980);
  assert.equal(lireMontant("-100.00"), -100);
  assert.ok(Number.isNaN(lireMontant("")));
});

const ligne = (p: Partial<LigneAirbnb> = {}): LigneAirbnb => ({
  ligne: 2,
  code: "HMABC12345",
  arrivee: "2026-10-05",
  depart: "2026-10-08",
  voyageur: "Sara",
  annonce: "Riad",
  devise: "MAD",
  montant: 1500,
  ...p,
});
const ctx = (p: Partial<ContexteImport> = {}): ContexteImport => ({
  reservations: {},
  refs: [],
  occupes: [],
  reservationsVersees: [],
  logements: { L1: { frais_menage: 200 }, L2: { frais_menage: 300 } },
  ...p,
});

test("la réservation du calendrier impose son logement", () => {
  const d = decider(ligne(), "L2", 1, ctx({ reservations: { HMABC12345: { id: "R1", logement_id: "L1" } } }));
  assert.deepEqual(d, { statut: "ok", logementId: "L1", reservationId: "R1", montant: 1500 });
});

test("jamais deux fois le même versement", () => {
  assert.equal(decider(ligne(), "L1", 1, ctx({ refs: ["HMABC12345|2026-10-05"] })).statut, "deja");
  assert.equal(decider(ligne(), "L1", 1, ctx({ reservations: { HMABC12345: { id: "R1", logement_id: "L1" } }, reservationsVersees: ["R1"] })).statut, "deja");
  assert.equal(decider(ligne(), "L1", 1, ctx({ occupes: ["L1|2026-10-05"] })).statut, "deja");
});

test("logement à choisir, conversion et ménage", () => {
  assert.equal(decider(ligne(), "", 1, ctx()).statut, "a_choisir");
  assert.equal(decider(ligne({ devise: "EUR", montant: 150 }), "L1", 0, ctx()).statut, "refuse");
  assert.deepEqual(decider(ligne({ devise: "EUR", montant: 150 }), "L1", 10.85, ctx()), { statut: "ok", logementId: "L1", reservationId: null, montant: 1627.5 });
  assert.equal(decider(ligne({ montant: 250 }), "L2", 1, ctx()).statut, "refuse");
});

test("le nom de l'annonce retrouve le logement", () => {
  const logements = [
    { id: "a", nom: "Riad Jasmin" },
    { id: "b", nom: "Appart Gueliz" },
  ];
  assert.equal(devinerLogement("Riad Jasmin", logements), "a");
  assert.equal(devinerLogement("Riad Jasmin Médina · piscine", logements), "a");
  assert.equal(devinerLogement("Villa Palmeraie", logements), "");
});
