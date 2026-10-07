"use client";

import { useState } from "react";
import { Card, Notice, Spinner } from "@/components/ui";
import { supprimerVersement } from "../../actions";

export function SupprimerVersement({ id }: { id: string }) {
  const [confirmation, setConfirmation] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string>();

  async function supprimer() {
    setOccupe(true);
    const r = await supprimerVersement(id); // redirige vers la liste en cas de succès
    setOccupe(false);
    if (r?.erreur) setErreur(r.erreur);
  }

  return (
    <Card className="space-y-3 border-danger/25 p-5 md:p-7">
      <h2 className="font-medium text-danger">Supprimer ce versement</h2>
      <p className="text-sm text-ink-2 text-pretty">Le versement disparaît des totaux et des prochains rapports. Les factures déjà émises ne sont pas modifiées.</p>
      {!confirmation ? (
        <button type="button" onClick={() => setConfirmation(true)} className="press h-10 rounded-xl border border-danger/30 px-4 text-sm font-medium text-danger hover:bg-danger-bg">
          Supprimer
        </button>
      ) : (
        <div className="flex gap-2">
          <button type="button" onClick={supprimer} disabled={occupe} className="press inline-flex h-10 items-center gap-2 rounded-xl bg-danger px-4 text-sm font-medium text-white disabled:opacity-60">
            {occupe ? <Spinner /> : null} Confirmer la suppression
          </button>
          <button type="button" onClick={() => setConfirmation(false)} className="press h-10 rounded-xl px-4 text-sm text-ink-2 hover:bg-sunken">
            Annuler
          </button>
        </div>
      )}
      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
    </Card>
  );
}
