"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Notice } from "@/components/ui";
import { seConnecter } from "./actions";

export function FormulaireConnexion() {
  const [etat, action] = useActionState(seConnecter, undefined);
  return (
    <form action={action} className="space-y-5">
      <Field label="Adresse e-mail" htmlFor="email">
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required placeholder="prenom@exemple.com" />
      </Field>
      <Field label="Mot de passe" htmlFor="motDePasse">
        <PasswordInput id="motDePasse" name="motDePasse" autoComplete="current-password" required />
      </Field>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[0.95rem] select-none">
        <input type="checkbox" name="rester" defaultChecked className="h-5 w-5 rounded accent-[var(--color-wine-600)]" />
        <span>
          Rester connecté
          <span className="block text-[0.8rem] text-ink-3">Sur votre téléphone ou votre ordinateur personnel uniquement.</span>
        </span>
      </label>
      {etat?.erreur ? <Notice ton="danger">{etat.erreur}</Notice> : null}
      <SubmitButton className="w-full">Se connecter</SubmitButton>
      <p className="text-center text-sm">
        <Link href="/mot-de-passe-oublie" className="text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-wine-700">
          Mot de passe oublié ?
        </Link>
      </p>
    </form>
  );
}
