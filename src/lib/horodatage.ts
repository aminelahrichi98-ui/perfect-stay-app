import sharp from "sharp";

const FUSEAU = "Africa/Casablanca";

/** « 05/10/2026 14:32 » à l'heure du Maroc */
export function texteHorodatage(date: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: FUSEAU,
    })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/*
  Les chiffres sont dessinés à la main en « sept segments » (comme l'horodatage d'un vieil appareil photo).
  Pas de police de caractères : le rendu est identique partout, y compris sur le serveur Vercel.
*/
const SEGMENTS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abdeg",
  "3": "abcdg",
  "4": "bcfg",
  "5": "acdfg",
  "6": "acdefg",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
};

/** Dessine le texte en rectangles SVG ; renvoie le dessin et sa largeur. */
function dessinerTexte(texte: string, h: number, couleur: string) {
  const e = h * 0.14; // épaisseur d'un segment
  const l = h * 0.56; // largeur d'un chiffre
  const pas = l + h * 0.28;
  let x = 0;
  let svg = "";
  const rect = (rx: number, ry: number, w: number, hh: number) =>
    `<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${w.toFixed(1)}" height="${hh.toFixed(1)}" rx="${(e * 0.3).toFixed(1)}" fill="${couleur}"/>`;

  for (const c of texte) {
    if (c in SEGMENTS) {
      const s = SEGMENTS[c];
      const m = h / 2;
      if (s.includes("a")) svg += rect(x + e, 0, l - 2 * e, e);
      if (s.includes("g")) svg += rect(x + e, m - e / 2, l - 2 * e, e);
      if (s.includes("d")) svg += rect(x + e, h - e, l - 2 * e, e);
      if (s.includes("f")) svg += rect(x, e, e, m - e * 1.5);
      if (s.includes("b")) svg += rect(x + l - e, e, e, m - e * 1.5);
      if (s.includes("e")) svg += rect(x, m + e / 2, e, m - e * 1.5);
      if (s.includes("c")) svg += rect(x + l - e, m + e / 2, e, m - e * 1.5);
      x += pas;
    } else if (c === ":") {
      svg += rect(x + e * 0.2, h * 0.3, e, e) + rect(x + e * 0.2, h * 0.62, e, e);
      x += e * 1.4 + h * 0.2;
    } else if (c === "/") {
      svg += `<polygon points="${(x + l * 0.7).toFixed(1)},0 ${(x + l * 0.7 + e).toFixed(1)},0 ${(x + l * 0.15 + e).toFixed(1)},${h} ${(x + l * 0.15).toFixed(1)},${h}" fill="${couleur}"/>`;
      x += l * 1.1;
    } else {
      x += h * 0.35; // espace
    }
  }
  return { svg, largeur: x - h * 0.2 };
}

/**
 * Grave la date et l'heure d'envoi dans l'image elle-même (en bas à droite).
 * Le fichier d'origine est ensuite remplacé : la preuve ne peut plus être séparée de l'image.
 */
export async function tamponnerImage(entree: Buffer, date: Date): Promise<Buffer> {
  const image = sharp(entree).rotate(); // applique l'orientation de la photo (téléphone)
  const { width = 1200, height = 900 } = await image.metadata();
  const base = image.clone();
  const sortie = await base.toBuffer({ resolveWithObject: true });
  const w = sortie.info.width ?? width;
  const h = sortie.info.height ?? height;

  const hauteurTexte = Math.max(18, Math.round(Math.min(w, h) * 0.035));
  const { svg, largeur } = dessinerTexte(texteHorodatage(date), hauteurTexte, "#ffb020");
  const marge = Math.round(hauteurTexte * 0.7);
  const bandeauL = Math.ceil(largeur + marge * 2);
  const bandeauH = hauteurTexte + marge * 2;

  const calque = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${bandeauL}" height="${bandeauH}">` +
      `<rect width="${bandeauL}" height="${bandeauH}" rx="${marge * 0.5}" fill="#000" fill-opacity="0.62"/>` +
      `<g transform="translate(${marge},${marge})">${svg}</g></svg>`,
  );

  const decalage = Math.round(hauteurTexte * 0.8);
  return sharp(sortie.data)
    .composite([{ input: calque, left: Math.max(0, w - bandeauL - decalage), top: Math.max(0, h - bandeauH - decalage) }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
