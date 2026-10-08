"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Field, Notice, Select } from "@/components/ui";
import { lancerChecklist } from "./actions";

export function FormulaireLancer({ modeles, logements }: { modeles: { id: string; nom: string }[]; logements: { id: string; nom: string }[] }) {
  const [etat, action] = useActionState(lancerChecklist, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Modèle" htmlFor="modele">
          <Select id="modele" name="modele" defaultValue="" required>
            <option value="" disabled>
              Choisir…
            </option>
            {modeles.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Logement" htmlFor="logement">
          <Select id="logement" name="logement" defaultValue="" required>
            <option value="" disabled>
              Choisir…
            </option>
            {logements.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nom}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {etat?.erreur ? <Notice ton="danger">{etat.erreur}</Notice> : null}
      <SubmitButton className="w-full sm:w-auto">Lancer la check-list</SubmitButton>
    </form>
  );
}
