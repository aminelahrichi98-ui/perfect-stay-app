import assert from "node:assert/strict";
import { test } from "node:test";
import { PDFDocument } from "pdf-lib";
import { Dessin } from "./base.ts";
import { genererFacturePdf, type DonneesFacture } from "./facture.ts";
import { genererRapportPdf, type DonneesRapport } from "./rapport.ts";

const vendeur = {
  raison_sociale: "Perfect Stay Conciergerie",
  adresse: "12 rue Exemple, Gueliz, Marrakech",
  ice: "001234567000089",
  identifiant_fiscal: "12345678",
  registre_commerce: "98765",
  patente: "11223344",
  banque: "Banque Exemple",
  rib: "000 000 0000000000000000 00",
  email: "contact@perfectstay.ma",
  telephone: "+212 6 00 00 00 00",
  mention_reglement: "Commission perçue directement lors du partage des paiements de la plateforme.",
};

const lignes = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ date: `2026-09-${String((i % 28) + 1).padStart(2, "0")}`, montantRecu: 5000, fraisMenage: 300, loyerNet: 4700, taux: 20, commission: 940 }));

const facture = (n: number): DonneesFacture => ({
  numero: "PS-2026-0001",
  dateEmission: "2026-10-01",
  mois: "2026-09",
  vendeur,
  destinataire: { nom: "M. Karim Alami", adresse: "5 avenue Mohammed V, Casablanca", ice: "002233445566778" },
  logement: { nom: "LUXURIA 21", ville: "Marrakech" },
  lignes: lignes(n),
  totalHT: 783.33 * n,
  tauxTva: 20,
  montantTva: 156.67 * n,
  totalTTC: 940 * n,
});

test("la facture se génère, sur une page ou sur plusieurs si le détail est long", async () => {
  const court = await PDFDocument.load(await genererFacturePdf(facture(3)));
  assert.equal(court.getPageCount(), 1);
  const long = await PDFDocument.load(await genererFacturePdf(facture(60)));
  assert.ok(long.getPageCount() >= 2);
});

test("le rapport se génère, même sans aucun versement", async () => {
  const base: DonneesRapport = {
    mois: "2026-09",
    genereLe: "2026-10-01",
    vendeur,
    logement: { nom: "LUXURIA 21", ville: "Marrakech", type: "Appartement" },
    proprietaire: "M. Karim Alami",
    lignes: [],
    totaux: { montantsRecus: 0, menage: 0, loyerNet: 0, commissionTTC: 0, tva: 0, revenuProprietaire: 0 },
    tauxTva: 20,
    nuits: 0,
    nbSejours: 0,
    reservations: [],
    maintenance: [],
  };
  const vide = await PDFDocument.load(await genererRapportPdf(base));
  assert.equal(vide.getPageCount(), 1);
  const plein = await PDFDocument.load(
    await genererRapportPdf({
      ...base,
      lignes: lignes(40).map((l) => ({ ...l, revenuProprietaire: 3760 })),
      totaux: { montantsRecus: 200000, menage: 12000, loyerNet: 188000, commissionTTC: 37600, tva: 6266.67, revenuProprietaire: 150400 },
      nuits: 22,
      nbSejours: 3,
      reservations: [{ id: "r", arrivee: "2026-09-01", depart: "2026-09-23", type: "reservation" }],
      maintenance: [{ date: "2026-09-10", description: "Plomberie", montant: 450 }],
    }),
  );
  assert.ok(plein.getPageCount() >= 1);
});

test("les caractères que la police ne connaît pas sont remplacés au lieu de faire échouer le PDF", async () => {
  const d = await Dessin.creer("test");
  assert.equal(d.sain("Séjour → été 😀"), "Séjour -> été ?");
  assert.equal(d.sain("1 234,50"), "1 234,50");
});
