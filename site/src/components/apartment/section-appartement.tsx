"use client";

import { Check, MousePointerClick, RotateCcw, X } from "lucide-react";
import dynamic from "next/dynamic";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Revele } from "@/components/ui/revele";
import { Surtitre } from "@/components/ui/surtitre";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { GROUPES_SERVICES, SERVICES, type GroupeService } from "@/lib/content";
import { useVisible } from "@/lib/use-visible";
import { PlanSecours } from "./plan-secours";

const SceneAppartement = dynamic(() => import("./scene"), { ssr: false, loading: () => <Chargement /> });

function Chargement() {
  return (
    <div className="grid h-full place-items-center">
      <div className="flex flex-col items-center gap-3 text-[0.8rem] text-papier/50">
        <span className="h-10 w-10 animate-spin rounded-full border border-or/20 border-t-or" />
        Préparation de la maquette 3D…
      </div>
    </div>
  );
}

/** Si la 3D échoue (pilote graphique, mémoire), la section reste utilisable avec le plan. */
class FiletDeSecurite extends Component<{ secours: ReactNode; children: ReactNode }, { erreur: boolean }> {
  state = { erreur: false };
  static getDerivedStateFromError() {
    return { erreur: true };
  }
  render() {
    return this.state.erreur ? this.props.secours : this.props.children;
  }
}

