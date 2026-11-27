import "server-only";
import { getUtilisateur, peutModifier, peutVoir } from "@/lib/auth";

/** Membre de l'équipe actif avec le droit demandé sur l'Estimateur, ou null. Contrôle refait côté base par la RLS. */
export async function droitEstimateur(niveau: "voir" | "modifier" = "modifier") {
  const u = await getUtilisateur();
  if (!u || !u.actif || u.type !== "equipe") return null;
  return (niveau === "modifier" ? peutModifier(u, "estimateur") : peutVoir(u, "estimateur")) ? u : null;
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
