"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { calculerVersement } from "@/lib/compta";
import { formatMad } from "@/lib/format";
import { PLATEFORMES, ROLES_CONTACT, STATUTS_LOGEMENT, TAUX_COMMISSION_DEFAUT, TYPES_LOGEMENT } from "@/lib/logements";
import type { EtatLogement } from "./actions";

export type ValeursLogement = {
  nom: string;
  type: string;
  statut: string;
  capacite: string;
  ville: string;
  adresse: string;
  maps_url: string;
  frais_menage: string;
  taux_commission: string;
  code_acces: string;
  wifi_nom: string;
  wifi_mot_de_passe: string;
  equipements: string;
  notes: string;
  proprietaire_nom: string;
  proprietaires: string[];
  ical: { plateforme: string; url: string }[];
  contacts: { role: string; nom: string; telephone: string }[];
};

export const VALEURS_VIDES: ValeursLogement = {
  nom: "",
  type: "appartement",
  statut: "onboarding",
  capacite: "",
  ville: "",
  adresse: "",
  maps_url: "",
  frais_menage: "",
  taux_commission: String(TAUX_COMMISSION_DEFAUT),
  code_acces: "",
  wifi_nom: "",
  wifi_mot_de_passe: "",
  equipements: "",
  notes: "",
  proprietaire_nom: "",
  proprietaires: [],
  ical: [],
  contacts: [],
};

const versNombre = (s: string) => Number(s.trim().replace(/\s/g, "").replace(",", "."));

