import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";

export const BUCKET_PHOTOS = "logements-photos";
export const BUCKET_DOCUMENTS = "documents";

/** Nom de fichier sans accents ni caractères risqués, pour le stockage. */
export function nomSur(nom: string) {
  const sain = nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80);
  return sain || "fichier";
}

export function nouveauChemin(logementId: string, nom: string) {
  return `${logementId}/${randomUUID()}-${nomSur(nom)}`;
}

/** Le chemin appartient bien au logement (empêche d'enregistrer le fichier d'un autre logement). */
export function cheminDuLogement(chemin: string, logementId: string) {
  return chemin.startsWith(`${logementId}/`) && !chemin.includes("..");
}

export async function urlEnvoiSigne(bucket: string, chemin: string) {
  const { data, error } = await createAdminClient().storage.from(bucket).createSignedUploadUrl(chemin);
  if (error || !data) throw new Error("Impossible de préparer l'envoi du fichier.");
  return { token: data.token, chemin: data.path };
}

/** Adresses temporaires (1 h) pour afficher des fichiers privés. */
export async function urlsLecture(bucket: string, chemins: string[], secondes = 3600) {
  const resultat = new Map<string, string>();
  if (!chemins.length) return resultat;
  const { data } = await createAdminClient().storage.from(bucket).createSignedUrls(chemins, secondes);
  for (const d of data ?? []) if (d.path && d.signedUrl) resultat.set(d.path, d.signedUrl);
  return resultat;
}

export async function telecharger(bucket: string, chemin: string): Promise<Buffer> {
  const { data, error } = await createAdminClient().storage.from(bucket).download(chemin);
  if (error || !data) throw new Error("Fichier introuvable dans le stockage.");
  return Buffer.from(await data.arrayBuffer());
}

export async function deposer(bucket: string, chemin: string, contenu: Buffer, type: string) {
  const { error } = await createAdminClient().storage.from(bucket).upload(chemin, contenu, { contentType: type, upsert: true });
  if (error) throw new Error("Le fichier n'a pas pu être enregistré.");
}

export async function supprimer(bucket: string, chemins: string[]) {
  const liste = chemins.filter(Boolean);
  if (liste.length) await createAdminClient().storage.from(bucket).remove(liste);
}

/** Une photo envoyée par le téléphone : on garde une version allégée (1600 px) et une vignette (480 px). */
export async function fabriquerPhoto(contenu: Buffer, logementId: string) {
  const principale = await sharp(contenu).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  const vignette = await sharp(contenu).rotate().resize({ width: 480, height: 480, fit: "cover" }).jpeg({ quality: 76 }).toBuffer();
  const base = `${logementId}/${randomUUID()}`;
  const chemin = `${base}.jpg`;
  const cheminVignette = `${base}-vignette.jpg`;
  await deposer(BUCKET_PHOTOS, chemin, principale, "image/jpeg");
  await deposer(BUCKET_PHOTOS, cheminVignette, vignette, "image/jpeg");
  return { chemin, cheminVignette };
}
