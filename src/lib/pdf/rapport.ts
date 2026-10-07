import { etatsDuMois } from "../calendrier.ts";
import { formatJour, libelleMois, nbJoursDuMois, type Mois } from "../dates.ts";
import { formatMontant } from "../format.ts";
import { A4, COULEURS, Dessin, LARGEUR_UTILE, MARGE } from "./base.ts";
import { mentionsLegales, type Vendeur } from "./facture.ts";

export type LigneRapport = {
  date: string;
  montantRecu: number;
  fraisMenage: number;
  loyerNet: number;
  commission: number; // TTC
  revenuProprietaire: number;
};

export type DonneesRapport = {
  mois: Mois;
  genereLe: string; // AAAA-MM-JJ
  vendeur: Vendeur;
  logement: { nom: string; ville: string; type: string };
  proprietaire: string;
  lignes: LigneRapport[];
  totaux: { montantsRecus: number; menage: number; loyerNet: number; commissionTTC: number; tva: number; revenuProprietaire: number };
  tauxTva: number;
  nuits: number;
  nbSejours: number;
  reservations: { id: string; arrivee: string; depart: string; type: "reservation" | "blocage" }[];
  maintenance: { date: string; description: string; montant: number }[];
};

const pourcent = (n: number) => `${Math.round(n * 100)} %`;

