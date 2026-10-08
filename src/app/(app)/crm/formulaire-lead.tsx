"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { SOURCES } from "@/lib/crm";
import { creerLead, modifierLead } from "./actions";

export type ValeursLead = { nom: string; telephone: string; email: string; ville: string; type_bien: string; source: string; campagne: string; responsable: string; notes: string };

export function FormulaireLead({ id, valeurs, responsables }: { id?: string; valeurs: ValeursLead; responsables: { id: string; nom: string }[] }) {
  const [etat, action] = useActionState(id ? modifierLead.bind(null, id) : creerLead, undefined);
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nom" htmlFor="nom" className="sm:col-span-2">
          <Input id="nom" name="nom" defaultValue={valeurs.nom} maxLength={160} autoComplete="off" required autoFocus={!id} />
        </Field>
        <Field label="Téléphone" htmlFor="telephone">
          <Input id="telephone" name="telephone" type="tel" defaultValue={valeurs.telephone} autoComplete="off" className="num" />
        </Field>
        <Field label="E-mail" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={valeurs.email} autoComplete="off" />
        </Field>
        <Field label="Ville" htmlFor="ville">
          <Input id="ville" name="ville" defaultValue={valeurs.ville} autoComplete="off" />
        </Field>
        <Field label="Type de bien" htmlFor="type_bien" hint="Appartement, villa, riad…">
          <Input id="type_bien" name="type_bien" defaultValue={valeurs.type_bien} autoComplete="off" />
        </Field>
        <Field label="Source" htmlFor="source">
          <Select id="source" name="source" defaultValue={valeurs.source}>
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Responsable" htmlFor="responsable">
          <Select id="responsable" name="responsable" defaultValue={valeurs.responsable}>
            <option value="">Non attribué</option>
            {responsables.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nom}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Campagne" htmlFor="campagne" hint="Rempli automatiquement pour les leads Meta." className="sm:col-span-2">
          <Input id="campagne" name="campagne" defaultValue={valeurs.campagne} autoComplete="off" />
        </Field>
        <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
          <Textarea id="notes" name="notes" defaultValue={valeurs.notes} rows={4} />
        </Field>
      </div>
      {etat?.erreur ? <Notice ton="danger">{etat.erreur}</Notice> : null}
      {etat?.succes ? <Notice ton="ok">{etat.succes}</Notice> : null}
      <div className="flex justify-end">
        <SubmitButton className="w-full sm:w-auto">{id ? "Enregistrer" : "Ajouter le lead"}</SubmitButton>
      </div>
    </form>
  );
}
