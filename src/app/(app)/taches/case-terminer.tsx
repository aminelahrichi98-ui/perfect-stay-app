"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { changerStatutTache } from "./actions";

/** Case ronde « terminé » : un geste pour cocher ou rouvrir une tâche, sans ouvrir sa fiche. */
export function CaseTerminer({ id, termine, titre }: { id: string; termine: boolean; titre: string }) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const [local, setLocal] = useState<boolean | null>(null);
  const coche = local ?? termine;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={coche}
      aria-label={`Terminer : ${titre}`}
      onClick={async (e) => {
        e.preventDefault();
        const nouveau = !coche;
        setLocal(nouveau);
        const r = await changerStatutTache(id, nouveau ? "termine" : "a_faire");
        if (r?.erreur) setLocal(!nouveau);
        else demarrer(() => router.refresh());
      }}
      className={cn(
        "press relative z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors duration-150 before:absolute before:-inset-2 before:content-['']",
        coche ? "border-ok bg-ok text-white" : "border-line-strong bg-surface hover:border-ok",
      )}
    >
      {coche ? <Check className="h-3.5 w-3.5" strokeWidth={3.5} /> : null}
    </button>
  );
}
