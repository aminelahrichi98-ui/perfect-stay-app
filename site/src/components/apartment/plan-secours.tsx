"use client";

/*
  Plan isométrique de secours (sans WebGL) : même appartement, mêmes points de service,
  pour que la section reste interactive sur tout appareil.
*/
import { cn } from "@/lib/cn";
import type { Service } from "@/lib/content";
import { POSITIONS_PLAN } from "./positions-plan";

export function PlanSecours({ services, selection, onChoisir }: { services: Service[]; selection: string | null; onChoisir: (id: string) => void }) {
  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 600 420" className="absolute inset-0 h-full w-full" aria-hidden>
        <g transform="translate(300 90) scale(1 0.58) rotate(45)" fill="none" stroke="#b69a70" strokeOpacity="0.55" strokeWidth="1.6">
          <rect x="-180" y="-120" width="360" height="240" fill="#1c1f22" />
          <path d="M30 -120 V15 H180 M105 15 V120" />
          <rect x="-170" y="-110" width="96" height="20" fill="#26292d" />
          <rect x="-110" y="40" width="80" height="26" fill="#26292d" />
          <rect x="60" y="-100" width="56" height="64" fill="#26292d" />
        </g>
      </svg>
      {services.map((s, i) => {
        const p = POSITIONS_PLAN[s.id];
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChoisir(s.id)}
            aria-label={s.titre}
            aria-pressed={selection === s.id}
            className={cn(
              "absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-[0.75rem] font-semibold",
              selection === s.id ? "border-papier bg-bouton text-sur-accent" : "border-or bg-charbon text-or",
            )}
            style={{ left: `${p[0]}%`, top: `${p[1]}%` }}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
