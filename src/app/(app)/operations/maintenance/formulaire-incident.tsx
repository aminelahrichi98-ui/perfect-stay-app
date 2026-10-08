"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { TYPES_INCIDENT } from "@/lib/operations";
import { creerIncident, modifierIncident } from "./actions";

export type ValeursIncident = {
  logement: string;
  type: string;
  titre: string;
  description: string;
  date: string;
  intervenant: string;
  responsable: string;
};

export function FormulaireIncident({
  id,
  valeurs,
  logements,
  responsables,
}: {
  id?: string;
  valeurs: ValeursIncident;
  logements: { id: string; nom: string }[];
  responsables: { id: string; nom: string }[];
}) {
  const [etat, action] = useActionState(id ? modifierIncident.bind(null, id) : creerIncident, undefined);
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Logement" htmlFor="logement">
          <Select id="logement" name="logement" defaultValue={valeurs.logement} required>
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
        <Field label="Type" htmlFor="type">
          <Select id="type" name="type" defaultValue={valeurs.type}>
            {TYPES_INCIDENT.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Titre" htmlFor="titre" className="sm:col-span-2">
          <Input id="titre" name="titre" defaultValue={valeurs.titre} maxLength={160} placeholder="Ex. Chauffe-eau en panne" autoComplete="off" required />
        </Field>
        <Field label="Description" htmlFor="description" className="sm:col-span-2">
          <Textarea id="description" name="description" defaultValue={valeurs.description} rows={3} placeholder="Ce qui s'est passé, ce qui est à réparer…" />
        </Field>
        <Field label="Date de l'incident" htmlFor="date">
          <Input id="date" name="date" type="date" defaultValue={valeurs.date} required className="num" />
        </Field>
        <Field label="Prestataire / intervenant" htmlFor="intervenant" hint="Plombier, électricien… (facultatif)">
          <Input id="intervenant" name="intervenant" defaultValue={valeurs.intervenant} autoComplete="off" />
        </Field>
        <Field label="Responsable du suivi" htmlFor="responsable" className="sm:col-span-2">
          <Select id="responsable" name="responsable" defaultValue={valeurs.responsable}>
            <option value="">Non attribué</option>
            {responsables.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nom}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {etat?.erreur ? <Notice ton="danger">{etat.erreur}</Notice> : null}
      {etat?.succes ? <Notice ton="ok">{etat.succes}</Notice> : null}
      <div className="flex justify-end">
        <SubmitButton className="w-full sm:w-auto">{id ? "Enregistrer les modifications" : "Déclarer l'incident"}</SubmitButton>
      </div>
    </form>
  );
}
