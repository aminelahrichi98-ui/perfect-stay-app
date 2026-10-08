import "server-only";
import { getUtilisateur, peutModifier, type Utilisateur } from "@/lib/auth";
import type { ModuleKey } from "@/lib/modules";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const JOUR = /^\d{4}-\d{2}-\d{2}$/;
export const jourValide = (j: string) => JOUR.test(j) && !Number.isNaN(Date.parse(`${j}T00:00:00Z`));
export const texte = (f: FormData, n: string) => String(f.get(n) ?? "").trim();
export const nombre = (v: FormDataEntryValue | null | string) => {
  const n = Number(String(v ?? "").trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

export type Etat = { erreur?: string; succes?: string } | undefined;

/** Utilisateur de l'équipe (pas propriétaire) actif. Un prestataire est accepté, ses actions sont ensuite limitées par la base. */
export async function utilisateurActif(): Promise<Utilisateur | null> {
  const u = await getUtilisateur();
  if (!u || !u.actif || u.type === "proprietaire") return null;
  return u;
}

/** Équipe ayant le droit « Modifier » sur un module (un prestataire n'en bénéficie jamais ici). */
export async function gestionnaire(module: ModuleKey): Promise<Utilisateur | null> {
  const u = await utilisateurActif();
  if (!u || u.type === "prestataire" || !peutModifier(u, module)) return null;
  return u;
}
