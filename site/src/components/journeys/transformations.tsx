"use client";

/*
  Scènes de bascule vers Perfect Stay.
  - Appartement : la pièce vide se meuble progressivement (même cadrage, même architecture).
  - Système : les tâches éparpillées se rangent dans un tableau de pilotage.
*/
import { Camera, FileCheck2, Headphones, Key, Sparkles, Wrench, Hammer, ShieldCheck, CalendarCheck, LogOut, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const or = "#230c1f";

export function TransformationAppartement({ actif }: { actif: boolean }) {
  const meuble = (i: number) => ({
    style: { transition: "opacity 1.2s var(--ease-cine), transform 1.4s var(--ease-cine)", transitionDelay: `${600 + i * 260}ms` },
    className: actif ? "opacity-100" : "opacity-0 translate-y-3",
  });
  return (
    <div className="grain relative aspect-[16/10] w-full overflow-hidden rounded-[1.75rem] border border-papier/[0.07] bg-graphite">
      <svg viewBox="0 0 800 500" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="t-vitre" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f5f2ec" stopOpacity="0.5" />
            <stop offset="1" stopColor="#d9cdbd" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="t-faisceau" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f5f2ec" stopOpacity={actif ? 0.2 : 0.08} style={{ transition: "stop-opacity 2s" }} />
            <stop offset="1" stopColor="#f5f2ec" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Architecture : identique avant et après */}
        <path d="M0 380 L800 350 L800 500 L0 500Z" fill="#e6ddd2" />
        <rect x="560" y="70" width="170" height="270" fill="url(#t-vitre)" />
        <path d="M645 70V340M560 190H730" stroke="#efe8e0" strokeWidth="4" />
        <path d="M560 340 L730 335 L600 500 L320 500Z" fill="url(#t-faisceau)" />
        <g fill="none" stroke={or} strokeOpacity="0.45">
          <path d="M0 60 L800 30 M0 380 L800 350 M120 55 V375" />
        </g>
        {/* Mobilier qui apparaît */}
        <g {...meuble(0)}>
          <ellipse cx="380" cy="440" rx="240" ry="30" fill="#3a352e" opacity="0.8" />
        </g>
        <g {...meuble(1)} fill="#d9cdbd">
          <path d="M190 320 h300 a14 14 0 0 1 14 14 v46 h-328 v-46 a14 14 0 0 1 14 -14Z" opacity="0.9" />
          <path d="M200 290 h280 a12 12 0 0 1 12 12 v26 h-304 v-26 a12 12 0 0 1 12 -12Z" fill="#ece7de" />
          <rect x="230" y="300" width="60" height="30" rx="8" fill="#230c1f" />
          <rect x="400" y="300" width="60" height="30" rx="8" fill="#4b2742" />
        </g>
        <g {...meuble(2)}>
          <rect x="330" y="405" width="140" height="10" rx="5" fill="#4b2742" />
          <path d="M345 415 v24 M455 415 v24" stroke="#4b2742" strokeWidth="4" />
        </g>
        <g {...meuble(3)}>
          <rect x="200" y="140" width="130" height="95" fill="#efe8e0" stroke={or} strokeOpacity="0.6" />
          <path d="M215 220 C250 170 280 200 315 155" stroke={or} fill="none" strokeOpacity="0.6" />
        </g>
        <g {...meuble(4)}>
          <path d="M420 30 V150" stroke={or} strokeOpacity="0.7" />
          <path d="M392 150 Q420 125 448 150Z" fill={or} />
          <ellipse cx="420" cy="165" rx="70" ry="18" fill="#4b2742" opacity="0.18" />
        </g>
        <g {...meuble(5)}>
          <rect x="520" y="330" width="40" height="45" rx="6" fill="#e6ddd2" stroke={or} strokeOpacity="0.4" />
          <g fill="#55604f">
            <ellipse cx="530" cy="305" rx="18" ry="36" transform="rotate(-20 530 305)" />
            <ellipse cx="552" cy="298" rx="16" ry="40" transform="rotate(18 552 298)" />
          </g>
        </g>
      </svg>
      <div className="absolute top-5 left-5 flex gap-2 text-[0.7rem] tracking-[0.16em] uppercase">
        <span className={cn("rounded-full border px-3 py-1 transition-colors duration-700", actif ? "border-papier/10 text-papier/40" : "border-papier/40 text-papier/80")}>Avant</span>
        <span className={cn("rounded-full border px-3 py-1 transition-colors delay-[1800ms] duration-700", actif ? "border-or text-or" : "border-papier/10 text-papier/40")}>Perfect Stay</span>
      </div>
    </div>
  );
}

const ELEMENTS: { icone: LucideIcon; label: string; x: number; y: number }[] = [
  { icone: ShieldCheck, label: "Identité", x: 12, y: 18 },
  { icone: Key, label: "Check-in", x: 70, y: 12 },
  { icone: Sparkles, label: "Ménage", x: 38, y: 72 },
  { icone: Camera, label: "Contrôle photo", x: 82, y: 58 },
  { icone: Wrench, label: "Maintenance", x: 8, y: 62 },
  { icone: Headphones, label: "Assistance", x: 55, y: 38 },
  { icone: Hammer, label: "Dommages", x: 25, y: 40 },
  { icone: CalendarCheck, label: "Réservations", x: 62, y: 82 },
  { icone: LogOut, label: "Sortie", x: 88, y: 30 },
  { icone: FileCheck2, label: "Documents", x: 45, y: 10 },
];

export function TransformationSysteme({ actif }: { actif: boolean }) {
  return (
    <div className="grain relative aspect-[16/10] w-full overflow-hidden rounded-[1.75rem] border border-papier/[0.07] bg-graphite">
      {/* Cadre du tableau de pilotage qui se dessine */}
      <div className={cn("absolute inset-[8%] rounded-2xl border transition-all delay-500 duration-1000", actif ? "border-or/40 bg-charbon/70" : "border-transparent")}>
        <div className={cn("flex items-center justify-between border-b px-4 py-3 text-[0.72rem] transition-all delay-700 duration-1000", actif ? "border-papier/[0.07] opacity-100" : "border-transparent opacity-0")}>
          <span className="tracking-[0.16em] text-papier/60 uppercase">Exploitation centralisée</span>
          <span className="flex items-center gap-1.5 text-ok">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Sous contrôle
          </span>
        </div>
      </div>
      {ELEMENTS.map((e, i) => {
        const Icone = e.icone;
        const col = i % 5;
        const ligne = Math.floor(i / 5);
        const cible = { x: 18 + col * 16, y: 46 + ligne * 22 };
        const pos = actif ? cible : { x: e.x, y: e.y };
        return (
          <span
            key={e.label}
            className={cn(
              "absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[0.68rem] whitespace-nowrap transition-all duration-[1400ms] ease-[var(--ease-cine)] sm:text-[0.76rem]",
              actif ? "border-or/30 bg-graphite-2 text-papier" : "border-alerte/25 bg-graphite-2/80 text-papier/70",
            )}
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, transitionDelay: `${200 + i * 70}ms`, rotate: actif ? "0deg" : `${(i % 3) * 6 - 6}deg` }}
          >
            <Icone className={cn("h-3.5 w-3.5", actif ? "text-ok" : "text-alerte/80")} />
            {e.label}
          </span>
        );
      })}
    </div>
  );
}
