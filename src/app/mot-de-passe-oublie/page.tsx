"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Notice } from "@/components/ui";
import { demanderReinitialisation } from "../connexion/actions";

export default function PageMotDePasseOublie() {
  const [etat, action] = useActionState(demanderReinitialisation, undefined);
  return (
    <AuthShell titre="Mot de passe oublié" description="Saisissez votre e-mail : nous vous envoyons un lien pour en choisir un nouveau.">
      <form action={action} className="space-y-5">
        <Field label="Adresse e-mail" htmlFor="email">
          <Input id="email" name="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" required />
        </Field>
        {etat?.erreur ? <Notice ton="danger">{etat.erreur}</Notice> : null}
        {etat?.succes ? <Notice ton="ok">{etat.succes}</Notice> : null}
        <SubmitButton className="w-full">Envoyer le lien</SubmitButton>
        <p className="text-center text-sm">
          <Link href="/connexion" className="text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-wine-700">
            Retour à la connexion
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
