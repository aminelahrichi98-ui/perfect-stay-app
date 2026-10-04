"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass, Spinner } from "@/components/ui";

/** Bouton d'envoi de formulaire : se bloque et affiche une roue pendant l'enregistrement. */
export function SubmitButton({
  children,
  variante = "primary",
  taille = "md",
  className,
  ...props
}: Omit<ComponentProps<"button">, "type"> & { variante?: "primary" | "secondary" | "danger" | "ghost"; taille?: "md" | "sm" }) {
  const { pending } = useFormStatus();
  return (
    <button {...props} type="submit" disabled={pending || props.disabled} aria-busy={pending} className={buttonClass(variante, taille, className)}>
      {pending ? <Spinner /> : null}
      {children}
    </button>
  );
}
