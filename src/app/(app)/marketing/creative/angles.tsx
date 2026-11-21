"use client";

import { Images, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Badge, buttonClass, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { libelleSegment, statutAngle, STATUTS_ANGLE } from "@/lib/creative";
import { lienAngle, Vide } from "./elements";
import type { Angle } from "./donnees";
import { FormulaireAngle, type BoiteAngle } from "./formulaire-angle";

export function Angles({ angles, modifiable }: { angles: Angle[]; modifiable: boolean }) {
  const router = useRouter();
  const boite = useRef<BoiteAngle>(null);
  const [filtre, setFiltre] = useState("tous");
  const visibles = filtre === "tous" ? angles.filter((a) => a.statut !== "archived") : angles.filter((a) => a.statut === filtre);
  const compte = (s: string) => angles.filter((a) => a.statut === s).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par statut">
          {[{ value: "tous", label: "En cours" }, ...STATUTS_ANGLE].map((s) => (
            <button key={s.value} type="button" aria-pressed={filtre === s.value} onClick={() => setFiltre(s.value)} className={cn("press h-9 rounded-full border px-3.5 text-sm font-medium", filtre === s.value ? "border-wine-600 bg-wine-50 text-wine-800" : "border-line text-ink-2 hover:text-ink")}>
              {s.label}
              {s.value !== "tous" ? <span className="num ml-1.5 text-ink-3">{compte(s.value)}</span> : null}
            </button>
          ))}
        </div>
        {modifiable ? (
          <button type="button" onClick={() => boite.current?.ouvrir(null)} className={buttonClass("primary", "md")}>
            <Plus className="h-4 w-4" /> Nouvel angle
          </button>
        ) : null}
      </div>

      {visibles.length ? (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibles.map((a, i) => {
            const s = statutAngle(a.statut);
            return (
              <li key={a.id} className="enter" style={{ "--i": i } as React.CSSProperties}>
                <Link href={lienAngle(a.id)} className="press block h-full rounded-2xl focus-visible:outline-2">
                  <Card className="flex h-full flex-col p-5 transition-shadow hover:shadow-pop">
                    <div className="flex items-center justify-between gap-2">
                      <span className="num text-xs font-medium tracking-wide text-ink-3">{a.code}</span>
                      <Badge ton={s.ton}>{s.label}</Badge>
                    </div>
                    <h2 className="mt-3 font-display text-xl leading-tight font-semibold tracking-tight text-balance">{a.nom}</h2>
                    <p className="mt-1 text-sm text-ink-3">{libelleSegment(a.segment)}</p>
                    {a.hook ? <p className="mt-3 line-clamp-3 text-[0.95rem] text-ink-2 text-pretty">« {a.hook} »</p> : null}
                    <p className="mt-auto flex items-center gap-1.5 pt-4 text-sm text-ink-2">
                      <Images className="h-4 w-4 text-ink-3" />
                      <span className="num">{a.nbCreatives}</span> image{a.nbCreatives > 1 ? "s" : ""}
                    </p>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Vide titre={angles.length ? "Aucun angle avec ce statut" : "Aucun angle pour l'instant"}>
          Un angle, c&apos;est une façon de parler à un propriétaire : son problème, ce qu&apos;il lui coûte, votre accroche et votre réponse. Chaque angle reçoit ensuite plusieurs images à tester.
        </Vide>
      )}
      <FormulaireAngle ref={boite} apresCreation={(id) => router.push(lienAngle(id))} />
    </div>
  );
}
