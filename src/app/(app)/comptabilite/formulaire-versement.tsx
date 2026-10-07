"use client";

import { TriangleAlert } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { calculerVersement } from "@/lib/compta";
import { formatJour, moisDe, nbNuits } from "@/lib/dates";
import { formatMontant } from "@/lib/format";
import type { ModeTva } from "@/lib/mode-tva";
import type { EtatCompta } from "./actions";

export type LogementSaisie = { id: string; nom: string; frais_menage: number; taux_commission: number };
export type ReservationSaisie = { id: string; logement_id: string; arrivee: string; depart: string; plateforme: string; code: string; deja: number };

type Props = {
  action: (etat: EtatCompta, formData: FormData) => Promise<EtatCompta>;
  logements: LogementSaisie[];
  reservations: ReservationSaisie[];
  tauxTva: number;
  mode: ModeTva;
  aujourdhui: string;
  /** « logementId|AAAA-MM » des mois déjà facturés */
  facturesEmises: string[];
  libelleBouton: string;
  /** Mode modification : logement figé, ménage et taux d'origine du versement */
  edition?: {
    logementId: string;
    date: string;
    montant: string;
    note: string;
    fraisMenage: number;
    taux: number;
  };
};

const versNombre = (s: string) => Number(s.trim().replace(/\s/g, "").replace(",", "."));
const pct = (n: number) => `${String(n).replace(".", ",")} %`;

function Ligne({ label, valeur, fort, signe }: { label: string; valeur: string; fort?: boolean; signe?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-sm text-ink-2">
        {signe ? <span className="mr-1.5 inline-block w-3 text-ink-3">{signe}</span> : null}
        {label}
      </dt>
      <dd className={`num text-right ${fort ? "font-semibold text-ink" : "text-ink"}`}>{valeur}</dd>
    </div>
  );
}

