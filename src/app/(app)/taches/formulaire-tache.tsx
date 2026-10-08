"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { POLES } from "@/lib/modules";
import { PRIORITES, STATUTS_TACHE } from "@/lib/taches";
import { creerTache, modifierTache } from "./actions";

export type ValeursTache = { titre: string; pole: string; priorite: string; statut: string; echeance: string; responsable: string; logement: string; notes: string };

export function FormulaireTache({
  id,
  valeurs,
  logements,
  responsables,
}: {
  id?: string;
  valeurs: ValeursTache;
  logements: { id: string; nom: string }[];
  responsables: { id: string; nom: string; prestataire: boolean }[];
}) {
  const [etat, action] = useActionState(id ? modifierTache.bind(null, id) : creerTache, undefined);
  return (
    <form action={action} className="space-y-5">
      <Field label="Titre" htmlFor="titre">
        <Input id="titre" name="titre" defaultValue={valeurs.titre} maxLength={200} autoComplete="off" required autoFocus={!id} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Pôle" htmlFor="pole">
          <Select id="pole" name="pole" defaultValue={valeurs.pole}>
            {POLES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priorité" htmlFor="priorite">
          <Select id="priorite" name="priorite" defaultValue={valeurs.priorite}>
            {PRIORITES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Statut" htmlFor="statut">
          <Select id="statut" name="statut" defaultValue={valeurs.statut}>
            {STATUTS_TACHE.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Échéance" htmlFor="echeance" hint="Laissez vide si la tâche n'a pas de date.">
          <Input id="echeance" name="echeance" type="date" defaultValue={valeurs.echeance} className="num" />
        </Field>
        <Field label="Responsable" htmlFor="responsable">
          <Select id="responsable" name="responsable" defaultValue={valeurs.responsable}>
            <option value="">Non attribuée</option>
            {responsables.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nom}
                {r.prestataire ? " (prestataire)" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Logement concerné" htmlFor="logement">
          <Select id="logement" name="logement" defaultValue={valeurs.logement}>
            <option value="">Aucun</option>
            {logements.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nom}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Notes" htmlFor="notes">
        <Textarea id="notes" name="notes" defaultValue={valeurs.notes} rows={4} />
      </Field>
      {etat?.erreur ? <Notice ton="danger">{etat.erreur}</Notice> : null}
      {etat?.succes ? <Notice ton="ok">{etat.succes}</Notice> : null}
      <div className="flex justify-end">
        <SubmitButton className="w-full sm:w-auto">{id ? "Enregistrer" : "Créer la tâche"}</SubmitButton>
      </div>
    </form>
  );
}
