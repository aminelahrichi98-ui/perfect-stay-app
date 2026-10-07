import { degrees } from "pdf-lib";
import { formatJour, libelleMois, type Mois } from "../dates.ts";
import { formatMontant } from "../format.ts";
import { montantEnLettres } from "../montant-en-lettres.ts";
import { A4, COULEURS, Dessin, LARGEUR_UTILE, MARGE } from "./base.ts";

export type Vendeur = {
  raison_sociale: string;
  adresse: string;
  ice: string;
  identifiant_fiscal: string;
  registre_commerce: string;
  patente: string;
  banque: string;
  rib: string;
  email: string;
  telephone: string;
  mention_reglement: string;
};

export type Destinataire = { nom: string; adresse: string; ice: string };

export type LigneFacture = {
  date: string;
  montantRecu: number;
  fraisMenage: number;
  loyerNet: number;
  taux: number;
  commission: number; // TTC
};

export type DonneesFacture = {
  numero: string;
  dateEmission: string; // AAAA-MM-JJ
  mois: Mois;
  vendeur: Vendeur;
  destinataire: Destinataire;
  logement: { nom: string; ville: string };
  lignes: LigneFacture[];
  totalHT: number;
  tauxTva: number;
  montantTva: number;
  totalTTC: number;
  annulee?: boolean;
};

const pourcent = (n: number) => `${String(n).replace(".", ",")} %`;

export function mentionsLegales(v: Vendeur) {
  return [v.raison_sociale, v.ice && `ICE ${v.ice}`, v.identifiant_fiscal && `IF ${v.identifiant_fiscal}`, v.registre_commerce && `RC ${v.registre_commerce}`, v.patente && `Patente ${v.patente}`]
    .filter(Boolean)
    .join(" · ");
}

