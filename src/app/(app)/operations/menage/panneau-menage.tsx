"use client";

import { Check, Play, RotateCcw, ShieldAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass, Notice, Select, Spinner, Textarea } from "@/components/ui";
import { annulerMenage, assignerMenage, changerStatutMenage, controlerMenage } from "./actions";

type Props = {
  id: string;
  cle: "a_faire" | "en_cours" | "bloque" | "a_controler" | "valide" | "a_refaire" | "annule";
  peutAvancer: boolean;
  peutControler: boolean;
  responsableId: string;
  responsables: { id: string; nom: string; prestataire: boolean }[];
  noteControle: string;
};

export function PanneauMenage({ id, cle, peutAvancer, peutControler, responsableId, responsables, noteControle }: Props) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState("");
  const [note, setNote] = useState("");
  const [confirmation, setConfirmation] = useState(false);

  function lancer(action: () => Promise<{ erreur?: string } | undefined>) {
    setErreur("");
    demarrer(async () => {
      const r = await action();
      if (r?.erreur) setErreur(r.erreur);
      else router.refresh();
    });
  }
  const avancer = (statut: string) => lancer(() => changerStatutMenage(id, statut));
  const ouvert = cle === "a_faire" || cle === "a_refaire" || cle === "en_cours" || cle === "bloque";

  return (
    <div className="space-y-5">
      {cle === "a_refaire" && noteControle ? (
        <Notice ton="danger">
          <strong>À refaire :</strong> {noteControle}
        </Notice>
      ) : null}

      {peutAvancer && ouvert ? (
        <div className="flex flex-wrap gap-2">
          {cle === "a_faire" || cle === "a_refaire" || cle === "bloque" ? (
            <button type="button" disabled={enCours} onClick={() => avancer("en_cours")} className={buttonClass("primary", "md", "flex-1 sm:flex-none")}>
              {enCours ? <Spinner /> : <Play className="h-4 w-4" />} {cle === "bloque" ? "Reprendre" : "Commencer"}
            </button>
          ) : null}
          {cle === "en_cours" ? (
            <>
              <button type="button" disabled={enCours} onClick={() => avancer("termine")} className={buttonClass("primary", "md", "flex-1 sm:flex-none")}>
                {enCours ? <Spinner /> : <Check className="h-4 w-4" />} Terminer le ménage
              </button>
              <button type="button" disabled={enCours} onClick={() => avancer("bloque")} className={buttonClass("secondary", "md")}>
                <ShieldAlert className="h-4 w-4" /> Signaler un blocage
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {cle === "a_controler" && !peutControler ? <Notice ton="info">Ménage terminé : il attend le contrôle qualité.</Notice> : null}

      {peutControler && (cle === "a_controler" || cle === "valide") ? (
        <div className="space-y-3 rounded-xl border border-line-strong bg-sunken/50 p-4">
          <h3 className="font-display text-base font-semibold tracking-tight">Contrôle qualité</h3>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Remarque (obligatoire si le ménage est à refaire)" aria-label="Remarque de contrôle" />
          <div className="flex flex-wrap gap-2">
            {cle === "a_controler" ? (
              <button type="button" disabled={enCours} onClick={() => lancer(() => controlerMenage(id, "valide", note))} className={buttonClass("primary", "md", "flex-1 sm:flex-none")}>
                {enCours ? <Spinner /> : <Check className="h-4 w-4" />} Valider le ménage
              </button>
            ) : null}
            <button type="button" disabled={enCours} onClick={() => lancer(() => controlerMenage(id, "a_refaire", note))} className={buttonClass("danger", "md", "flex-1 sm:flex-none")}>
              <RotateCcw className="h-4 w-4" /> À refaire
            </button>
          </div>
        </div>
      ) : null}

      {peutControler && cle !== "annule" ? (
        <div className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
          <label className="block min-w-0 flex-1 sm:max-w-xs">
            <span className="mb-1.5 block text-sm font-medium">Responsable du ménage</span>
            <Select defaultValue={responsableId} onChange={(e) => lancer(() => assignerMenage(id, e.target.value))} disabled={enCours}>
              <option value="">Non attribué</option>
              {responsables.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nom}
                  {r.prestataire ? " (prestataire)" : ""}
                </option>
              ))}
            </Select>
          </label>
          {confirmation ? (
            <span className="flex items-center gap-2">
              <button type="button" disabled={enCours} onClick={() => lancer(() => annulerMenage(id))} className="press h-10 rounded-xl bg-danger px-4 text-sm font-medium text-white disabled:opacity-60">
                Confirmer l&apos;annulation
              </button>
              <button type="button" onClick={() => setConfirmation(false)} className="press h-10 rounded-xl px-4 text-sm text-ink-2 hover:bg-sunken">
                Non
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmation(true)} className="press inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-danger hover:bg-danger-bg">
              <X className="h-4 w-4" /> Annuler ce ménage
            </button>
          )}
        </div>
      ) : null}

      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
    </div>
  );
}
