"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { enregistrerEntreprise } from "../actions";

export type Entreprise = {
  raison_sociale: string;
  adresse: string;
  ice: string;
  identifiant_fiscal: string;
  registre_commerce: string;
  patente: string;
  banque: string;
  rib: string;
  email: string;
  telephone: string;
  responsable_menage: string | null;
  taux_tva: number;
  mention_reglement: string;
};

export function FormulaireEntreprise({
  valeurs,
  equipe,
  lectureSeule,
}: {
  valeurs: Entreprise;
  equipe: { id: string; nom: string }[];
  lectureSeule: boolean;
}) {
  const [etat, action] = useActionState(enregistrerEntreprise, undefined);
  return (
    <form action={action} className="space-y-8">
      <fieldset disabled={lectureSeule} className="space-y-8">
        <section className="grid gap-5 sm:grid-cols-2">
          <Field label="Raison sociale" htmlFor="raison_sociale" className="sm:col-span-2">
            <Input id="raison_sociale" name="raison_sociale" defaultValue={valeurs.raison_sociale} />
          </Field>
          <Field label="Adresse" htmlFor="adresse" className="sm:col-span-2">
            <Textarea id="adresse" name="adresse" defaultValue={valeurs.adresse} rows={2} />
          </Field>
          <Field label="E-mail de contact" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={valeurs.email} />
          </Field>
          <Field label="Téléphone" htmlFor="telephone">
            <Input id="telephone" name="telephone" type="tel" defaultValue={valeurs.telephone} />
          </Field>
        </section>

        <section className="space-y-4">
          <h3 className="font-display text-base font-semibold">Ménages</h3>
          <Field
            label="Responsable des ménages par défaut"
            htmlFor="responsable_menage"
            hint="Chaque ménage créé automatiquement le jour d'un départ lui est attribué. Vous pouvez le changer ensuite, ménage par ménage."
          >
            <Select id="responsable_menage" name="responsable_menage" defaultValue={valeurs.responsable_menage ?? ""} className="sm:max-w-sm">
              <option value="">Personne (non assigné)</option>
              {equipe.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </Select>
          </Field>
        </section>

        <section className="space-y-4">
          <h3 className="font-display text-base font-semibold">Mentions légales des factures</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="ICE" htmlFor="ice">
              <Input id="ice" name="ice" defaultValue={valeurs.ice} inputMode="numeric" className="num" />
            </Field>
            <Field label="IF (identifiant fiscal)" htmlFor="identifiant_fiscal">
              <Input id="identifiant_fiscal" name="identifiant_fiscal" defaultValue={valeurs.identifiant_fiscal} className="num" />
            </Field>
            <Field label="RC (registre du commerce)" htmlFor="registre_commerce">
              <Input id="registre_commerce" name="registre_commerce" defaultValue={valeurs.registre_commerce} className="num" />
            </Field>
            <Field label="Patente" htmlFor="patente">
              <Input id="patente" name="patente" defaultValue={valeurs.patente} className="num" />
            </Field>
            <Field label="Taux de TVA (%)" htmlFor="taux_tva" hint="Appliqué à la commission : elle est comptée TTC, la TVA est détaillée sur la facture.">
              <Input id="taux_tva" name="taux_tva" defaultValue={String(valeurs.taux_tva).replace(".", ",")} inputMode="decimal" className="num sm:max-w-32" />
            </Field>
            <Field label="Mention de règlement" htmlFor="mention_reglement" hint="Phrase imprimée en bas de chaque facture." className="sm:col-span-2">
              <Textarea id="mention_reglement" name="mention_reglement" defaultValue={valeurs.mention_reglement} rows={2} />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-display text-base font-semibold">Coordonnées bancaires</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Banque" htmlFor="banque">
              <Input id="banque" name="banque" defaultValue={valeurs.banque} />
            </Field>
            <Field label="RIB" htmlFor="rib">
              <Input id="rib" name="rib" defaultValue={valeurs.rib} inputMode="numeric" className="num" />
            </Field>
          </div>
        </section>
      </fieldset>

      {etat?.erreur ? <Notice ton="danger">{etat.erreur}</Notice> : null}
      {etat?.succes ? <Notice ton="ok">{etat.succes}</Notice> : null}
      {lectureSeule ? <Notice ton="info">Vous pouvez consulter ces informations mais pas les modifier.</Notice> : null}

      {!lectureSeule ? (
        <div className="flex justify-end">
          <SubmitButton className="w-full sm:w-auto">Enregistrer</SubmitButton>
        </div>
      ) : null}
    </form>
  );
}
