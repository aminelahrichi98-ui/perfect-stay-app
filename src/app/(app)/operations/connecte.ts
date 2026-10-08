import "server-only";
import { redirect } from "next/navigation";
import { getUtilisateur } from "@/lib/auth";

export async function exigerConnecte() {
  const u = await getUtilisateur();
  if (!u || !u.actif) redirect("/connexion");
  if (u.type === "proprietaire") redirect("/espace-proprietaire");
  return u;
}