export async function genererRapportPdf(d: DonneesRapport): Promise<Uint8Array> {
  const dessin = await Dessin.creer(`Rapport mensuel ${d.logement.nom} ${d.mois}`, d.vendeur.raison_sociale || undefined);
  let page = dessin.nouvellePage();
  const periode = libelleMois(d.mois);
  const periodeMaj = periode.charAt(0).toUpperCase() + periode.slice(1);
  const jours = nbJoursDuMois(d.mois);

  let y = dessin.bandeau(page, "RAPPORT MENSUEL", periodeMaj) - 38;

  // Logement et propriétaire
  dessin.texte(page, d.logement.nom, MARGE, y, { taille: 20, gras: true });
  y -= 16;
  dessin.texte(page, [d.logement.ville, d.logement.type].filter(Boolean).join(" · "), MARGE, y, { taille: 10, couleur: COULEURS.gris });
  if (d.proprietaire) dessin.texte(page, `Propriétaire : ${d.proprietaire}`, A4.largeur - MARGE, y, { taille: 10, couleur: COULEURS.gris, align: "droite" });
  y -= 26;

  // Chiffres clés
  const nbCartes = 4;
  const ecart = 10;
  const lc = (LARGEUR_UTILE - ecart * (nbCartes - 1)) / nbCartes;
  const taux = jours ? d.nuits / jours : 0;
  const maintenanceTotal = d.maintenance.reduce((s, m) => s + Math.round(m.montant * 100), 0) / 100;
  const cartes: { label: string; valeur: string; sous: string; fort?: boolean }[] = [
    { label: "Revenu net propriétaire", valeur: formatMontant(d.totaux.revenuProprietaire), sous: "MAD, après commission", fort: true },
    { label: "Nuits réservées", valeur: `${d.nuits} / ${jours}`, sous: `Occupation ${pourcent(taux)}` },
    { label: "Séjours", valeur: String(d.nbSejours), sous: d.nbSejours > 1 ? "séjours dans le mois" : "séjour dans le mois" },
    { label: "Maintenance engagée", valeur: formatMontant(maintenanceTotal), sous: "MAD" },
  ];
  cartes.forEach((c, i) => {
    const x = MARGE + i * (lc + ecart);
    dessin.rect(page, x, y - 64, lc, 64, c.fort ? COULEURS.aubergine : COULEURS.creme, { rayon: 8 });
    dessin.texte(page, c.label.toUpperCase(), x + 11, y - 17, { taille: 6.8, gras: true, couleur: c.fort ? COULEURS.grisClair : COULEURS.gris });
    dessin.texte(page, c.valeur, x + 11, y - 39, { taille: c.fort ? 16 : 17, gras: true, couleur: c.fort ? COULEURS.blanc : COULEURS.encre });
    dessin.texte(page, c.sous, x + 11, y - 54, { taille: 8, couleur: c.fort ? COULEURS.creme : COULEURS.gris });
  });
  y -= 92;

  // Occupation jour par jour
  dessin.texte(page, "OCCUPATION DU MOIS", MARGE, y, { taille: 8, gras: true, couleur: COULEURS.bordeaux });
  y -= 8;
  const etats = etatsDuMois(d.mois, d.reservations);
  const gap = 2;
  const w = (LARGEUR_UTILE - gap * (jours - 1)) / jours;
  etats.forEach((e, i) => {
    const x = MARGE + i * (w + gap);
    const couleur = e.etat === "nuit" ? COULEURS.vert : e.etat === "blocage" ? COULEURS.ligne : COULEURS.creme;
    dessin.rect(page, x, y - 22, w, 22, couleur, { rayon: 2 });
    const numero = i + 1;
    if (numero === 1 || numero % 5 === 0 || numero === jours) dessin.texte(page, String(numero), x + w / 2, y - 33, { taille: 7, couleur: COULEURS.gris, align: "centre" });
  });
  y -= 52;
  dessin.rect(page, MARGE, y + 2, 10, 8, COULEURS.vert, { rayon: 2 });
  dessin.texte(page, "Nuit réservée", MARGE + 15, y + 2, { taille: 7.5, couleur: COULEURS.gris });
  dessin.rect(page, MARGE + 90, y + 2, 10, 8, COULEURS.ligne, { rayon: 2 });
  dessin.texte(page, "Nuits bloquées", MARGE + 105, y + 2, { taille: 7.5, couleur: COULEURS.gris });
  y -= 30;

  const colonnes = {
    date: MARGE + 10,
    recu: MARGE + 150,
    menage: MARGE + 222,
    net: MARGE + 305,
    commission: MARGE + 395,
    revenu: A4.largeur - MARGE - 10,
  };
  const entete = (p: typeof page, ybas: number) => {
    dessin.texte(p, "DÉTAIL DES VERSEMENTS (MAD)", MARGE, ybas, { taille: 8, gras: true, couleur: COULEURS.bordeaux });
    const yh = ybas - 12;
    dessin.rect(p, MARGE, yh - 18, LARGEUR_UTILE, 18, COULEURS.creme, { rayon: 4 });
    dessin.texte(p, "Date", colonnes.date, yh - 12, { taille: 8, gras: true, couleur: COULEURS.gris });
    dessin.texte(p, "Montant reçu", colonnes.recu, yh - 12, { taille: 8, gras: true, couleur: COULEURS.gris, align: "droite" });
    dessin.texte(p, "Ménage", colonnes.menage, yh - 12, { taille: 8, gras: true, couleur: COULEURS.gris, align: "droite" });
    dessin.texte(p, "Loyer net", colonnes.net, yh - 12, { taille: 8, gras: true, couleur: COULEURS.gris, align: "droite" });
    dessin.texte(p, "Commission TTC", colonnes.commission, yh - 12, { taille: 8, gras: true, couleur: COULEURS.gris, align: "droite" });
    dessin.texte(p, "Revenu propriétaire", colonnes.revenu, yh - 12, { taille: 8, gras: true, couleur: COULEURS.gris, align: "droite" });
    return yh - 18;
  };

  if (y < 200) {
    page = dessin.nouvellePage();
    y = A4.hauteur - 60;
  }
  y = entete(page, y);
  if (!d.lignes.length) {
    y -= 22;
    dessin.texte(page, "Aucun versement enregistré ce mois-ci.", MARGE + 10, y, { taille: 9, couleur: COULEURS.gris });
  }
  for (const l of d.lignes) {
    if (y < 130) {
      page = dessin.nouvellePage();
      y = entete(page, A4.hauteur - 60);
    }
    y -= 16;
    dessin.texte(page, formatJour(l.date), colonnes.date, y, { taille: 8.5 });
    dessin.texte(page, formatMontant(l.montantRecu), colonnes.recu, y, { taille: 8.5, align: "droite" });
    dessin.texte(page, formatMontant(l.fraisMenage), colonnes.menage, y, { taille: 8.5, align: "droite" });
    dessin.texte(page, formatMontant(l.loyerNet), colonnes.net, y, { taille: 8.5, align: "droite" });
    dessin.texte(page, formatMontant(l.commission), colonnes.commission, y, { taille: 8.5, align: "droite" });
    dessin.texte(page, formatMontant(l.revenuProprietaire), colonnes.revenu, y, { taille: 8.5, align: "droite", gras: true });
    dessin.trait(page, MARGE, y - 5, A4.largeur - MARGE, COULEURS.ligne, 0.5);
  }
  if (d.lignes.length) {
    if (y < 110) {
      page = dessin.nouvellePage();
      y = A4.hauteur - 60;
    }
    y -= 20;
    dessin.rect(page, MARGE, y - 8, LARGEUR_UTILE, 22, COULEURS.creme, { rayon: 4 });
    dessin.texte(page, "Total du mois", colonnes.date, y, { taille: 9, gras: true });
    dessin.texte(page, formatMontant(d.totaux.montantsRecus), colonnes.recu, y, { taille: 9, gras: true, align: "droite" });
    dessin.texte(page, formatMontant(d.totaux.menage), colonnes.menage, y, { taille: 9, gras: true, align: "droite" });
    dessin.texte(page, formatMontant(d.totaux.loyerNet), colonnes.net, y, { taille: 9, gras: true, align: "droite" });
    dessin.texte(page, formatMontant(d.totaux.commissionTTC), colonnes.commission, y, { taille: 9, gras: true, align: "droite" });
    dessin.texte(page, formatMontant(d.totaux.revenuProprietaire), colonnes.revenu, y, { taille: 9, gras: true, align: "droite", couleur: COULEURS.bordeaux });
    y -= 22;
    y = dessin.paragraphe(
      page,
      `La commission de Perfect Stay est exprimée toutes taxes comprises (dont TVA ${String(d.tauxTva).replace(".", ",")} % : ${formatMontant(d.totaux.tva)} MAD). Les frais de ménage sont perçus directement par Perfect Stay et ne sont pas déduits de votre revenu.`,
      MARGE,
      y,
      LARGEUR_UTILE,
      { taille: 8, couleur: COULEURS.gris },
    );
  }

  // Maintenance engagée
  if (d.maintenance.length) {
    if (y < 140) {
      page = dessin.nouvellePage();
      y = A4.hauteur - 60;
    }
    y -= 20;
    dessin.texte(page, "FRAIS DE MAINTENANCE ENGAGÉS (MAD)", MARGE, y, { taille: 8, gras: true, couleur: COULEURS.bordeaux });
    y -= 6;
    for (const m of d.maintenance) {
      if (y < 90) {
        page = dessin.nouvellePage();
        y = A4.hauteur - 60;
      }
      y -= 16;
      dessin.texte(page, formatJour(m.date), colonnes.date, y, { taille: 8.5 });
      dessin.texte(page, m.description || "Maintenance", colonnes.date + 80, y, { taille: 8.5 });
      dessin.texte(page, formatMontant(m.montant), A4.largeur - MARGE - 10, y, { taille: 8.5, align: "droite" });
      dessin.trait(page, MARGE, y - 5, A4.largeur - MARGE, COULEURS.ligne, 0.5);
    }
  }

  const dernier = dessin.pdf.getPages().at(-1)!;
  dessin.texte(dernier, `Rapport généré le ${formatJour(d.genereLe)}`, MARGE, 62, { taille: 7.5, couleur: COULEURS.grisClair });
  dessin.piedsDePage(mentionsLegales(d.vendeur));
  return dessin.octets();
}
