"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PencilLine } from "lucide-react";
import { buttonClass, Spinner } from "@/components/ui";
import { nouvelleSaisie } from "./actions";

/** Ouvre l'écran de validation vide (saisie manuelle) ou pré-rempli depuis la version active d'un segment (compléter). */
export function SaisieManuelle({ segmentId, libelle = "Saisie manuelle" }: { segmentId?: string; libelle?: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState("");
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        disabled={enCours}
        className={buttonClass("secondary", "sm")}
        onClick={() =>
          demarrer(async () => {
            const r = await nouvelleSaisie(segmentId);
            if ("erreur" in r && r.erreur) setErreur(r.erreur);
            else if ("importId" in r) router.push(`/estimateur/marche/import/${r.importId}`);
          })
        }
      >
        {enCours ? <Spinner /> : <PencilLine className="h-4 w-4" />} {libelle}
      </button>
      {erreur ? <span role="alert" className="mt-1 text-xs text-danger">{erreur}</span> : null}
    </span>
  );
}
