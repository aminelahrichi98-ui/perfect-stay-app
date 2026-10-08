import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

/*
  Outils de dessin pour les PDF (factures, rapports). On utilise les polices standard du PDF
  (Helvetica) : aucun fichier de police à embarquer, donc le rendu est identique partout, y compris
  sur le serveur Vercel. Les caractères que cette police ne sait pas écrire sont remplacés.
*/

export const A4 = { largeur: 595.28, hauteur: 841.89 };
export const MARGE = 48;
export const LARGEUR_UTILE = A4.largeur - 2 * MARGE;

const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

export const COULEURS = {
  aubergine: hex("#2b1727"),
  aubergineClair: hex("#3a2034"),
  bordeaux: hex("#9d2441"),
  encre: hex("#22141c"),
  gris: hex("#6b5a65"),
  grisClair: hex("#a79ca3"),
  ligne: hex("#e4dce1"),
  creme: hex("#f7eff2"),
  blanc: hex("#ffffff"),
  vert: hex("#47b06b"),
  vertPale: hex("#e3f3e9"),
};

/** Le « P » en chevrons de Perfect Stay (mêmes tracés que le logo de l'application) */
const LOGO = {
  origine: [150, 158] as const,
  largeur: 840,
  hauteur: 756,
  formes: [
    [[330, 215], [360, 268], [212, 537], [152, 537]],
    [[390, 321], [420, 374], [331, 537], [271, 537]],
    [[451, 427], [481, 480], [449, 537], [389, 537]],
    [[360, 160], [420, 160], [628, 537], [628, 912], [570, 912], [570, 537]],
    [[480, 160], [540, 160], [748, 537], [748, 912], [689, 912], [689, 537]],
    [[598, 160], [658, 160], [866, 537], [866, 755], [810, 855], [808, 537]],
    [[717, 160], [777, 160], [986, 537], [928, 642], [926, 537]],
  ],
};

export type Alignement = "gauche" | "droite" | "centre";

export class Dessin {
  readonly pdf: PDFDocument;
  readonly regulier: PDFFont;
  readonly gras: PDFFont;

  private constructor(pdf: PDFDocument, regulier: PDFFont, gras: PDFFont) {
    this.pdf = pdf;
    this.regulier = regulier;
    this.gras = gras;
  }

  static async creer(titre: string, auteur = "Perfect Stay Conciergerie") {
    const pdf = await PDFDocument.create();
    pdf.setTitle(titre);
    pdf.setAuthor(auteur);
    pdf.setCreator("Perfect Stay");
    const regulier = await pdf.embedFont(StandardFonts.Helvetica);
    const gras = await pdf.embedFont(StandardFonts.HelveticaBold);
    return new Dessin(pdf, regulier, gras);
  }

  nouvellePage(): PDFPage {
    return this.pdf.addPage([A4.largeur, A4.hauteur]);
  }

  /** Remplace ce que la police ne sait pas écrire (flèches, emoji…) pour ne jamais faire échouer un PDF. */
  sain(texte: string, gras = false): string {
    const police = gras ? this.gras : this.regulier;
    const connus = new Set(police.getCharacterSet());
    const propre = texte.replace(/[\u202f\u00a0]/g, " ").replace(/→/g, "->").replace(/[\r\n\t]+/g, " ");
    // Array.from parcourt caractère par caractère (un emoji compte pour un seul)
    return Array.from(propre)
      .map((c) => (connus.has(c.codePointAt(0)!) ? c : "?"))
      .join("");
  }

  largeur(texte: string, taille: number, gras = false) {
    return (gras ? this.gras : this.regulier).widthOfTextAtSize(this.sain(texte, gras), taille);
  }

  /** Écrit une ligne de texte. `y` est la ligne de base, mesurée depuis le BAS de la page. */
  texte(
    page: PDFPage,
    texte: string,
    x: number,
    y: number,
    o: { taille?: number; gras?: boolean; couleur?: ReturnType<typeof rgb>; align?: Alignement } = {},
  ) {
    const taille = o.taille ?? 10;
    const gras = o.gras ?? false;
    const t = this.sain(texte, gras);
    const l = (gras ? this.gras : this.regulier).widthOfTextAtSize(t, taille);
    const xx = o.align === "droite" ? x - l : o.align === "centre" ? x - l / 2 : x;
    page.drawText(t, { x: xx, y, size: taille, font: gras ? this.gras : this.regulier, color: o.couleur ?? COULEURS.encre });
  }

