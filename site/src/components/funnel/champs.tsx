"use client";

import { Check } from "lucide-react";
import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Erreur({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-2 text-[0.84rem] text-alerte">
      {message}
    </p>
  );
}

export function Champ({ label, erreur, aide, ...props }: { label: string; erreur?: string; aide?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-[0.86rem] font-medium text-papier/80">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(erreur)}
        aria-describedby={erreur ? `${id}-e` : aide ? `${id}-a` : undefined}
        className={cn(
          "mt-2 h-13 w-full rounded-xl border bg-charbon/60 px-4 text-[1rem] text-papier placeholder:text-papier/30 transition-colors outline-none focus:border-or",
          erreur ? "border-alerte/70" : "border-papier/12",
        )}
        {...props}
      />
      {aide && !erreur ? (
        <p id={`${id}-a`} className="mt-1.5 text-[0.78rem] text-papier/45">
          {aide}
        </p>
      ) : null}
      <Erreur id={`${id}-e`} message={erreur} />
    </div>
  );
}

/** Choix unique sous forme de grandes options tactiles */
export function Choix<T extends string>({ label, options, valeur, onChange, erreur, colonnes = 2 }: { label: string; options: readonly T[]; valeur: string; onChange: (v: T) => void; erreur?: string; colonnes?: 2 | 3 }) {
  const id = useId();
  return (
    <fieldset aria-describedby={erreur ? `${id}-e` : undefined}>
      <legend className="text-[0.86rem] font-medium text-papier/80">{label}</legend>
      <div role="radiogroup" className={cn("mt-2.5 grid gap-2", colonnes === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={valeur === o}
            onClick={() => onChange(o)}
            className={cn(
              "flex min-h-13 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-[0.94rem] transition-colors",
              valeur === o ? "border-or bg-or/10 text-papier" : "border-papier/12 text-papier/75 hover:border-papier/30",
            )}
          >
            {o}
            {valeur === o ? <Check className="h-4 w-4 shrink-0 text-or" /> : null}
          </button>
        ))}
      </div>
      <Erreur id={`${id}-e`} message={erreur} />
    </fieldset>
  );
}

export function ChoixMultiple<T extends string>({ label, options, valeurs, onChange, erreur, aide }: { label: string; options: readonly T[]; valeurs: string[]; onChange: (v: T[]) => void; erreur?: string; aide?: ReactNode }) {
  const id = useId();
  return (
    <fieldset aria-describedby={erreur ? `${id}-e` : undefined}>
      <legend className="text-[0.86rem] font-medium text-papier/80">{label}</legend>
      {aide ? <p className="mt-1 text-[0.78rem] text-papier/45">{aide}</p> : null}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((o) => {
          const coche = valeurs.includes(o);
          return (
            <button
              key={o}
              type="button"
              role="checkbox"
              aria-checked={coche}
              onClick={() => onChange((coche ? valeurs.filter((v) => v !== o) : [...valeurs, o]) as T[])}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[0.88rem] transition-colors",
                coche ? "border-or bg-or/10 text-papier" : "border-papier/12 text-papier/70 hover:border-papier/30",
              )}
            >
              {coche ? <Check className="h-3.5 w-3.5 text-or" /> : null}
              {o}
            </button>
          );
        })}
      </div>
      <Erreur id={`${id}-e`} message={erreur} />
    </fieldset>
  );
}
