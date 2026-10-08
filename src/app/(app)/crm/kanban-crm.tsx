"use client";

import { MapPin, Phone, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { ageLead, ETAPES_CRM, lienAppel, libelleSource } from "@/lib/crm";
import { initiales } from "@/lib/taches";
import { changerEtape } from "./actions";

export type CarteLead = {
  id: string;
  nom: string;
  telephone: string;
  ville: string;
  type_bien: string;
  source: string;
  etape: string;
  responsableNom: string | null;
  created_at: string;
  dernierAppel: string | null;
};

/** Pipeline : une colonne par étape. Glisser-déposer sur ordinateur, menu « Étape » sur téléphone. */
export function KanbanCrm({ leads, peutModifier }: { leads: CarteLead[]; peutModifier: boolean }) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const [deplaces, setDeplaces] = useState<Record<string, string>>({});
  const [survol, setSurvol] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");
  const etapeDe = (l: CarteLead) => deplaces[l.id] ?? l.etape;

  async function deplacer(id: string, etape: string) {
    const lead = leads.find((l) => l.id === id);
    if (!lead || etapeDe(lead) === etape) return;
    setErreur("");
    setDeplaces((d) => ({ ...d, [id]: etape }));
    const r = await changerEtape(id, etape);
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
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 2xl:mx-0 2xl:grid 2xl:grid-cols-7 2xl:overflow-visible 2xl:px-0">
        {ETAPES_CRM.map((e) => {
          const colonne = leads.filter((l) => etapeDe(l) === e.value);
          return (
            <section
              key={e.value}
              aria-labelledby={`etape-${e.value}`}
              onDragOver={(ev) => {
                if (!peutModifier) return;
                ev.preventDefault();
                setSurvol(e.value);
              }}
              onDragLeave={() => setSurvol((v) => (v === e.value ? null : v))}
              onDrop={(ev) => {
                ev.preventDefault();
                setSurvol(null);
                const id = ev.dataTransfer.getData("text/plain");
                if (id) deplacer(id, e.value);
              }}
              className={cn("w-[16.5rem] shrink-0 snap-start rounded-2xl bg-sunken/70 p-2.5 transition-colors duration-150 2xl:w-auto", survol === e.value && "bg-wine-50 ring-2 ring-wine-300")}
            >
              <header className="mb-2.5 flex items-center justify-between px-1.5">
                <h2 id={`etape-${e.value}`} className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", e.ton === "ok" ? "bg-ok" : e.ton === "danger" ? "bg-danger" : e.ton === "marque" ? "bg-wine-600" : e.ton === "attention" ? "bg-warn" : "bg-ink-3")} aria-hidden="true" />
                  <span className="truncate">{e.label}</span>
                  <span className="num rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink-3">{colonne.length}</span>
                </h2>
                {peutModifier && e.value === "nouveau" ? (
                  <Link href="/crm/nouveau" aria-label="Ajouter un lead" className="press grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-surface hover:text-ink">
                    <Plus className="h-4 w-4" />
                  </Link>
                ) : null}
              </header>
              <ul className="space-y-2">
                {colonne.map((l) => {
                  const appel = lienAppel(l.telephone);
                  return (
                    <li key={l.id} draggable={peutModifier} onDragStart={(ev) => ev.dataTransfer.setData("text/plain", l.id)} className={peutModifier ? "cursor-grab active:cursor-grabbing" : undefined}>
                      <div className="relative rounded-xl border border-line bg-surface p-3 shadow-card transition-[border-color,box-shadow] duration-150 hover:border-aub-300 hover:shadow-pop">
                        <Link href={`/crm/${l.id}`} className="block font-medium after:absolute after:inset-0 after:content-['']">
                          {l.nom}
                        </Link>
                        <p className="relative mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.8rem] text-ink-3">
                          {l.ville ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {l.ville}
                            </span>
                          ) : null}
                          {l.type_bien ? <span>{l.type_bien}</span> : null}
                        </p>
                        <p className="relative mt-2 text-[0.75rem] text-ink-3">
                          {libelleSource(l.source)} · {ageLead(l.created_at)}
                          {l.dernierAppel ? <span className="block">Appelé {ageLead(l.dernierAppel)}</span> : null}
                        </p>
                        {appel || l.responsableNom ? (
                          <div className="relative mt-2 flex items-center justify-between gap-2">
                            {appel ? (
                              <a href={appel} aria-label={`Appeler ${l.nom}`} className="press relative z-10 inline-flex h-9 items-center gap-1.5 rounded-full bg-ok-bg px-3 text-sm font-medium text-ok before:absolute before:-inset-1 before:content-['']">
                                <Phone className="h-4 w-4" /> Appeler
                              </a>
                            ) : (
                              <span />
                            )}
                            {l.responsableNom ? (
                              <span title={l.responsableNom} className="grid h-6 w-6 place-items-center rounded-full bg-wine-100 text-[0.65rem] font-semibold text-wine-800">
                                {initiales(l.responsableNom)}
                                <span className="sr-only">{l.responsableNom}</span>
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      {peutModifier ? (
                        <label className="mt-1 flex items-center gap-2 px-1 text-xs text-ink-3 pointer-fine:sr-only focus-within:not-sr-only">
                          <span>Étape</span>
                          <select value={etapeDe(l)} onChange={(ev) => deplacer(l.id, ev.target.value)} aria-label={`Changer l'étape de ${l.nom}`} className="h-8 rounded-md border border-line-strong bg-surface px-2 text-xs font-medium text-ink-2">
                            {ETAPES_CRM.map((x) => (
                              <option key={x.value} value={x.value}>
                                {x.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                    </li>
                  );
                })}
                {!colonne.length ? <li className="rounded-xl border border-dashed border-line-strong px-3 py-5 text-center text-sm text-ink-3">Aucun lead</li> : null}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