function webglDisponible() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function SectionAppartement() {
  const [groupe, setGroupe] = useState<GroupeService>("revenus");
  const [selection, setSelection] = useState<string | null>(null);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [leger, setLeger] = useState(false);
  const [refProche, proche] = useVisible<HTMLDivElement>({ seuil: 0, marge: "600px 0px 600px 0px" });
  const [refEcran, aLEcran] = useVisible<HTMLDivElement>({ seuil: 0.05, unique: false });

  useEffect(() => {
    queueMicrotask(() => {
      setWebgl(webglDisponible());
      setLeger(window.matchMedia("(max-width: 767px), (pointer: coarse)").matches);
    });
  }, []);

  const ancres = useRef<Record<string, HTMLElement | null>>({});
  const services = useMemo(() => SERVICES.filter((s) => s.groupe === groupe), [groupe]);
  const actif = SERVICES.find((s) => s.id === selection) ?? null;

  function choisir(id: string) {
    setSelection(id);
    track("ServiceHotspotClicked", { service: id });
  }

  const secours = <PlanSecours services={services} selection={selection} onChoisir={choisir} />;

  return (
    <section id="appartement" aria-labelledby="titre-appartement" className="relative scroll-mt-20 bg-charbon py-20 md:py-28">
      <div className="mx-auto max-w-[88rem] px-5 md:px-10">
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <Revele className="md:col-span-7">
            <Surtitre>Notre gestion, pièce par pièce</Surtitre>
            <h2 id="titre-appartement" className="titre mt-4 text-[2.3rem] text-papier md:text-[3.4rem]">
              Chaque opération a sa place. Et son responsable.
            </h2>
          </Revele>
          <Revele className="md:col-span-5" delai={150}>
            <p className="text-[1rem] leading-relaxed text-papier/65">
              Explorez l&apos;appartement : chaque point lumineux correspond à un service que nous prenons en charge. Faites pivoter la maquette, puis touchez un point.
            </p>
          </Revele>
        </div>

        <div role="tablist" aria-label="Familles de services" className="mt-10 flex gap-2 overflow-x-auto pb-1">
          {GROUPES_SERVICES.map((g) => (
            <button
              key={g.id}
              role="tab"
              type="button"
              aria-selected={groupe === g.id}
              onClick={() => {
                setGroupe(g.id);
                setSelection(null);
              }}
              className={cn("h-11 shrink-0 rounded-full border px-5 text-[0.88rem] transition-colors", groupe === g.id ? "border-or bg-bouton text-sur-accent" : "border-white/15 text-papier/70 hover:border-or/60 hover:text-papier")}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div ref={refProche} className="relative mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div ref={refEcran} className="relative h-[62svh] min-h-[22rem] overflow-hidden rounded-[1.75rem] border border-white/[0.07] bg-graphite md:h-[40rem]">
            {webgl === false ? (
              secours
            ) : proche && webgl ? (
              <FiletDeSecurite secours={secours}>
                <SceneAppartement ancres={ancres} selection={selection} enPause={!aLEcran} leger={leger} />
                {/* Points de service : boutons HTML que la scène positionne sur la maquette */}
                <div className="pointer-events-none absolute inset-0">
                  {services.map((s, i) => (
                    <button
                      key={s.id}
                      ref={(el) => {
                        ancres.current[s.id] = el;
                        return () => {
                          delete ancres.current[s.id];
                        };
                      }}
                      type="button"
                      onClick={() => choisir(s.id)}
                      aria-label={s.titre}
                      aria-pressed={selection === s.id}
                      style={{ visibility: "hidden" }}
                      className={cn(
                        "group pointer-events-auto absolute top-0 left-0 grid h-10 w-10 place-items-center rounded-full border text-[0.78rem] font-semibold transition-[background-color,color,box-shadow] duration-300",
                        selection === s.id ? "border-papier bg-bouton text-sur-accent shadow-[0_0_0_6px_rgb(182_154_112/0.25)]" : "border-or/80 bg-charbon/85 text-or backdrop-blur hover:bg-or hover:text-charbon",
                      )}
                    >
                      {selection !== s.id ? <span className="absolute inset-0 rounded-full [animation:pulse-or_2.2s_ease-out_infinite]" /> : null}
                      {i + 1}
                      <span className="pointer-events-none absolute top-1/2 left-12 hidden -translate-y-1/2 rounded-full bg-charbon/90 px-2.5 py-1 text-[0.72rem] font-medium whitespace-nowrap text-papier opacity-0 transition-opacity group-hover:opacity-100 md:block">
                        {s.titre}
                      </span>
                    </button>
                  ))}
                </div>
              </FiletDeSecurite>
            ) : (
              <Chargement />
            )}
            <div className="pointer-events-none absolute top-4 left-4 flex items-center gap-2 rounded-full bg-charbon/70 px-3 py-1.5 text-[0.72rem] text-papier/60 backdrop-blur">
              <MousePointerClick className="h-3.5 w-3.5 text-or" /> Maquette 3D interactive
            </div>
            {selection ? (
              <button
                type="button"
                onClick={() => setSelection(null)}
                className="absolute top-4 right-4 inline-flex h-10 items-center gap-2 rounded-full bg-charbon/80 px-4 text-[0.8rem] text-papier/80 backdrop-blur hover:text-papier"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Vue d&apos;ensemble
              </button>
            ) : null}
          </div>

          {/* Panneau d'information du service choisi */}
          <aside aria-live="polite" className="rounded-[1.75rem] border border-white/[0.07] bg-graphite p-6 md:p-7">
            {actif ? (
              <div key={actif.id} className="[animation:entree-bas_0.6s_var(--ease-cine)_both]">
                <div className="flex items-start justify-between gap-4">
                  <p className="surtitre text-or">{GROUPES_SERVICES.find((g) => g.id === actif.groupe)?.label}</p>
                  <button type="button" onClick={() => setSelection(null)} aria-label="Fermer" className="-m-2 grid h-10 w-10 place-items-center rounded-full text-papier/50 hover:text-papier">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="titre mt-3 text-[2rem] text-papier">{actif.titre}</h3>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-papier/65">{actif.description}</p>
                <p className="mt-5 rounded-2xl border border-or/25 bg-or/[0.07] px-4 py-3 text-[0.92rem] text-or-clair">{actif.benefice}</p>
                <ol className="mt-6 space-y-3">
                  {actif.etapes.map((e, i) => (
                    <li key={e} className="flex items-center gap-3 text-[0.88rem] text-papier/80 opacity-0 [animation:entree-bas_0.6s_var(--ease-cine)_both]" style={{ animationDelay: `${300 + i * 450}ms` }}>
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-or/60 text-or">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      {e}
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div>
                <p className="surtitre text-or">{GROUPES_SERVICES.find((g) => g.id === groupe)?.label}</p>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-papier/60">Choisissez un service dans la maquette ou dans la liste.</p>
              </div>
            )}

            <ul className="mt-7 space-y-1.5 border-t border-white/[0.07] pt-5">
              {services.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => choisir(s.id)}
                    aria-pressed={selection === s.id}
                    className={cn("flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[0.9rem] transition-colors", selection === s.id ? "bg-white/[0.06] text-papier" : "text-papier/65 hover:bg-white/[0.04] hover:text-papier")}
                  >
                    <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[0.7rem] font-semibold", selection === s.id ? "border-or bg-bouton text-sur-accent" : "border-or/50 text-or")}>{i + 1}</span>
                    {s.titre}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
        <p className="mt-4 text-[0.75rem] text-papier/35">Maquette 3D simplifiée générée en temps réel : elle illustre nos services, elle ne représente pas un logement réel.</p>
      </div>
    </section>
  );
}
