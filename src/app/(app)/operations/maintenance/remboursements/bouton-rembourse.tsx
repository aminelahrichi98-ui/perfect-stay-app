"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass, Input, Notice, Spinner } from "@/components/ui";
import { formatMontant } from "@/lib/format";
import { marquerRembourses } from "../actions";

export function BoutonRembourse({ logementId, aujourdhui, total }: { logementId: string; aujourdhui: string; total: number }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [jour, setJour] = useState(aujourdhui);
  const [erreur, setErreur] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Date du remboursement</span>
          <Input type="date" value={jour} onChange={(e) => setJour(e.target.value)} className="num w-44" />
        </label>
        <button
          type="button"
          disabled={enCours}
          aria-busy={enCours}
          onClick={() =>
            demarrer(async () => {
              setErreur("");
              const r = await marquerRembourses(logementId, jour);
              if (r?.erreur) setErreur(r.erreur);
              else router.refresh();
            })
          }
          className={buttonClass("primary", "md")}
        >
          {enCours ? <Spinner /> : <Check className="h-4 w-4" />} Marquer {formatMontant(total)} MAD comme remboursé
        </button>
      </div>
      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
    </div>
  );
}
