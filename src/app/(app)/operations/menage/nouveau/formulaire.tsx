"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { creerMenage } from "../actions";

export function FormulaireMenage({
  logements,
  responsables,
  aujourdhui,
}: {
  logements: { id: string; nom: string }[];
  responsables: { id: string; nom: string; prestataire: boolean }[];
  aujourdhui: string;
}) {
  const [etat, action] = useActionState(creerMenage, undefined);
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
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
        <Field label="Date du ménage" htmlFor="date">
          <Input id="date" name="date" type="date" defaultValue={aujourdhui} required className="num" />
        </Field>
        <Field label="Responsable" htmlFor="responsable" hint="Un prestataire voit uniquement les ménages qui lui sont attribués." className="sm:col-span-2">
          <Select id="responsable" name="responsable" defaultValue="">
            <option value="">Non attribué</option>
            {responsables.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nom}
                {r.prestataire ? " (prestataire)" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Consigne (facultatif)" htmlFor="notes" className="sm:col-span-2">
          <Textarea id="notes" name="notes" rows={2} placeholder="Ex. voyageur arrivé en avance, linge supplémentaire…" />
        </Field>
      </div>
      {etat?.erreur ? <Notice ton="danger">{etat.erreur}</Notice> : null}
      <div className="flex justify-end">
        <SubmitButton className="w-full sm:w-auto">Créer le ménage</SubmitButton>
      </div>
    </form>
  );
}
