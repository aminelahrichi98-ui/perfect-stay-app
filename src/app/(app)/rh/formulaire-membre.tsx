"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass, Field, Input, Notice, Select, Spinner, Textarea } from "@/components/ui";
import { CATEGORIES_MEMBRE, TYPES_CONTRAT } from "@/lib/rh";
import { enregistrerMembre } from "./actions";

export type ValeursMembre = { nom: string; role: string; categorie: string; contrat: string; telephone: string; email: string; arrivee: string; depart: string; notes: string };

export function FormulaireMembre({ id, valeurs, surSucces }: { id?: string; valeurs: ValeursMembre; surSucces?: () => void }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState("");
  const [ok, setOk] = useState(false);
  function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "");
    setErreur("");
    setOk(false);
    demarrer(async () => {
      const r = await enregistrerMembre({ id, nom: v("nom"), role: v("role"), categorie: v("categorie"), contrat: v("contrat"), telephone: v("telephone"), email: v("email"), arrivee: v("arrivee"), depart: v("depart"), notes: v("notes") });
      if (r?.erreur) setErreur(r.erreur);
      else if (!id && r?.id) router.push(`/rh/${r.id}`);
      else {
        setOk(true);
        surSucces?.();
        router.refresh();
      }
    });
  }
  return (
    <form onSubmit={soumettre} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nom" htmlFor="nom" className="sm:col-span-2">
          <Input id="nom" name="nom" defaultValue={valeurs.nom} maxLength={160} autoComplete="off" required />
        </Field>
        <Field label="Rôle" htmlFor="role">
          <Input id="role" name="role" defaultValue={valeurs.role} placeholder="Ex. Responsable des opérations" autoComplete="off" />
        </Field>
        <Field label="Catégorie" htmlFor="categorie">
          <Select id="categorie" name="categorie" defaultValue={valeurs.categorie}>
            {CATEGORIES_MEMBRE.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Type de contrat" htmlFor="contrat">
          <Select id="contrat" name="contrat" defaultValue={valeurs.contrat}>
            {TYPES_CONTRAT.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Téléphone" htmlFor="telephone">
          <Input id="telephone" name="telephone" type="tel" defaultValue={valeurs.telephone} autoComplete="off" className="num" />
        </Field>
        <Field label="E-mail" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={valeurs.email} autoComplete="off" />
        </Field>
        <Field label="Date d'arrivée" htmlFor="arrivee">
          <Input id="arrivee" name="arrivee" type="date" defaultValue={valeurs.arrivee} className="num" />
        </Field>
        <Field label="Date de départ" htmlFor="depart" hint="Laissez vide si la personne est toujours là.">
          <Input id="depart" name="depart" type="date" defaultValue={valeurs.depart} className="num" />
        </Field>
        <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
          <Textarea id="notes" name="notes" defaultValue={valeurs.notes} rows={3} />
        </Field>
      </div>
      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
      {ok ? <Notice ton="ok">Fiche enregistrée.</Notice> : null}
      <div className="flex justify-end">
        <button type="submit" disabled={enCours} aria-busy={enCours} className={buttonClass("primary", "md", "w-full sm:w-auto")}>
          {enCours ? <Spinner /> : null} {id ? "Enregistrer" : "Créer la fiche"}
        </button>
      </div>
    </form>
  );
}
