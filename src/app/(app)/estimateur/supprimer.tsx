"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { Spinner } from "@/components/ui";
import { supprimerEstimation } from "./actions";

export function SupprimerEstimation({ id, prenom }: { id: string; prenom: string }) {
  const [enCours, demarrer] = useTransition();
  return (
    <button
      type="button"
      disabled={enCours}
      aria-label={`Supprimer l'estimation de ${prenom}`}
      title="Supprimer"
      onClick={() => {
        if (!confirm(`Supprimer définitivement l'estimation de ${prenom} ?`)) return;
        demarrer(async () => {
          const r = await supprimerEstimation(id);
          if (r.erreur) alert(r.erreur);
        });
      }}
      className="press grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-danger-bg hover:text-danger"
    >
      {enCours ? <Spinner /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}
