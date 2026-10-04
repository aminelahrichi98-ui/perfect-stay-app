"use client";

import { useActionState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { Field, Notice } from "@/components/ui";
import { definirMotDePasse } from "../connexion/actions";

export default function PageMotDePasse() {
  const [etat, action] = useActionState(definirMotDePasse, undefined);
  return (
    <AuthShell titre="Choisissez votre mot de passe" description="Il vous servira à vous connecter. Au moins 10 caractères.">
      <form action={action} className="space-y-5">
        <Field label="Nouveau mot de passe" htmlFor="motDePasse">
          <PasswordInput id="motDePasse" name="motDePasse" autoComplete="new-password" minLength={10} required />
        </Field>
        <Field label="Confirmez le mot de passe" htmlFor="confirmation">
          <PasswordInput id="confirmation" name="confirmation" autoComplete="new-password" minLength={10} required />
        </Field>
        {etat?.erreur ? <Notice ton="danger">{etat.erreur}</Notice> : null}
        <SubmitButton className="w-full">Enregistrer et continuer</SubmitButton>
      </form>
    </AuthShell>
  );
}
