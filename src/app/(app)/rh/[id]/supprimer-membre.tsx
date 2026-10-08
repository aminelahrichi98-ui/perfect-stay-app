"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Notice } from "@/components/ui";
import { supprimerMembre } from "../actions";

export function SupprimerMembre({ id }: { id: string }) {
  const [enCours, demarrer] = useTransition();
  const [confirmation, setConfirmation] = useState(false);
  const [erreur, setErreur] = useState("");
  return (
    <div className="space-y-2">
      {confirmation ? (
        <span className="flex items-center gap-2">
          <button type="button" disabled={enCours} onClick={() => demarrer(async () => { const r = await supprimerMembre(id); if (r?.erreur) setErreur(r.erreur); })} className="press h-10 rounded-xl bg-danger px-4 text-sm font-medium text-white disabled:opacity-60">
            Confirmer la suppression
          </button>
          <button type="button" onClick={() => setConfirmation(false)} className="press h-10 rounded-xl px-4 text-sm text-ink-2 hover:bg-sunken">
            Annuler
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirmation(true)} className="press inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-danger hover:bg-danger-bg">
          <Trash2 className="h-4 w-4" /> Supprimer la fiche et ses documents
        </button>
      )}
      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
    </div>
  );
}
