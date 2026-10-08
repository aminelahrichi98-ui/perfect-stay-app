"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { Spinner } from "@/components/ui";
import { urlDocument } from "@/app/(app)/comptabilite/actions";

export function Telecharger({ type, id, libelle }: { type: "facture" | "rapport"; id: string; libelle: string }) {
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string>();
  async function ouvrir() {
    setOccupe(true);
    setErreur(undefined);
    const r = await urlDocument(type, id);
    setOccupe(false);
    if (r.url) window.open(r.url, "_blank", "noopener");
    else setErreur(r.erreur);
  }
  return (
    <span className="inline-flex flex-col">
      <button type="button" onClick={ouvrir} disabled={occupe} className="press inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-medium shadow-card hover:bg-sunken disabled:opacity-60">
        {occupe ? <Spinner /> : <Download className="h-4 w-4" />} {libelle}
      </button>
      {erreur ? <span className="mt-1 text-[0.8rem] text-danger">{erreur}</span> : null}
    </span>
  );
}
