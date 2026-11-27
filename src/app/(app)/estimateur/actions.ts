"use server";

import { droitEstimateur } from "@/lib/estimation/acces";
import { BUCKET_ESTIMATIONS } from "@/lib/estimateur";
import { nomSur, urlEnvoiSigne } from "@/lib/stockage";

const TAILLE_MAX_PHOTO = 8 * 1024 * 1024;
const MAX_PHOTOS = 8;

export type EnvoiPhoto = { chemin: string; token: string };

/** Autorisations d'envoi direct vers le stockage privé, une par photo (déjà allégée par le navigateur). */
export async function preparerPhotos(fichiers: { nom: string; taille: number }[]): Promise<{ erreur?: string; envois?: EnvoiPhoto[] }> {
  if (!(await droitEstimateur("modifier"))) return { erreur: "Vous n'avez pas le droit de créer des estimations." };
  if (!fichiers.length || fichiers.length > MAX_PHOTOS) return { erreur: "Nombre de photos invalide." };
  if (fichiers.some((f) => !(f.taille > 0) || f.taille > TAILLE_MAX_PHOTO)) return { erreur: "Une photo est trop lourde (8 Mo maximum)." };
  try {
    const envois = await Promise.all(fichiers.map((f) => urlEnvoiSigne(BUCKET_ESTIMATIONS, `photos/${crypto.randomUUID()}-${nomSur(f.nom)}`)));
    return { envois };
  } catch {
    return { erreur: "L'envoi des photos n'a pas pu être préparé. Réessayez." };
  }
}
