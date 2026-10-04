import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MODULE_KEYS, type Droits, type ModuleKey, type TypeUtilisateur } from "@/lib/modules";

export type Utilisateur = {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  type: TypeUtilisateur;
  poles: string[];
  admin: boolean;
  actif: boolean;
  droits: Droits;
};

/** Utilisateur connecté avec son profil et ses droits, ou null. Mis en cache le temps d'une requête. */
export const getUtilisateur = cache(async (): Promise<Utilisateur | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const [{ data: profil }, { data: permissions }] = await Promise.all([
    supabase.from("profiles").select("id, email, prenom, nom, type, poles, is_admin, actif").eq("id", userId).maybeSingle(),
    supabase.from("permissions").select("module, can_view, can_edit").eq("user_id", userId),
  ]);
  if (!profil) return null;

  const droits: Droits = {};
  for (const p of permissions ?? []) {
    if ((MODULE_KEYS as string[]).includes(p.module)) {
      droits[p.module as ModuleKey] = { voir: p.can_view, modifier: p.can_edit };
    }
  }
  return {
    id: profil.id,
    email: profil.email,
    prenom: profil.prenom,
    nom: profil.nom,
    type: profil.type,
    poles: profil.poles ?? [],
    admin: profil.is_admin,
    actif: profil.actif,
    droits,
  };
});

export function peutVoir(u: Utilisateur, module: ModuleKey) {
  return u.admin || Boolean(u.droits[module]?.voir);
}

export function peutModifier(u: Utilisateur, module: ModuleKey) {
  return u.admin || Boolean(u.droits[module]?.modifier);
}

/** Modules visibles pour cet utilisateur (sert à construire le menu). */
export function modulesVisibles(u: Utilisateur): ModuleKey[] {
  return MODULE_KEYS.filter((m) => peutVoir(u, m));
}

/** À appeler en tête de chaque page interne : renvoie vers la connexion ou l'écran « accès refusé » si besoin. */
export async function exigerAcces(module: ModuleKey, niveau: "voir" | "modifier" = "voir") {
  const u = await getUtilisateur();
  if (!u || !u.actif) redirect("/connexion");
  if (u.type === "proprietaire") redirect("/espace-proprietaire");
  const autorise = niveau === "modifier" ? peutModifier(u, module) : peutVoir(u, module);
  if (!autorise) redirect("/acces-refuse");
  return u;
}
