import "server-only";
import { headers } from "next/headers";

/** Adresse du site telle que l'utilisateur la voit (Vercel, domaine perso ou localhost). */
export async function origineDuSite() {
  const h = await headers();
  const hote = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (hote.startsWith("localhost") ? "http" : "https");
  return `${proto}://${hote}`;
}

/** Où le lien de l'e-mail « Mot de passe oublié » ramène : la page pour choisir le nouveau mot de passe. */
export async function lienRetourMotDePasse() {
  return `${await origineDuSite()}/auth/confirm?next=/mot-de-passe`;
}
