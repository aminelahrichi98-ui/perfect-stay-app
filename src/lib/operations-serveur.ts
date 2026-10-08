import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { tamponnerImage } from "@/lib/horodatage";
import { deposer, urlsLecture } from "@/lib/stockage";

export const BUCKET_OPERATIONS = "operations";

/** Photo prise sur le terrain : la date et l'heure sont gravées dans l'image, puis on garde une version allégée et une vignette. */
export async function fabriquerPhotoTamponnee(contenu: Buffer, dossier: string, date: Date) {
  const tamponnee = await tamponnerImage(contenu, date);
  const principale = await sharp(tamponnee).resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  const vignette = await sharp(tamponnee).resize({ width: 480, height: 480, fit: "cover" }).jpeg({ quality: 76 }).toBuffer();
  const base = `${dossier}/${randomUUID()}`;
  const chemin = `${base}.jpg`;
  const cheminVignette = `${base}-vignette.jpg`;
  await deposer(BUCKET_OPERATIONS, chemin, principale, "image/jpeg");
  await deposer(BUCKET_OPERATIONS, cheminVignette, vignette, "image/jpeg");
  return { chemin, cheminVignette };
}

/** Adresses temporaires pour afficher des fichiers : à n'appeler que sur des chemins lus avec les droits de l'utilisateur (jamais reçus du navigateur). */
export const urlsOperations = (chemins: string[]) => urlsLecture(BUCKET_OPERATIONS, chemins);
