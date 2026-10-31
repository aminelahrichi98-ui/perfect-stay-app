"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { Field, Notice } from "@/components/ui";
import { changerMotDePasse } from "../connexion/actions";

export function FormulaireMotDePasse({ email, retour }: { email: string; retour: string }) {
  const [etat, action] = useActionState(changerMotDePasse, undefined);
  return (
    <AuthShell titre="Changer mon mot de passe" description={`Compte ${email}. Le nouveau mot de passe doit faire au moins 10 caractères.`}>
      <form action={action} className="space-y-5">
        <input type="email" name="email" value={email} autoComplete="username" readOnly hidden />
        <Field label="Mot de passe actuel" htmlFor="actuel">
          <PasswordInput id="actuel" name="actuel" autoComplete="current-password" required />
        </Field>
        <Field label="Nouveau mot de passe" htmlFor="motDePasse">
          <PasswordInput id="motDePasse" name="motDePasse" autoComplete="new-password" minLength={10} required />
        </Field>
        <Field label="Confirmez le nouveau mot de passe" htmlFor="confirmation">
          <PasswordInput id="confirmation" name="confirmation" autoComplete="new-password" minLength={10} required />
        </Field>
        {etat?.erreur ? <Notice ton="danger">{etat.erreur}</Notice> : null}
        {etat?.succes ? <Notice ton="ok">{etat.succes}</Notice> : null}
        <SubmitButton className="w-full">Changer le mot de passe</SubmitButton>
        <p className="text-center text-sm">
          <Link href={retour} className="text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-wine-700">
            Retour à l&apos;application
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
