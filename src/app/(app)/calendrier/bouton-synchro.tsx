"use client";

import { CheckCircle2, RefreshCw, TriangleAlert } from "lucide-react";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { synchroniserMaintenant, type ResumeSynchro } from "./actions";

export function BoutonSynchro({ derniereSync }: { derniereSync: string | null }) {
  const [enCours, demarrer] = useTransition();
  const [resume, setResume] = useState<ResumeSynchro>();

  const lancer = () =>
    demarrer(async () => {
      setResume(undefined);
      setResume(await synchroniserMaintenant());
    });

  const changements = resume ? (resume.nouvelles ?? 0) + (resume.modifiees ?? 0) + (resume.annulees ?? 0) : 0;

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={lancer}
        disabled={enCours}
        aria-busy={enCours}
        className="press inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface px-5 font-medium shadow-card hover:bg-sunken disabled:opacity-70"
      >
        <RefreshCw className={cn("h-4 w-4", enCours && "animate-[spin_900ms_linear_infinite]")} />
        {enCours ? "Synchronisation…" : "Synchroniser maintenant"}
      </button>
      <p className="text-[0.8rem] text-ink-3" aria-live="polite">
        {resume?.erreur ? (
          <span className="flex items-center gap-1.5 text-danger">
            <TriangleAlert className="h-3.5 w-3.5" /> {resume.erreur}
          </span>
        ) : resume && !enCours ? (
          <span className={cn("flex items-center gap-1.5", resume.liensEnErreur ? "text-warn" : "text-ok")}>
            {resume.liensEnErreur ? <TriangleAlert className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {resume.liensSynchronises} calendrier{(resume.liensSynchronises ?? 0) > 1 ? "s" : ""} à jour
            {changements ? ` · ${changements} changement${changements > 1 ? "s" : ""}` : " · aucun changement"}
            {resume.menagesCrees ? ` · ${resume.menagesCrees} ménage${resume.menagesCrees > 1 ? "s" : ""} créé${resume.menagesCrees > 1 ? "s" : ""}` : ""}
            {resume.liensEnErreur ? ` · ${resume.liensEnErreur} en erreur` : ""}
          </span>
        ) : derniereSync ? (
          <>Dernière synchronisation : {derniereSync}</>
        ) : (
          <>Pas encore synchronisé</>
        )}
      </p>
    </div>
  );
}
