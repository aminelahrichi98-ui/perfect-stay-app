"use client";

import { Columns3, CalendarRange } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/cn";
import { memoriserVue } from "./actions";

type Option = { id: string; nom: string };

/** Choix de la vue (mémorisé) et filtres par pôle, responsable et logement. */
export function BarreTaches({
  vue,
  pole,
  responsable,
  logement,
  poles,
  responsables,
  logements,
  semaine,
}: {
  vue: "semaine" | "kanban";
  pole: string;
  responsable: string;
  logement: string;
  poles: readonly string[];
  responsables: Option[];
  logements: Option[];
  semaine: string;
}) {
  const router = useRouter();
  const [, demarrer] = useTransition();

  const aller = (changes: Record<string, string>) => {
    const p = new URLSearchParams();
    const etat: Record<string, string> = { vue, pole, responsable, logement, ...(vue === "semaine" && semaine ? { semaine } : {}), ...changes };
    for (const [k, v] of Object.entries(etat)) if (v) p.set(k, v);
    router.push(`/taches?${p}`);
  };
  const choisirVue = (v: "semaine" | "kanban") => {
    demarrer(() => memoriserVue(v));
    aller({ vue: v, semaine: v === "semaine" ? semaine : "" });
  };
  const SELECT = "h-11 max-w-full min-w-0 rounded-xl border border-line-strong bg-surface px-3 pr-8 text-[0.95rem] font-medium shadow-card focus:border-wine-500 focus:ring-4 focus:ring-wine-500/15 focus:outline-none";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="radiogroup" aria-label="Vue des tâches" className="inline-flex rounded-xl border border-line-strong bg-surface p-1 shadow-card">
        {[
          { v: "semaine" as const, label: "Semaine", Icone: CalendarRange },
          { v: "kanban" as const, label: "Kanban", Icone: Columns3 },
        ].map(({ v, label, Icone }) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={vue === v}
            onClick={() => choisirVue(v)}
            className={cn("press inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-medium", vue === v ? "bg-wine-600 text-white" : "text-ink-2 hover:bg-sunken")}
          >
            <Icone className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      <label>
        <span className="sr-only">Filtrer par pôle</span>
        <select value={pole} onChange={(e) => aller({ pole: e.target.value })} className={SELECT}>
          <option value="">Tous les pôles</option>
          {poles.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Filtrer par responsable</span>
        <select value={responsable} onChange={(e) => aller({ responsable: e.target.value })} className={SELECT}>
          <option value="">Tous les responsables</option>
          <option value="moi">Mes tâches</option>
          <option value="aucun">Non attribuées</option>
          {responsables.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nom}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Filtrer par logement</span>
        <select value={logement} onChange={(e) => aller({ logement: e.target.value })} className={SELECT}>
          <option value="">Tous les logements</option>
          {logements.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nom}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
