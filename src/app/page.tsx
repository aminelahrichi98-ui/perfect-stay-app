import { redirect } from "next/navigation";
import { getUtilisateur, modulesVisibles } from "@/lib/auth";
import { MODULE_BY_KEY } from "@/lib/modules";

/** Porte d'entrée : envoie chacun vers son espace. */
export default async function Accueil() {
  const u = await getUtilisateur();
  if (!u || !u.actif) redirect("/connexion");
  if (u.type === "proprietaire") redirect("/espace-proprietaire");
  const premier = modulesVisibles(u).find((k) => !MODULE_BY_KEY[k].masque);
  redirect(premier ? MODULE_BY_KEY[premier].href : "/acces-refuse");
}