export function FormulaireVersement({ action, logements, reservations, tauxTva, mode, aujourdhui, facturesEmises, libelleBouton, edition }: Props) {
  const [etat, formAction] = useActionState(action, undefined);
  const [logementId, setLogementId] = useState(edition?.logementId ?? "");
  const [reservationId, setReservationId] = useState("");
  const [date, setDate] = useState(edition?.date ?? aujourdhui);
  const [montant, setMontant] = useState(edition?.montant ?? "");
  const [actualiser, setActualiser] = useState(false);

  const logement = logements.find((l) => l.id === logementId);
  const reservationsDuLogement = reservations.filter((r) => r.logement_id === logementId);
  const menage = edition ? (actualiser && logement ? logement.frais_menage : edition.fraisMenage) : (logement?.frais_menage ?? 0);
  const taux = edition ? (actualiser && logement ? logement.taux_commission : edition.taux) : (logement?.taux_commission ?? 0);

  const calcul = useMemo(() => {
    const m = versNombre(montant);
    if (!logement || !(m > 0)) return null;
    if (m < menage) return { erreur: `Le montant est inférieur aux frais de ménage (${formatMontant(menage)} MAD).` } as const;
    try {
      return { r: calculerVersement({ montantRecu: m, fraisMenage: menage, tauxCommission: taux, tauxTva }) } as const;
    } catch {
      return null;
    }
  }, [montant, logement, menage, taux, tauxTva]);

  const dejaFacture = logement && /^\d{4}-\d{2}-\d{2}$/.test(date) && facturesEmises.includes(`${logement.id}|${moisDe(date)}`);
  const ecartReference = edition && logement && (logement.frais_menage !== edition.fraisMenage || logement.taux_commission !== edition.taux);

  return (
    <form action={formAction} className="space-y-7">
      <div className="grid gap-5 sm:grid-cols-2">
        {edition ? (
          <>
            <input type="hidden" name="logement_id" value={logementId} />
            <Field label="Logement" htmlFor="logement-fige" className="sm:col-span-2">
              <Input id="logement-fige" value={logement?.nom ?? ""} readOnly disabled />
            </Field>
          </>
        ) : (
          <>
            <Field label="Logement" htmlFor="logement_id" className="sm:col-span-2">
              <Select
                id="logement_id"
                name="logement_id"
                value={logementId}
                onChange={(e) => {
                  setLogementId(e.target.value);
                  setReservationId("");
                }}
                required
              >
                <option value="">Choisir un logement…</option>
                {logements.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nom}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Réservation concernée (facultatif)"
              htmlFor="reservation_id"
              className="sm:col-span-2"
              hint={logement ? (reservationsDuLogement.length ? "Choisir la réservation remplit la date pour vous." : "Aucune réservation récente dans le calendrier : saisie libre.") : "Choisissez d'abord un logement."}
            >
              <Select
                id="reservation_id"
                name="reservation_id"
                value={reservationId}
                disabled={!logement}
                onChange={(e) => {
                  setReservationId(e.target.value);
                  const r = reservations.find((x) => x.id === e.target.value);
                  if (r) setDate(r.arrivee);
                }}
              >
                <option value="">Aucune : saisie libre</option>
                {reservationsDuLogement.map((r) => {
                  const n = nbNuits(r.arrivee, r.depart);
                  return (
                    <option key={r.id} value={r.id}>
                      {formatJour(r.arrivee)} → {formatJour(r.depart)} · {n} nuit{n > 1 ? "s" : ""}
                      {r.code ? ` · ${r.code}` : ""}
                      {r.deja ? ` · ${r.deja} versement${r.deja > 1 ? "s" : ""} déjà saisi${r.deja > 1 ? "s" : ""}` : ""}
                    </option>
                  );
                })}
              </Select>
            </Field>
          </>
        )}

        <Field label="Date du versement" htmlFor="date_versement" hint="Le jour où le versement a été reçu.">
          <Input id="date_versement" name="date_versement" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="num" />
        </Field>
        <Field label="Montant reçu (MAD)" htmlFor="montant_recu" hint="Chiffre d'affaires de la réservation moins la commission de la plateforme.">
          <Input
            id="montant_recu"
            name="montant_recu"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            inputMode="decimal"
            placeholder="5 000"
            autoComplete="off"
            required
            className="num"
          />
        </Field>
      </div>

      {/* Calcul en direct */}
      <div className="rounded-2xl border border-line bg-sunken/60 p-4">
        {!logement ? (
          <p className="text-sm text-ink-3">Choisissez un logement et saisissez le montant reçu : tout le reste se calcule tout seul.</p>
        ) : !calcul ? (
          <p className="text-sm text-ink-3">
            {logement.nom} : ménage {formatMontant(menage)} MAD, commission {pct(taux)}. Saisissez le montant reçu pour voir le détail.
          </p>
        ) : "erreur" in calcul ? (
          <p className="flex items-start gap-2 text-sm text-danger">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {calcul.erreur}
          </p>
        ) : (
          <dl className="divide-y divide-line">
            <Ligne label="Montant reçu" valeur={`${formatMontant(calcul.r.montantRecu)} MAD`} />
            <Ligne signe="−" label="Frais de ménage" valeur={`${formatMontant(calcul.r.fraisMenage)} MAD`} />
            <Ligne signe="=" label="Loyer net hors ménage" valeur={`${formatMontant(calcul.r.loyerNetHorsMenage)} MAD`} fort />
            <Ligne
              label={`Commission Perfect Stay (${pct(taux)}) ${mode === "ht" ? "HT" : "TTC"}`}
              valeur={`${formatMontant(mode === "ht" ? calcul.r.commissionHT : calcul.r.commission)} MAD`}
              fort
            />
            <div className="py-1 text-[0.78rem] text-ink-3">
              {mode === "ttc"
                ? `dont ${formatMontant(calcul.r.commissionHT)} HT + ${formatMontant(calcul.r.tvaCommission)} de TVA (${pct(tauxTva)})`
                : `soit ${formatMontant(calcul.r.commission)} TTC avec ${formatMontant(calcul.r.tvaCommission)} de TVA (${pct(tauxTva)})`}
            </div>
            <Ligne label="Revenu net du propriétaire" valeur={`${formatMontant(calcul.r.revenuProprietaire)} MAD`} fort />
            <Ligne label="Encaissé par Perfect Stay (ménage + commission TTC)" valeur={`${formatMontant(calcul.r.encaisseParPerfectStay)} MAD`} fort />
          </dl>
        )}
      </div>

      {edition && ecartReference ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line-strong bg-surface p-3.5 shadow-card">
          <input type="checkbox" name="actualiser" checked={actualiser} onChange={(e) => setActualiser(e.target.checked)} className="mt-1 h-4 w-4" />
          <span className="text-sm">
            <span className="block font-medium">Utiliser le ménage et le taux actuels du logement</span>
            <span className="block text-[0.82rem] text-ink-2">
              Ce versement garde ses valeurs d&apos;origine (ménage {formatMontant(edition.fraisMenage)} MAD, commission {pct(edition.taux)}). Le logement a maintenant
              {logement ? ` ${formatMontant(logement.frais_menage)} MAD et ${pct(logement.taux_commission)}` : " d'autres valeurs"}.
            </span>
          </span>
        </label>
      ) : null}

      {dejaFacture ? (
        <Notice ton="info">Une facture a déjà été émise pour ce logement et ce mois : ce versement n&apos;y figurera pas. Les factures émises ne sont jamais modifiées.</Notice>
      ) : null}

      <Field label="Note (facultatif)" htmlFor="note">
        <Textarea id="note" name="note" defaultValue={edition?.note} rows={2} maxLength={300} />
      </Field>

      {etat?.erreur ? <Notice ton="danger">{etat.erreur}</Notice> : null}

      <div className="flex justify-end">
        <SubmitButton className="w-full sm:w-auto">{libelleBouton}</SubmitButton>
      </div>
    </form>
  );
}
