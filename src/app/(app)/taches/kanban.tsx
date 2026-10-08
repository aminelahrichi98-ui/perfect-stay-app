"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { comparerTaches, STATUTS_TACHE } from "@/lib/taches";
import { changerStatutTache } from "./actions";
import { CarteTache, type CarteData } from "./carte-tache";

/** Kanban : une colonne par statut. Glisser-déposer sur ordinateur, menu « Déplacer vers » partout (téléphone compris). */
export function Kanban({ taches, aujourdhui, peutModifier, filtresUrl }: { taches: CarteData[]; aujourdhui: string; peutModifier: boolean; filtresUrl: string }) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const [deplaces, setDeplaces] = useState<Record<string, string>>({});
  const [survol, setSurvol] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");

  const statutDe = (t: CarteData) => deplaces[t.id] ?? t.statut;

  async function deplacer(id: string, statut: string) {
    const avant = taches.find((t) => t.id === id);
    if (!avant || statutDe(avant) === statut || avant.type !== "tache") return;
    setErreur("");
    setDeplaces((d) => ({ ...d, [id]: statut }));
    const r = await changerStatutTache(id, statut);
    if (r?.erreur) {
      setDeplaces((d) => {
        const { [id]: _retire, ...reste } = d;
        void _retire;
        return reste;
      });
      setErreur(r.erreur);
    } else demarrer(() => router.refresh());
  }

  return (
    <div>
      {erreur ? <p role="alert" className="mb-3 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{erreur}</p> : null}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {STATUTS_TACHE.map((s) => {
          const colonne = taches.filter((t) => statutDe(t) === s.value).map((t) => ({ ...t, statut: statutDe(t) })).sort(comparerTaches);
          return (
            <section
              key={s.value}
              aria-labelledby={`col-${s.value}`}
              onDragOver={(e) => {
                if (!peutModifier) return;
                e.preventDefault();
                setSurvol(s.value);
              }}
              onDragLeave={() => setSurvol((v) => (v === s.value ? null : v))}
              onDrop={(e) => {
                e.preventDefault();
                setSurvol(null);
                const id = e.dataTransfer.getData("text/plain");
                if (id) deplacer(id, s.value);
              }}
              className={cn(
                "w-[17.5rem] shrink-0 snap-start rounded-2xl bg-sunken/70 p-2.5 transition-colors duration-150 md:w-auto",
                survol === s.value && "bg-wine-50 ring-2 ring-wine-300",
              )}
            >
              <header className="mb-2.5 flex items-center justify-between px-1.5">
                <h2 id={`col-${s.value}`} className="flex items-center gap-2 text-sm font-semibold">
                  {s.label} <span className="num rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink-3">{colonne.length}</span>
                </h2>
                {peutModifier ? (
                  <Link href={`/taches/nouvelle?statut=${s.value}${filtresUrl}`} aria-label={`Ajouter une tâche « ${s.label} »`} className="press grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-surface hover:text-ink">
                    <Plus className="h-4 w-4" />
                  </Link>
                ) : null}
              </header>
              <ul className="space-y-2">
                {colonne.map((t) => (
                  <li
                    key={t.id}
                    draggable={peutModifier && t.type === "tache"}
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                    className={peutModifier && t.type === "tache" ? "cursor-grab active:cursor-grabbing" : undefined}
                  >
                    <CarteTache t={t} aujourdhui={aujourdhui} afficherStatut />
                    {peutModifier && t.type === "tache" ? (
                      <label className="mt-1 flex items-center gap-2 px-1 text-xs text-ink-3 pointer-fine:sr-only focus-within:not-sr-only">
                        <span>Déplacer vers</span>
                        <select
                          value={t.statut}
                          onChange={(e) => deplacer(t.id, e.target.value)}
                          aria-label={`Déplacer « ${t.titre} »`}
                          className="h-8 rounded-md border border-line-strong bg-surface px-2 text-xs font-medium text-ink-2"
                        >
                          {STATUTS_TACHE.map((x) => (
                            <option key={x.value} value={x.value}>
                              {x.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </li>
                ))}
                {!colonne.length ? <li className="rounded-xl border border-dashed border-line-strong px-3 py-6 text-center text-sm text-ink-3">Aucune tâche</li> : null}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
