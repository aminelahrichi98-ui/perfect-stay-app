"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Notice } from "@/components/ui";
import { cn } from "@/lib/cn";
import { progression } from "@/lib/operations";
import { ajouterSousTache, cocherSousTache, supprimerSousTache } from "../actions";

type Sous = { id: string; libelle: string; fait: boolean };

export function SousTaches({ tacheId, sous, modifiable }: { tacheId: string; sous: Sous[]; modifiable: boolean }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const champ = useRef<HTMLInputElement>(null);
  const [local, setLocal] = useState<Record<string, boolean>>({});
  const [erreur, setErreur] = useState("");
  const faitDe = (s: Sous) => local[s.id] ?? s.fait;
  const faites = sous.filter(faitDe).length;

  async function cocher(s: Sous) {
    const nouveau = !faitDe(s);
    setLocal((l) => ({ ...l, [s.id]: nouveau }));
    const r = await cocherSousTache(s.id, nouveau);
    if (r?.erreur) {
      setLocal((l) => ({ ...l, [s.id]: !nouveau }));
      setErreur(r.erreur);
    } else demarrer(() => router.refresh());
  }
  function ajouter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const texte = champ.current?.value ?? "";
    if (!texte.trim()) return;
    setErreur("");
    demarrer(async () => {
      const r = await ajouterSousTache(tacheId, texte);
      if (r?.erreur) setErreur(r.erreur);
      else {
        if (champ.current) champ.current.value = "";
        router.refresh();
        champ.current?.focus();
      }
    });
  }
  function retirer(id: string) {
    demarrer(async () => {
      const r = await supprimerSousTache(id);
      if (r?.erreur) setErreur(r.erreur);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {sous.length ? (
        <div>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="font-medium">
              {faites} sur {sous.length}
            </span>
            <span className="num text-ink-3">{progression(faites, sous.length)} %</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
            <div className="h-full rounded-full bg-wine-600 transition-[width] duration-300 ease-[var(--ease-out)]" style={{ width: `${progression(faites, sous.length)}%` }} />
          </div>
        </div>
      ) : null}
      <ul className="divide-y divide-line">
        {sous.map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-1.5">
            <button
              type="button"
              role="checkbox"
              aria-checked={faitDe(s)}
              aria-label={s.libelle}
              disabled={!modifiable}
              onClick={() => cocher(s)}
              className={cn("press relative grid h-7 w-7 shrink-0 place-items-center rounded-md border-2 before:absolute before:-inset-1.5 before:content-['']", faitDe(s) ? "border-wine-600 bg-wine-600 text-white" : "border-line-strong bg-surface")}
            >
              {faitDe(s) ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
            </button>
            <span className={cn("min-w-0 flex-1 text-pretty", faitDe(s) && "text-ink-3 line-through")}>{s.libelle}</span>
            {modifiable ? (
              <button type="button" onClick={() => retirer(s.id)} disabled={enCours} aria-label={`Supprimer « ${s.libelle} »`} className="press grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-danger-bg hover:text-danger">
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {modifiable ? (
        <form onSubmit={ajouter} className="flex gap-2">
          <input ref={champ} placeholder="Ajouter une sous-tâche…" maxLength={200} autoComplete="off" aria-label="Nouvelle sous-tâche" className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-3.5 shadow-card focus:border-wine-500 focus:ring-4 focus:ring-wine-500/15 focus:outline-none" />
          <button type="submit" disabled={enCours} aria-label="Ajouter" className="press grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-wine-600 text-white shadow-card hover:bg-wine-700 disabled:opacity-60">
            <Plus className="h-5 w-5" />
          </button>
        </form>
      ) : null}
      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
    </div>
  );
}
