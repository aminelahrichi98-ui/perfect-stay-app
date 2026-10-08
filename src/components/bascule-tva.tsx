"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { COOKIE_TVA, type ModeTva } from "@/lib/mode-tva";
import { cn } from "@/lib/cn";

/** Mémorise le choix dans un cookie (lu côté serveur à chaque page), pour un an. */
function memoriserMode(mode: ModeTva) {
  document.cookie = `${COOKIE_TVA}=${mode}; path=/; max-age=31536000; samesite=lax`;
}

/** Petit interrupteur HT | TTC : change l'affichage des commissions partout dans la comptabilité. */
export function BasculeTva({ mode }: { mode: ModeTva }) {
  const router = useRouter();
  const [choix, setChoix] = useState<ModeTva>(mode);
  const [, demarrer] = useTransition();

  function choisir(nouveau: ModeTva) {
    if (nouveau === choix) return;
    setChoix(nouveau);
    memoriserMode(nouveau);
    demarrer(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-2.5">
      <span className="hidden text-sm text-ink-3 sm:inline" id="libelle-tva">
        Commissions affichées
      </span>
      <div
        role="group"
        aria-labelledby="libelle-tva"
        aria-label="Afficher les commissions hors taxe ou toutes taxes comprises"
        className="relative inline-grid h-11 w-32 grid-cols-2 rounded-xl border border-line-strong bg-sunken/70 p-1 text-sm font-semibold"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-surface shadow-card transition-transform duration-200 ease-[var(--ease-out)]"
          style={{ transform: choix === "ttc" ? "translateX(100%)" : "none" }}
        />
        {(["ht", "ttc"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={choix === m}
            onClick={() => choisir(m)}
            className={cn("press relative z-10 rounded-lg transition-colors duration-150", choix === m ? "text-wine-700" : "text-ink-3 hover:text-ink")}
          >
            {m.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
