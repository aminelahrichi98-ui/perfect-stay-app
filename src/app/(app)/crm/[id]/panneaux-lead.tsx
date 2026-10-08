"use client";

import { ArrowRight, Phone, Rocket, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass, Field, Input, Notice, Select, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { ETAPES_CRM, RESULTATS_APPEL } from "@/lib/crm";
import { changerEtape, demarrerOnboarding, enregistrerAppel, supprimerAppel, supprimerLead } from "../actions";

export function PanneauEtape({ id, etape, motif, modifiable }: { id: string; etape: string; motif: string; modifiable: boolean }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [perte, setPerte] = useState(motif);
  const [erreur, setErreur] = useState("");
  const aller = (e: string) =>
    demarrer(async () => {
      setErreur("");
      const r = await changerEtape(id, e, e === "perdu" ? perte : "");
      if (r?.erreur) setErreur(r.erreur);
      else router.refresh();
    });
  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Étape du lead" className="flex flex-wrap gap-2">
        {ETAPES_CRM.map((e) => (
          <button
            key={e.value}
            type="button"
            role="radio"
            aria-checked={etape === e.value}
            disabled={!modifiable || enCours}
            onClick={() => aller(e.value)}
            className={cn("press inline-flex h-10 items-center rounded-full border px-3.5 text-sm font-medium disabled:opacity-60", etape === e.value ? "border-wine-500 bg-wine-50 text-wine-800" : "border-line-strong bg-surface text-ink-2 hover:bg-sunken")}
          >
            {e.label}
          </button>
        ))}
      </div>
      {etape === "perdu" && modifiable ? (
        <Field label="Motif de la perte" htmlFor="motif" hint="Pour comprendre pourquoi (prix, a choisi un concurrent, ne loue plus…).">
          <Input id="motif" value={perte} onChange={(e) => setPerte(e.target.value)} onBlur={() => perte !== motif && aller("perdu")} maxLength={300} autoComplete="off" />
        </Field>
      ) : null}
      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
    </div>
  );
}

export function PanneauAppels({ leadId, appels, modifiable }: { leadId: string; appels: { id: string; date: string; resultat: string; libelle: string; note: string; auteur: string }[]; modifiable: boolean }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [resultat, setResultat] = useState("pas_de_reponse");
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState("");
  function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    demarrer(async () => {
      const r = await enregistrerAppel(leadId, resultat, note);
      if (r?.erreur) setErreur(r.erreur);
      else {
        setNote("");
        router.refresh();
      }
    });
  }
  return (
    <div className="space-y-4">
      {modifiable ? (
        <form onSubmit={ajouter} className="space-y-3 rounded-xl border border-line-strong bg-sunken/40 p-4">
          <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
            <Field label="Résultat de l'appel" htmlFor="resultat">
              <Select id="resultat" value={resultat} onChange={(e) => setResultat(e.target.value)}>
                {RESULTATS_APPEL.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Note (facultatif)" htmlFor="note-appel">
              <Input id="note-appel" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Ce qui s'est dit, à rappeler jeudi…" autoComplete="off" />
            </Field>
          </div>
          <button type="submit" disabled={enCours} aria-busy={enCours} className={buttonClass("primary", "md")}>
            {enCours ? <Spinner /> : <Phone className="h-4 w-4" />} Enregistrer l&apos;appel
          </button>
          {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
        </form>
      ) : null}
      {appels.length ? (
        <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {appels.map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{a.libelle}</span>
                <span className="num block text-sm text-ink-3">
                  {a.date} · {a.auteur}
                </span>
                {a.note ? <span className="mt-1 block text-sm text-ink-2 text-pretty">{a.note}</span> : null}
              </span>
              {modifiable ? (
                <button type="button" aria-label="Supprimer cet appel" onClick={() => demarrer(async () => { await supprimerAppel(a.id); router.refresh(); })} className="press grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-danger-bg hover:text-danger">
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ink-3">Aucun appel enregistré.</p>
      )}
    </div>
  );
}

export function BoutonOnboarding({ leadId, signe, logementId }: { leadId: string; signe: boolean; logementId: string | null }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState("");
  const [cree, setCree] = useState<{ id: string; visible: boolean } | null>(logementId ? { id: logementId, visible: true } : null);

  if (cree) {
    return (
      <div className="space-y-2">
        <Notice ton="ok">Le logement a été créé en brouillon dans l&apos;Onboarding.</Notice>
        <Link href={cree.visible ? `/onboarding/${cree.id}` : "/crm"} className={buttonClass("secondary", "md")}>
          Ouvrir l&apos;onboarding <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={enCours || !signe}
        onClick={() =>
          demarrer(async () => {
            setErreur("");
            const r = await demarrerOnboarding(leadId);
            if (r?.erreur) setErreur(r.erreur);
            else if (r?.logementId) {
              setCree({ id: r.logementId, visible: Boolean(r.onboardingVisible) });
              router.refresh();
            }
          })
        }
        className={buttonClass("primary", "md")}
      >
        {enCours ? <Spinner /> : <Rocket className="h-4 w-4" />} Lead signé : démarrer l&apos;onboarding
      </button>
      {!signe ? <p className="text-sm text-ink-3">Disponible quand le lead passe à l&apos;étape « Signé ».</p> : null}
      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
    </div>
  );
}

export function SupprimerLead({ id }: { id: string }) {
  const [enCours, demarrer] = useTransition();
  const [confirmation, setConfirmation] = useState(false);
  const [erreur, setErreur] = useState("");
  return (
    <div className="space-y-2">
      {confirmation ? (
        <span className="flex items-center gap-2">
          <button type="button" disabled={enCours} onClick={() => demarrer(async () => { const r = await supprimerLead(id); if (r?.erreur) setErreur(r.erreur); })} className="press h-10 rounded-xl bg-danger px-4 text-sm font-medium text-white disabled:opacity-60">
            Confirmer la suppression
          </button>
          <button type="button" onClick={() => setConfirmation(false)} className="press h-10 rounded-xl px-4 text-sm text-ink-2 hover:bg-sunken">
            Annuler
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirmation(true)} className="press inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-danger hover:bg-danger-bg">
          <Trash2 className="h-4 w-4" /> Supprimer le lead
        </button>
      )}
      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
    </div>
  );
}