function Section({ titre, description, children }: { titre: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold tracking-tight">{titre}</h3>
        {description ? <p className="mt-0.5 text-sm text-ink-2 text-pretty">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Exemple chiffré en direct : Amine voit tout de suite l'effet du taux et des frais saisis. */
function ExempleCommission({ frais, taux }: { frais: string; taux: string }) {
  const montant = 5000;
  let r;
  try {
    const f = frais.trim() === "" ? 0 : versNombre(frais);
    const t = versNombre(taux);
    r = calculerVersement({ montantRecu: montant, fraisMenage: f, tauxCommission: t });
  } catch {
    r = null;
  }
  const ligne = (label: string, valeur: string, fort = false) => (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className={`num text-right ${fort ? "font-semibold text-ink" : "text-ink"}`}>{valeur}</dd>
    </div>
  );
  return (
    <div className="rounded-2xl border border-line bg-sunken/60 p-4">
      <p className="text-sm font-medium">Exemple : un séjour dont le montant reçu est de {formatMad(montant)}</p>
      {r ? (
        <dl className="mt-2 divide-y divide-line">
          {ligne("Loyer net hors ménage", formatMad(r.loyerNetHorsMenage))}
          {ligne("Commission Perfect Stay", formatMad(r.commission))}
          {ligne("Revenu net du propriétaire", formatMad(r.revenuProprietaire), true)}
          {ligne("Encaissé par Perfect Stay (ménage + commission)", formatMad(r.encaisseParPerfectStay), true)}
        </dl>
      ) : (
        <p className="mt-2 text-sm text-ink-3">Saisissez les frais de ménage et le taux pour voir le calcul.</p>
      )}
    </div>
  );
}

export function FormulaireLogement({
  action,
  valeurs,
  proprietaires,
  libelleBouton,
  avertissement,
}: {
  action: (etat: EtatLogement, formData: FormData) => Promise<EtatLogement>;
  valeurs: ValeursLogement;
  proprietaires: { id: string; label: string }[];
  libelleBouton: string;
  avertissement?: string;
}) {
  const [etat, formAction] = useActionState(action, undefined);
  const id = useId();
  const [frais, setFrais] = useState(valeurs.frais_menage);
  const [taux, setTaux] = useState(valeurs.taux_commission);
  const [cles, setCles] = useState(1);
  const [ical, setIcal] = useState(() => valeurs.ical.map((c, i) => ({ ...c, cle: i })));
  const [contacts, setContacts] = useState(() => valeurs.contacts.map((c, i) => ({ ...c, cle: i })));

  return (
    <form action={formAction} className="space-y-10">
      {avertissement ? <Notice ton="danger">{avertissement}</Notice> : null}

      <Section titre="Identité">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nom du logement" htmlFor={`${id}-nom`} className="sm:col-span-2" hint="Le nom que vous utilisez en interne, par exemple « Villa Palmeraie » ou « Appartement Gueliz 3 ».">
            <Input id={`${id}-nom`} name="nom" defaultValue={valeurs.nom} required autoComplete="off" />
          </Field>
          <Field label="Type" htmlFor={`${id}-type`}>
            <Select id={`${id}-type`} name="type" defaultValue={valeurs.type}>
              {TYPES_LOGEMENT.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Statut" htmlFor={`${id}-statut`} hint="« Onboarding » tant que le logement n'est pas prêt à être loué.">
            <Select id={`${id}-statut`} name="statut" defaultValue={valeurs.statut}>
              {STATUTS_LOGEMENT.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Capacité (voyageurs)" htmlFor={`${id}-capacite`}>
            <Input id={`${id}-capacite`} name="capacite" defaultValue={valeurs.capacite} inputMode="numeric" pattern="[0-9]*" placeholder="4" className="num" />
          </Field>
        </div>
      </Section>

      <Section titre="Tarifs et commission" description="Ces deux valeurs servent à tous les calculs de la comptabilité. Chaque logement a les siens.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Frais de ménage (MAD)" htmlFor={`${id}-menage`} hint="Montant fixe facturé pour chaque ménage.">
            <Input
              id={`${id}-menage`}
              name="frais_menage"
              value={frais}
              onChange={(e) => setFrais(e.target.value)}
              inputMode="decimal"
              placeholder="300"
              className="num"
              required
            />
          </Field>
          <Field label="Taux de commission Perfect Stay (%)" htmlFor={`${id}-taux`} hint="20 % par défaut. Modifiez-le si ce propriétaire a un autre accord.">
            <Input
              id={`${id}-taux`}
              name="taux_commission"
              value={taux}
              onChange={(e) => setTaux(e.target.value)}
              inputMode="decimal"
              className="num"
              required
            />
          </Field>
        </div>
        <ExempleCommission frais={frais} taux={taux} />
      </Section>

      <Section titre="Localisation">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Ville" htmlFor={`${id}-ville`}>
            <Input id={`${id}-ville`} name="ville" defaultValue={valeurs.ville} placeholder="Marrakech" autoComplete="off" />
          </Field>
          <Field label="Adresse" htmlFor={`${id}-adresse`}>
            <Input id={`${id}-adresse`} name="adresse" defaultValue={valeurs.adresse} autoComplete="off" />
          </Field>
          <Field
            label="Lien Google Maps"
            htmlFor={`${id}-maps`}
            className="sm:col-span-2"
            hint="Dans Google Maps : ouvrez le logement, appuyez sur « Partager », puis « Copier le lien »."
          >
            <Input id={`${id}-maps`} name="maps_url" defaultValue={valeurs.maps_url} type="url" inputMode="url" placeholder="https://maps.app.goo.gl/…" />
          </Field>
        </div>
      </Section>

      <Section titre="Propriétaire" description="Rattachez le ou les comptes Propriétaire : ils verront ce logement dans leur espace. Vous pouvez aussi noter son nom en attendant de créer son compte.">
        <div className="space-y-4">
          {proprietaires.length ? (
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">Comptes propriétaires rattachés</legend>
              {proprietaires.map((p) => (
                <label
                  key={p.id}
                  className="press flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface px-3.5 text-sm has-[:checked]:border-wine-500 has-[:checked]:bg-wine-50 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-wine-500/15"
                >
                  <input type="checkbox" name="proprietaires" value={p.id} defaultChecked={valeurs.proprietaires.includes(p.id)} className="h-4 w-4" />
                  {p.label}
                </label>
              ))}
            </fieldset>
          ) : (
            <p className="text-sm text-ink-3">Aucun compte Propriétaire pour le moment. Créez-en un dans Paramètres, puis revenez le rattacher.</p>
          )}
          <Field label="Nom du propriétaire (sans compte)" htmlFor={`${id}-pnom`}>
            <Input id={`${id}-pnom`} name="proprietaire_nom" defaultValue={valeurs.proprietaire_nom} autoComplete="off" />
          </Field>
        </div>
      </Section>

      <Section
        titre="Calendriers iCal"
        description="Le lien de calendrier de chaque plateforme. À la phase 3, l'app s'en servira pour importer les réservations toute seule."
      >
        <div className="space-y-3">
          {ical.map((c) => (
            <div key={c.cle} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[10rem_1fr_auto]">
              <Select name="ical_plateforme" defaultValue={c.plateforme} aria-label="Plateforme" className="col-span-2 sm:col-span-1">
                {PLATEFORMES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
              <Input name="ical_url" defaultValue={c.url} type="url" inputMode="url" placeholder="https://www.airbnb.fr/calendar/ical/…" aria-label="Lien du calendrier" />
              <button
                type="button"
                onClick={() => setIcal((l) => l.filter((x) => x.cle !== c.cle))}
                aria-label="Retirer ce calendrier"
                className="press grid h-11 w-11 place-items-center rounded-xl text-ink-3 hover:bg-danger-bg hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setIcal((l) => [...l, { plateforme: "Airbnb", url: "", cle: cles }]);
              setCles((n) => n + 1);
            }}
            className="press inline-flex h-10 items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 text-sm font-medium text-ink-2 hover:border-wine-500 hover:text-wine-700"
          >
            <Plus className="h-4 w-4" /> Ajouter un calendrier
          </button>
          <p className="text-[0.82rem] leading-snug text-ink-3">
            Sur Airbnb : Calendrier, puis Disponibilité, puis « Synchroniser les calendriers », puis « Exporter le calendrier » : copiez le lien affiché.
          </p>
        </div>
      </Section>

      <Section titre="Accès et équipements" description="Réservé à l'équipe : jamais visible des propriétaires ni des voyageurs.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Code d'accès / boîte à clés" htmlFor={`${id}-code`}>
            <Input id={`${id}-code`} name="code_acces" defaultValue={valeurs.code_acces} autoComplete="off" className="num" />
          </Field>
          <span className="hidden sm:block" />
          <Field label="Nom du wifi" htmlFor={`${id}-wifi`}>
            <Input id={`${id}-wifi`} name="wifi_nom" defaultValue={valeurs.wifi_nom} autoComplete="off" />
          </Field>
          <Field label="Mot de passe du wifi" htmlFor={`${id}-wifipw`}>
            <Input id={`${id}-wifipw`} name="wifi_mot_de_passe" defaultValue={valeurs.wifi_mot_de_passe} autoComplete="off" />
          </Field>
          <Field label="Équipements" htmlFor={`${id}-equip`} className="sm:col-span-2" hint="Climatisation, lave-linge, piscine, parking…">
            <Textarea id={`${id}-equip`} name="equipements" defaultValue={valeurs.equipements} rows={3} />
          </Field>
          <Field label="Notes internes" htmlFor={`${id}-notes`} className="sm:col-span-2">
            <Textarea id={`${id}-notes`} name="notes" defaultValue={valeurs.notes} rows={3} />
          </Field>
        </div>
      </Section>

      <Section titre="Contacts sur place" description="Concierge de l'immeuble, sécurité, syndic…">
        <div className="space-y-3">
          {contacts.map((c) => (
            <div key={c.cle} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[12rem_1fr_11rem_auto]">
              <Select name="contact_role" defaultValue={c.role} aria-label="Rôle" className="col-span-2 sm:col-span-1">
                {ROLES_CONTACT.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
              <Input name="contact_nom" defaultValue={c.nom} placeholder="Nom" aria-label="Nom du contact" autoComplete="off" className="col-span-2 sm:col-span-1" />
              <Input name="contact_tel" defaultValue={c.telephone} placeholder="+212 6…" type="tel" inputMode="tel" aria-label="Téléphone" className="num" />
              <button
                type="button"
                onClick={() => setContacts((l) => l.filter((x) => x.cle !== c.cle))}
                aria-label="Retirer ce contact"
                className="press grid h-11 w-11 place-items-center rounded-xl text-ink-3 hover:bg-danger-bg hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setContacts((l) => [...l, { role: "concierge", nom: "", telephone: "", cle: cles }]);
              setCles((n) => n + 1);
            }}
            className="press inline-flex h-10 items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 text-sm font-medium text-ink-2 hover:border-wine-500 hover:text-wine-700"
          >
            <Plus className="h-4 w-4" /> Ajouter un contact
          </button>
        </div>
      </Section>

      {etat?.erreur ? <Notice ton="danger">{etat.erreur}</Notice> : null}

      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 -mx-1 flex justify-end rounded-2xl border border-line bg-surface/95 p-3 shadow-pop backdrop-blur md:bottom-4">
        <SubmitButton className="w-full sm:w-auto">{libelleBouton}</SubmitButton>
      </div>
    </form>
  );
}