  /** Coupe un texte en lignes qui tiennent dans la largeur donnée. */
  lignes(texte: string, largeurMax: number, taille: number, gras = false): string[] {
    const mots = this.sain(texte, gras).split(" ").filter(Boolean);
    const lignes: string[] = [];
    let courante = "";
    for (const mot of mots) {
      const essai = courante ? `${courante} ${mot}` : mot;
      if (this.largeur(essai, taille, gras) <= largeurMax || !courante) courante = essai;
      else {
        lignes.push(courante);
        courante = mot;
      }
    }
    if (courante) lignes.push(courante);
    return lignes;
  }

  /** Paragraphe : renvoie la position y sous le dernier texte. */
  paragraphe(
    page: PDFPage,
    texte: string,
    x: number,
    y: number,
    largeurMax: number,
    o: { taille?: number; gras?: boolean; couleur?: ReturnType<typeof rgb>; interligne?: number } = {},
  ) {
    const taille = o.taille ?? 10;
    const interligne = o.interligne ?? taille * 1.35;
    for (const ligne of this.lignes(texte, largeurMax, taille, o.gras)) {
      this.texte(page, ligne, x, y, { taille, gras: o.gras, couleur: o.couleur });
      y -= interligne;
    }
    return y;
  }

  trait(page: PDFPage, x1: number, y: number, x2: number, couleur = COULEURS.ligne, epaisseur = 0.8) {
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: epaisseur, color: couleur });
  }

  rect(page: PDFPage, x: number, y: number, l: number, h: number, couleur: ReturnType<typeof rgb>, o: { rayon?: number } = {}) {
    if (o.rayon) {
      // pdf-lib n'arrondit pas les rectangles : on les trace avec un chemin
      const r = Math.min(o.rayon, l / 2, h / 2);
      const p = `M ${r} 0 L ${l - r} 0 Q ${l} 0 ${l} ${r} L ${l} ${h - r} Q ${l} ${h} ${l - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
      page.drawSvgPath(p, { x, y: y + h, color: couleur, borderWidth: 0 });
    } else {
      page.drawRectangle({ x, y, width: l, height: h, color: couleur });
    }
  }

  /** Dessine le logo ; (x, yHaut) est son coin supérieur gauche. */
  logo(page: PDFPage, x: number, yHaut: number, largeur: number, couleur: ReturnType<typeof rgb>) {
    const echelle = largeur / LOGO.largeur;
    for (const forme of LOGO.formes) {
      const chemin =
        forme.map(([px, py], i) => `${i === 0 ? "M" : "L"} ${px - LOGO.origine[0]} ${py - LOGO.origine[1]}`).join(" ") + " Z";
      page.drawSvgPath(chemin, { x, y: yHaut, scale: echelle, color: couleur, borderWidth: 0 });
    }
    return (LOGO.hauteur * largeur) / LOGO.largeur;
  }

  /** Bandeau aubergine en haut de page avec le logo, le titre du document et son numéro. */
  bandeau(page: PDFPage, titre: string, sousTitre: string, hauteur = 104) {
    const haut = A4.hauteur;
    this.rect(page, 0, haut - hauteur, A4.largeur, hauteur, COULEURS.aubergine);
    this.logo(page, MARGE, haut - 28, 44, COULEURS.creme);
    this.texte(page, "Perfect Stay", MARGE + 58, haut - 50, { taille: 17, gras: true, couleur: COULEURS.blanc });
    this.texte(page, "CONCIERGERIE", MARGE + 58, haut - 64, { taille: 7.5, couleur: COULEURS.grisClair });
    this.texte(page, titre, A4.largeur - MARGE, haut - 48, { taille: 21, gras: true, couleur: COULEURS.blanc, align: "droite" });
    this.texte(page, sousTitre, A4.largeur - MARGE, haut - 66, { taille: 10.5, couleur: COULEURS.creme, align: "droite" });
    return haut - hauteur;
  }

  /** Pied de page : mentions légales et numéro de page, sur toutes les pages. */
  piedsDePage(mentions: string) {
    const pages = this.pdf.getPages();
    pages.forEach((page, i) => {
      this.trait(page, MARGE, 46, A4.largeur - MARGE);
      const lignes = this.lignes(mentions, LARGEUR_UTILE - 50, 7);
      lignes.slice(0, 2).forEach((l, k) => this.texte(page, l, MARGE, 34 - k * 9, { taille: 7, couleur: COULEURS.gris }));
      this.texte(page, `Page ${i + 1} / ${pages.length}`, A4.largeur - MARGE, 34, { taille: 7.5, couleur: COULEURS.gris, align: "droite" });
    });
  }

  async octets() {
    return this.pdf.save();
  }
}
