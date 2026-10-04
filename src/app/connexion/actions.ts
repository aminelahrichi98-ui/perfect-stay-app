"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EtatFormulaire = { erreur?: string; succes?: string } | undefined;

export async function seConnecter(_: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(formData.get("motDePasse") ?? "");
  if (!email || !motDePasse) return { erreur: "Saisissez votre e-mail et votre mot de passe." };

  const supabase = await createClient();
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
  await supabase.auth.resetPasswordForEmail(email);
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

export async function seDeconnecter() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
