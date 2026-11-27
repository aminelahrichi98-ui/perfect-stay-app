import "server-only";
import sharp from "sharp";
import type { TypeImage } from "./ia/fournisseur";

export const TYPES_CAPTURE: readonly TypeImage[] = ["image/png", "image/jpeg", "image/webp"];
export const TAILLE_MAX_CAPTURE = 15 * 1024 * 1024;
export const MAX_CAPTURES = 10;
const COTE_MAX = 2000; // assez pour lire les petits chiffres, sans alourdir inutilement la requête
const POIDS_MAX_IA = 4.5 * 1024 * 1024;

const FORMATS: Record<string, TypeImage> = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };

/** Le fichier est-il réellement une image fixe PNG, JPEG ou WEBP (contenu vérifié, pas seulement l'extension) ? */
export async function verifierCapture(contenu: Buffer): Promise<{ type: TypeImage; largeur: number; hauteur: number } | { erreur: string }> {
  if (!contenu.length || contenu.length > TAILLE_MAX_CAPTURE) return { erreur: "Fichier vide ou trop lourd (15 Mo au maximum)." };
  try {
    const m = await sharp(contenu, { limitInputPixels: 80_000_000 }).metadata();
    const type = m.format ? FORMATS[m.format] : undefined;
    if (!type) return { erreur: "Format non accepté : PNG, JPEG ou WEBP uniquement." };
    if ((m.pages ?? 1) > 1) return { erreur: "Les images animées ne sont pas acceptées." };
    if (!m.width || !m.height) return { erreur: "Image illisible." };
    return { type, largeur: m.width, hauteur: m.height };
  } catch {
    return { erreur: "Image illisible ou corrompue." };
  }
}

/** Version envoyée au service d'IA : redimensionnée si besoin, métadonnées retirées. */
export async function preparerPourIA(contenu: Buffer): Promise<{ type: TypeImage; donnees: Buffer }> {
  const base = sharp(contenu, { limitInputPixels: 80_000_000 }).rotate().resize({ width: COTE_MAX, height: COTE_MAX, fit: "inside", withoutEnlargement: true });
  const png = await base.clone().png({ compressionLevel: 9 }).toBuffer();
  if (png.length <= POIDS_MAX_IA) return { type: "image/png", donnees: png };
  return { type: "image/jpeg", donnees: await base.clone().jpeg({ quality: 90 }).toBuffer() };
}
