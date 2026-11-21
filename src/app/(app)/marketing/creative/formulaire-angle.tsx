"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useImperativeHandle, useRef, useState, useTransition, type Ref } from "react";
import { buttonClass, Field, Input, Notice, Select, Spinner, Textarea } from "@/components/ui";
import { SEGMENTS, STATUTS_ANGLE } from "@/lib/creative";
import { enregistrerAngle } from "./actions";
import type { Angle } from "./donnees";

export type BoiteAngle = { ouvrir: (a: Angle | null) => void };

/** Création et modification d'un angle marketing, dans une boîte de dialogue. */
export function FormulaireAngle({ ref, apresCreation }: { ref: Ref<BoiteAngle>; apresCreation?: (id: string) => void }) {
  const router = useRouter();
  const boite = useRef<HTMLDialogElement>(null);
  const [angle, setAngle] = useState<Angle | null>(null);
  const [cle, setCle] = useState(0);
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();

  useImperativeHandle(ref, () => ({
    ouvrir(a) {
      setAngle(a);
      setCle((k) => k + 1);
      setErreur("");
      boite.current?.showModal();
    },
  }));

  function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const t = (n: string) => String(f.get(n) ?? "");
    setErreur("");
    demarrer(async () => {
      const r = await enregistrerAngle({
        id: angle?.id,
        nom: t("nom"),
        segment: t("segment"),
        problemePrincipal: t("probleme"),
        problemesSecondaires: t("secondaires").split("\n"),
        consequences: t("consequences"),
        hook: t("hook"),
        usp: t("usp"),
        solution: t("solution"),
        cta: t("cta"),
        statut: t("statut"),
      });
      if (r?.erreur) return setErreur(r.erreur);
      boite.current?.close();
      if (!angle && r?.id && apresCreation) apresCreation(r.id);
      else router.refresh();
    });
  }

  const titre = angle ? `Modifier ${angle.code}` : "Nouvel angle";
  return (
    <dialog ref={boite} aria-label={titre} onClick={(e) => e.target === boite.current && boite.current?.close()} className="m-auto max-h-[calc(100dvh-2rem)] w-[min(44rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-line bg-surface p-0 shadow-pop backdrop:bg-aub-950/60">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">{titre}</h2>
        <button type="button" onClick={() => boite.current?.close()} aria-label="Fermer" className="press grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-sunken">
          <X className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={soumettre} className="space-y-4 p-5" key={cle}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom de l'angle" htmlFor="a-nom" className="sm:col-span-2">
            <Input id="a-nom" name="nom" defaultValue={angle?.nom} maxLength={120} required placeholder="Ex. Vacance locative" autoComplete="off" />
          </Field>
          <Field label="Segment de propriétaire" htmlFor="a-segment">
            <Select id="a-segment" name="segment" defaultValue={angle?.segment ?? "tous"}>
              {SEGMENTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Statut" htmlFor="a-statut">
            <Select id="a-statut" name="statut" defaultValue={angle?.statut ?? "backlog"}>
              {STATUTS_ANGLE.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Problème principal" htmlFor="a-probleme" className="sm:col-span-2">
            <Textarea id="a-probleme" name="probleme" defaultValue={angle?.problemePrincipal} maxLength={600} className="min-h-20" />
          </Field>
          <Field label="Problèmes secondaires" htmlFor="a-secondaires" hint="Un problème par ligne." className="sm:col-span-2">
            <Textarea id="a-secondaires" name="secondaires" defaultValue={angle?.problemesSecondaires.join("\n")} className="min-h-24" />
          </Field>
          <Field label="Conséquences financières" htmlFor="a-consequences" className="sm:col-span-2">
            <Textarea id="a-consequences" name="consequences" defaultValue={angle?.consequences} maxLength={800} className="min-h-20" />
          </Field>
          <Field label="Hook publicitaire" htmlFor="a-hook" className="sm:col-span-2">
            <Input id="a-hook" name="hook" defaultValue={angle?.hook} maxLength={300} autoComplete="off" />
          </Field>
          <Field label="USP" htmlFor="a-usp" className="sm:col-span-2">
            <Textarea id="a-usp" name="usp" defaultValue={angle?.usp} maxLength={600} className="min-h-20" />
          </Field>
          <Field label="Solution Perfect Stay" htmlFor="a-solution" className="sm:col-span-2">
            <Textarea id="a-solution" name="solution" defaultValue={angle?.solution} maxLength={800} className="min-h-20" />
          </Field>
          <Field label="CTA" htmlFor="a-cta" className="sm:col-span-2">
            <Input id="a-cta" name="cta" defaultValue={angle?.cta} maxLength={120} autoComplete="off" placeholder="Ex. Recevoir mon audit offert" />
          </Field>
        </div>
        {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
        <button type="submit" disabled={enCours} aria-busy={enCours} className={buttonClass("primary", "md", "w-full")}>
          {enCours ? <Spinner /> : null} Enregistrer
        </button>
      </form>
    </dialog>
  );
}