export async function genererFacturePdf(d: DonneesFacture): Promise<Uint8Array> {
  const dessin = await Dessin.creer(`Facture ${d.numero}`, d.vendeur.raison_sociale || undefined);
  const page = dessin.nouvellePage();
  const haut = A4.hauteur;
  const periode = libelleMois(d.mois);
  const periodeMaj = periode.charAt(0).toUpperCase() + periode.slice(1);

  let y = dessin.bandeau(page, "FACTURE", `N° ${d.numero}`) - 34;

  // Émetteur / destinataire
  const colonneDroite = MARGE + LARGEUR_UTILE / 2 + 12;
  const largeurColonne = LARGEUR_UTILE / 2 - 12;
  dessin.texte(page, "ÉMETTEUR", MARGE, y, { taille: 7.5, gras: true, couleur: COULEURS.bordeaux });
  dessin.texte(page, "DESTINATAIRE", colonneDroite, y, { taille: 7.5, gras: true, couleur: COULEURS.bordeaux });
  let yG = y - 15;
  let yD = y - 15;
  dessin.texte(page, d.vendeur.raison_sociale || "Perfect Stay Conciergerie", MARGE, yG, { taille: 11, gras: true });
  yG -= 14;
  const v = d.vendeur;
  if (v.adresse) yG = dessin.paragraphe(page, v.adresse, MARGE, yG, largeurColonne, { taille: 9, couleur: COULEURS.gris });
  for (const l of [v.ice && `ICE : ${v.ice}`, v.identifiant_fiscal && `IF : ${v.identifiant_fiscal}`, v.registre_commerce && `RC : ${v.registre_commerce}`, v.patente && `Patente : ${v.patente}`, v.email, v.telephone].filter(Boolean) as string[]) {
    dessin.texte(page, l, MARGE, yG, { taille: 9, couleur: COULEURS.gris });
    yG -= 12;
  }

  dessin.texte(page, d.destinataire.nom || "Propriétaire", colonneDroite, yD, { taille: 11, gras: true });
  yD -= 14;
  if (d.destinataire.adresse) yD = dessin.paragraphe(page, d.destinataire.adresse, colonneDroite, yD, largeurColonne, { taille: 9, couleur: COULEURS.gris });
  if (d.destinataire.ice) {
    dessin.texte(page, `ICE : ${d.destinataire.ice}`, colonneDroite, yD, { taille: 9, couleur: COULEURS.gris });
    yD -= 12;
  }
  yD -= 4;
  dessin.texte(page, `Logement : ${d.logement.nom}${d.logement.ville ? `, ${d.logement.ville}` : ""}`, colonneDroite, yD, { taille: 9, couleur: COULEURS.encre });
  yD -= 12;

  y = Math.min(yG, yD) - 14;

  // Dates
  const cartes: [string, string][] = [
    ["Date d'émission", formatJour(d.dateEmission)],
    ["Période facturée", periodeMaj],
    ["Devise", "Dirham marocain (MAD)"],
  ];
  const lc = (LARGEUR_UTILE - 2 * 10) / 3;
  cartes.forEach(([label, valeur], i) => {
    const x = MARGE + i * (lc + 10);
    dessin.rect(page, x, y - 38, lc, 38, COULEURS.creme, { rayon: 6 });
    dessin.texte(page, label.toUpperCase(), x + 11, y - 14, { taille: 7, gras: true, couleur: COULEURS.gris });
    dessin.texte(page, valeur, x + 11, y - 29, { taille: 10.5, gras: true });
  });
  y -= 64;

  // Ligne de facturation
  dessin.rect(page, MARGE, y - 22, LARGEUR_UTILE, 22, COULEURS.aubergine, { rayon: 5 });
  dessin.texte(page, "Désignation", MARGE + 12, y - 15, { taille: 9, gras: true, couleur: COULEURS.blanc });
  dessin.texte(page, "Montant HT (MAD)", A4.largeur - MARGE - 12, y - 15, { taille: 9, gras: true, couleur: COULEURS.blanc, align: "droite" });
  y -= 22;

  const base = d.lignes.reduce((s, l) => s + Math.round(l.loyerNet * 100), 0) / 100;
  y -= 18;
  dessin.texte(page, "Commission de gestion locative", MARGE + 12, y, { taille: 10.5, gras: true });
  dessin.texte(page, formatMontant(d.totalHT), A4.largeur - MARGE - 12, y, { taille: 10.5, gras: true, align: "droite" });
  y -= 14;
  dessin.texte(page, `${d.logement.nom}, ${periode}`, MARGE + 12, y, { taille: 9, couleur: COULEURS.gris });
  y -= 12;
  dessin.texte(page, `Calculée sur ${formatMontant(base)} MAD de loyers nets hors frais de ménage (${d.lignes.length} versement${d.lignes.length > 1 ? "s" : ""}).`, MARGE + 12, y, { taille: 9, couleur: COULEURS.gris });
  y -= 14;
  dessin.trait(page, MARGE, y, A4.largeur - MARGE);
  y -= 24;

  // Totaux
  const xLabel = A4.largeur - MARGE - 230;
  const xVal = A4.largeur - MARGE - 12;
  dessin.texte(page, "Total HT", xLabel, y, { taille: 10, couleur: COULEURS.gris });
  dessin.texte(page, `${formatMontant(d.totalHT)} MAD`, xVal, y, { taille: 10, align: "droite" });
  y -= 17;
  dessin.texte(page, `TVA ${pourcent(d.tauxTva)}`, xLabel, y, { taille: 10, couleur: COULEURS.gris });
  dessin.texte(page, `${formatMontant(d.montantTva)} MAD`, xVal, y, { taille: 10, align: "droite" });
  y -= 10;
  dessin.rect(page, xLabel - 10, y - 32, 242, 32, COULEURS.creme, { rayon: 6 });
  dessin.texte(page, "Total TTC", xLabel, y - 21, { taille: 11.5, gras: true });
  dessin.texte(page, `${formatMontant(d.totalTTC)} MAD`, xVal, y - 21, { taille: 13, gras: true, couleur: COULEURS.bordeaux, align: "droite" });
  y -= 56;

  // Montant en lettres + règlement
  y = dessin.paragraphe(page, `Arrêtée la présente facture à la somme de : ${montantEnLettres(d.totalTTC)} toutes taxes comprises.`, MARGE, y, LARGEUR_UTILE, { taille: 9.5, gras: true });
  y -= 6;
  if (d.vendeur.mention_reglement) y = dessin.paragraphe(page, d.vendeur.mention_reglement, MARGE, y, LARGEUR_UTILE, { taille: 9, couleur: COULEURS.gris });
  if (d.vendeur.banque || d.vendeur.rib) {
    y -= 4;
    y = dessin.paragraphe(page, `Coordonnées bancaires : ${[d.vendeur.banque, d.vendeur.rib && `RIB ${d.vendeur.rib}`].filter(Boolean).join(" · ")}`, MARGE, y, LARGEUR_UTILE, { taille: 9, couleur: COULEURS.gris });
  }

  // Annexe : détail des versements
  let courante = page;
  let yy = y - 26;
  const enteteTableau = (p: typeof page, ybas: number) => {
    dessin.texte(p, "DÉTAIL DES VERSEMENTS DU MOIS (MAD)", MARGE, ybas, { taille: 8, gras: true, couleur: COULEURS.bordeaux });
    const yh = ybas - 12;
    dessin.rect(p, MARGE, yh - 18, LARGEUR_UTILE, 18, COULEURS.creme, { rayon: 4 });
    const cols = colonnes();
    dessin.texte(p, "Date", cols.date, yh - 12, { taille: 8, gras: true, couleur: COULEURS.gris });
    dessin.texte(p, "Montant reçu", cols.recu, yh - 12, { taille: 8, gras: true, couleur: COULEURS.gris, align: "droite" });
    dessin.texte(p, "Ménage", cols.menage, yh - 12, { taille: 8, gras: true, couleur: COULEURS.gris, align: "droite" });
    dessin.texte(p, "Loyer net", cols.net, yh - 12, { taille: 8, gras: true, couleur: COULEURS.gris, align: "droite" });
    dessin.texte(p, "Taux", cols.taux, yh - 12, { taille: 8, gras: true, couleur: COULEURS.gris, align: "droite" });
    dessin.texte(p, "Commission TTC", cols.commission, yh - 12, { taille: 8, gras: true, couleur: COULEURS.gris, align: "droite" });
    return yh - 18;
  };
  const colonnes = () => ({
    date: MARGE + 10,
    recu: MARGE + 170,
    menage: MARGE + 240,
    net: MARGE + 320,
    taux: MARGE + 375,
    commission: A4.largeur - MARGE - 10,
  });

  if (yy < 150) {
    courante = dessin.nouvellePage();
    yy = A4.hauteur - 60;
  }
  yy = enteteTableau(courante, yy);
  const cols = colonnes();
  for (const l of d.lignes) {
    if (yy < 80) {
      courante = dessin.nouvellePage();
      yy = enteteTableau(courante, A4.hauteur - 60);
    }
    yy -= 16;
    dessin.texte(courante, formatJour(l.date), cols.date, yy, { taille: 8.5 });
    dessin.texte(courante, formatMontant(l.montantRecu), cols.recu, yy, { taille: 8.5, align: "droite" });
    dessin.texte(courante, formatMontant(l.fraisMenage), cols.menage, yy, { taille: 8.5, align: "droite" });
    dessin.texte(courante, formatMontant(l.loyerNet), cols.net, yy, { taille: 8.5, align: "droite" });
    dessin.texte(courante, pourcent(l.taux), cols.taux, yy, { taille: 8.5, align: "droite" });
    dessin.texte(courante, formatMontant(l.commission), cols.commission, yy, { taille: 8.5, align: "droite" });
    dessin.trait(courante, MARGE, yy - 5, A4.largeur - MARGE, COULEURS.ligne, 0.5);
  }

  if (d.annulee) {
    for (const p of dessin.pdf.getPages()) {
      p.drawText("ANNULÉE", { x: 120, y: haut / 2 - 40, size: 90, font: dessin.gras, color: COULEURS.bordeaux, opacity: 0.12, rotate: degrees(30) });
    }
  }

  dessin.piedsDePage(mentionsLegales(d.vendeur));
  return dessin.octets();
}
