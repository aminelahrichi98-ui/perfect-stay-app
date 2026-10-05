"use client";

import { useState } from "react";
import { Card, Notice, Spinner } from "@/components/ui";
import { supprimerLogement } from "../../actions";

export function ZoneSuppression({ id, nom }: { id: string; nom: string }) {
  const [confirmation, setConfirmation] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string>();

  async function supprimer() {
    setOccupe(true);
    const r = await supprimerLogement(id); // redirige vers la liste en cas de succès
    setOccupe(false);
    if (r?.erreur) setErreur(r.erreur);
  }

  return (
    <Card className="space-y-3 border-danger/25 p-5 md:p-7">
      <h2 className="font-medium text-danger">Zone sensible</h2>
      <p className="text-sm text-ink-2 text-pretty">
        Supprimer un logement efface aussi ses photos, ses documents et ses contacts. Cette action est définitive. Pour simplement arrêter de le gérer, passez-le en statut « En pause ».
      </p>
      {!confirmation ? (
        <button type="button" onClick={() => setConfirmation(true)} className="press h-10 rounded-xl border border-danger/30 px-4 text-sm font-medium text-danger hover:bg-danger-bg">
          Supprimer ce logement
        </button>
      ) : (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm">
              Pour confirmer, écrivez <strong>{nom}</strong> :
            </span>
            <input
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              autoComplete="off"
              className="block h-11 w-full max-w-sm rounded-xl border border-line-strong bg-surface px-3.5 focus:border-danger focus:ring-4 focus:ring-danger/15 focus:outline-none"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saisie.trim() !== nom || occupe}
              onClick={supprimer}
              className="press inline-flex h-10 items-center gap-2 rounded-xl bg-danger px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {occupe ? <Spinner /> : null} Supprimer définitivement
            </button>
            <button type="button" onClick={() => setConfirmation(false)} className="press h-10 rounded-xl px-4 text-sm text-ink-2 hover:bg-sunken">
              Annuler
            </button>
          </div>
        </div>
      )}
      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
    </Card>
  );
}
