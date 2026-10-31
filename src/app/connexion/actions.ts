"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lienRetourMotDePasse } from "@/lib/origine";
import { COOKIE_RESTER, DUREE_RESTER } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/server";

export type EtatFormulaire = { erreur?: string; succes?: string } | undefined;

export async function seConnecter(_: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(formData.get("motDePasse") ?? "");
  if (!email || !motDePasse) return { erreur: "Saisissez votre e-mail et votre mot de passe." };

  // La case « Rester connecté » (cochée par défaut) décide de la durée de la session
  const rester = formData.get("rester") === "on";
  (await cookies()).set(COOKIE_RESTER, rester ? "1" : "0", { path: "/", maxAge: DUREE_RESTER, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  const supabase = await createClient({ rester });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
  if (error || !data.user) {
    return { erreur: "E-mail ou mot de passe incorrect. Vérifiez votre saisie ou utilisez « Mot de passe oublié »." };
  }

  const { data: profil } = await supabase.from("profiles").select("actif").eq("id", data.user.id).maybeSingle();
  if (!profil) {
    await supabase.auth.signOut();
    return { erreur: "Ce compte n'est rattaché à aucun profil. Contactez Perfect Stay pour qu'on l'active." };
  }
  if (!profil.actif) {
    await supabase.auth.signOut();
    return { erreur: "Ce compte a été désactivé. Contactez Perfect Stay si c'est une erreur." };
  }
  redirect("/");
}

export async function demanderReinitialisation(_: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { erreur: "Saisissez votre adresse e-mail." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: await lienRetourMotDePasse() });
  // Réponse identique que l'adresse existe ou non, pour ne pas révéler qui a un compte.
  return { succes: "Si un compte existe pour cette adresse, un e-mail vient de partir avec un lien pour choisir un nouveau mot de passe." };
}

export async function definirMotDePasse(_: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (motDePasse.length < 10) return { erreur: "Choisissez un mot de passe d'au moins 10 caractères." };
  if (motDePasse !== confirmation) return { erreur: "Les deux mots de passe ne sont pas identiques." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { erreur: "Le lien a expiré. Demandez un nouveau lien depuis « Mot de passe oublié »." };

  const { error } = await supabase.auth.updateUser({ password: motDePasse });
  if (error) return { erreur: "Impossible d'enregistrer ce mot de passe. Essayez-en un autre, plus long ou moins courant." };
  redirect("/");
}

/** Changer son mot de passe une fois connecté : l'ancien est redemandé, pour qu'un téléphone resté ouvert ne suffise pas. */
export async function changerMotDePasse(_: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const actuel = String(formData.get("actuel") ?? "");
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (!actuel) return { erreur: "Saisissez votre mot de passe actuel." };
  if (motDePasse.length < 10) return { erreur: "Choisissez un nouveau mot de passe d'au moins 10 caractères." };
  if (motDePasse !== confirmation) return { erreur: "Les deux nouveaux mots de passe ne sont pas identiques." };
  if (motDePasse === actuel) return { erreur: "Le nouveau mot de passe doit être différent de l'actuel." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) return { erreur: "Votre session a expiré. Reconnectez-vous puis réessayez." };

  const { error: mauvais } = await supabase.auth.signInWithPassword({ email, password: actuel });
  if (mauvais) return { erreur: "Le mot de passe actuel est incorrect. Si vous l'avez oublié, utilisez « Mot de passe oublié » depuis la page de connexion." };

  const { error } = await supabase.auth.updateUser({ password: motDePasse });
  if (error) return { erreur: "Impossible d'enregistrer ce mot de passe. Essayez-en un autre, plus long ou moins courant." };
  return { succes: "Votre mot de passe a été changé. Utilisez-le dès votre prochaine connexion." };
}

export async function seDeconnecter() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
