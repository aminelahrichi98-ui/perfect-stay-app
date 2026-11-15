"use client";

import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { PROFILS, type Profil } from "@/lib/content";
import { useExperience } from "@/lib/experience";

/** Petites scènes dessinées propres à chaque carte (elles bougent au survol). */
function IllustrationLongue() {
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
      <rect x="62" y="14" width="76" height="98" rx="3" fill="#26292d" stroke="#b69a70" strokeOpacity="0.5" />
      <rect x="74" y="28" width="52" height="58" rx="2" fill="#1c1f22" />
      <circle cx="126" cy="66" r="3" fill="#b69a70" />
      <g stroke="#d9cdbd" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round">
        <path d="M150 40h34M150 50h26M150 60h30" />
      </g>
      <rect x="146" y="30" width="44" height="44" rx="3" fill="none" stroke="#d9cdbd" strokeOpacity="0.35" />
      <path d="M156 84 l6 6 l12 -14" fill="none" stroke="#b69a70" strokeWidth="2" />
    </svg>
  );
}
function IllustrationCourte() {
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
      <rect x="30" y="16" width="140" height="92" rx="6" fill="#26292d" stroke="#b69a70" strokeOpacity="0.45" />
      {Array.from({ length: 21 }).map((_, i) => {
        const x = 40 + (i % 7) * 18;
        const y = 34 + Math.floor(i / 7) * 22;
        const reserve = [2, 3, 4, 8, 9, 10, 11, 15, 16, 19].includes(i);
        return <rect key={i} x={x} y={y} width="14" height="16" rx="2.5" fill={reserve ? "#b69a70" : "#1c1f22"} fillOpacity={reserve ? 0.85 : 1} />;
      })}
    </svg>
  );
}

const ORDRE: { id: Exclude<Profil, "vacant">; Illustration: () => React.JSX.Element }[] = [
  { id: "longue", Illustration: IllustrationLongue },
  { id: "courte", Illustration: IllustrationCourte },
];

export function ChoixProfil() {
  const { profil, choisirProfil } = useExperience();

  function choisir(p: Profil) {
    choisirProfil(p);
    // Laisse le parcours se monter, puis l'amène à l'écran
    requestAnimationFrame(() => document.getElementById("parcours")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <fieldset>
      <legend className="titre mb-5 text-[1.55rem] text-papier md:text-[1.8rem]">Comment exploitez-vous votre appartement aujourd&apos;hui ?</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {ORDRE.map(({ id, Illustration }) => {
          const actif = profil === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={actif}
              onClick={() => choisir(id)}
              className={cn(
                "group relative flex items-center gap-4 overflow-hidden rounded-2xl border p-3 pr-5 text-left transition-[border-color,background-color,transform,box-shadow] duration-500 ease-[var(--ease-cine)]",
                "hover:-translate-y-1 hover:shadow-[0_24px_60px_-28px_rgb(0_0_0/0.9)] focus-visible:-translate-y-1",
                actif ? "border-or bg-graphite" : "border-white/10 bg-graphite/70 backdrop-blur hover:border-or/60 hover:bg-graphite",
              )}
            >
              <span className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-charbon md:h-24 md:w-32">
                <span className="absolute inset-0 transition-transform duration-700 ease-[var(--ease-cine)] group-hover:scale-110 group-hover:-rotate-1">
                  <Illustration />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[1.02rem] font-semibold text-papier">{PROFILS[id].titre}</span>
                <span className="mt-1 block text-[0.86rem] leading-snug text-papier/60">{PROFILS[id].texte}</span>
              </span>
              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors", actif ? "border-or bg-or text-charbon" : "border-white/15 text-papier/70 group-hover:border-or group-hover:text-or")}>
                {actif ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-pressed={profil === "vacant"}
        onClick={() => choisir("vacant")}
        className={cn("mt-4 inline-flex min-h-11 items-center gap-2 text-[0.9rem] underline-offset-[6px] transition-colors hover:text-papier", profil === "vacant" ? "text-or underline decoration-or" : "text-papier/65 underline decoration-papier/25")}
      >
        {profil === "vacant" ? <Check className="h-4 w-4" /> : null}
        {PROFILS.vacant.texte}
      </button>
    </fieldset>
  );
}
