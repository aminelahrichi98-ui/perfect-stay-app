"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { Spinner } from "@/components/ui";
import { ouvrirJustificatif } from "../../actions";

export function BoutonJustificatif({ id }: { id: string }) {
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string>();
  async function ouvrir() {
    setOccupe(true);
    setErreur(undefined);
    const r = await ouvrirJustificatif(id);
    setOccupe(false);
    if (r.url) window.open(r.url, "_blank", "noopener");
    else setErreur(r.erreur);
  }
  return (
    <span className="flex flex-col items-end gap-1">
      <button type="button" onClick={ouvrir} disabled={occupe} className="press inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-medium shadow-card hover:bg-sunken">
        {occupe ? <Spinner /> : <ExternalLink className="h-4 w-4" />} Voir le justificatif
      </button>
      {erreur ? <span className="text-[0.8rem] text-danger">{erreur}</span> : null}
    </span>
  );
}
