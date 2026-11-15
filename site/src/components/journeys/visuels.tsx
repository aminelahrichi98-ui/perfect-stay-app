"use client";

/*
  Visuels animés des scènes des parcours. Chaque visuel reçoit `actif` (la scène est à l'écran)
  et joue sa petite démonstration une fois. Ce sont des ILLUSTRATIONS : aucun chiffre réel.
*/
import {
  BedDouble,
  BellRing,
  CalendarCheck,
  Camera,
  Check,
  ClipboardCheck,
  FileCheck2,
  Hammer,
  Headphones,
  Key,
  KeyRound,
  LogOut,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const Cadre = ({ children, className, legende = "Illustration" }: { children: React.ReactNode; className?: string; legende?: string }) => (
  <div className={cn("grain relative aspect-[5/4] w-full overflow-hidden rounded-[1.75rem] border border-white/[0.07] bg-graphite sm:aspect-[16/11]", className)}>
    {children}
    <span className="absolute bottom-4 left-5 text-[0.68rem] tracking-[0.18em] text-papier/35 uppercase">{legende}</span>
  </div>
);

/** Fait défiler les étapes 0 → n une fois la scène visible */
function useSequence(actif: boolean, n: number, pas = 650, depart = 400) {
  const [etape, setEtape] = useState(0);
  useEffect(() => {
    if (!actif) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setEtape(n), 0);
      return () => clearTimeout(t);
    }
    const minuteurs = Array.from({ length: n }, (_, i) => setTimeout(() => setEtape(i + 1), depart + i * pas));
    return () => minuteurs.forEach(clearTimeout);
  }, [actif, n, pas, depart]);
  return etape;
}

/* ---------------- Parcours longue durée ---------------- */

const MOIS = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];

export function VisuelVacance({ actif }: { actif: boolean }) {
  const etape = useSequence(actif, 4, 550);
  const vacants = [8, 9, 10];
  return (
    <Cadre>
      <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_80%_10%,rgb(217_205_189/0.12),transparent)]" />
      <div className="relative flex h-full flex-col justify-center gap-6 p-6 sm:p-10">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-2.5">
          {MOIS.map((m, i) => {
            const vacant = vacants.indexOf(i);
            const estVacant = vacant >= 0 && etape > vacant;
            return (
              <div
                key={m}
                className={cn(
                  "rounded-xl border px-2.5 py-3 transition-all duration-700",
                  estVacant ? "border-alerte/40 bg-alerte/10" : "border-white/[0.06] bg-charbon/60",
                )}
              >
                <p className="text-[0.7rem] text-papier/50">{m}</p>
                <p className={cn("mt-1 text-[0.78rem] font-medium transition-colors duration-700", estVacant ? "text-alerte" : "text-papier/80")}>{estVacant ? "Vacant" : "Loué"}</p>
              </div>
            );
          })}
        </div>
        <div className={cn("flex flex-wrap gap-2 transition-opacity duration-700", etape >= 4 ? "opacity-100" : "opacity-0")}>
          {["Charges de copropriété", "Taxe d'habitation", "Assurance", "Crédit immobilier"].map((c) => (
            <span key={c} className="rounded-full border border-white/10 px-3 py-1.5 text-[0.74rem] text-papier/65">
              {c} · continue
            </span>
          ))}
        </div>
      </div>
    </Cadre>
  );
}

export function VisuelImpaye({ actif }: { actif: boolean }) {
  const etape = useSequence(actif, 3, 1100, 700);
  const statut = [
    { label: "Attendu", classe: "border-white/15 text-papier/70" },
    { label: "En retard", classe: "border-or/50 text-or-clair" },
    { label: "En retard · relance", classe: "border-or/50 text-or-clair" },
    { label: "Impayé", classe: "border-alerte/60 bg-alerte/10 text-alerte" },
  ][etape];
  return (
    <Cadre>
      <div className="relative flex h-full items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-charbon/80 p-5 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.9)] sm:p-6">
          <p className="surtitre text-papier/45">Loyers · Exemple</p>
          <ul className="mt-4 divide-y divide-white/[0.06] text-[0.9rem]">
            {["Septembre", "Octobre"].map((m) => (
              <li key={m} className="flex items-center justify-between py-3">
                <span className="text-papier/70">Loyer de {m.toLowerCase()}</span>
                <span className="rounded-full border border-ok/40 px-2.5 py-1 text-[0.72rem] text-ok">Encaissé</span>
              </li>
            ))}
            <li className="flex items-center justify-between py-3">
              <span className="text-papier">Loyer de novembre</span>
              <span className={cn("rounded-full border px-2.5 py-1 text-[0.72rem] transition-all duration-500", statut.classe)}>{statut.label}</span>
            </li>
          </ul>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className={cn("h-full rounded-full transition-all duration-[1600ms] ease-[var(--ease-cine)]", etape >= 3 ? "w-2/3 bg-alerte/70" : "w-full bg-ok/70")} />
          </div>
          <p className="mt-2 text-[0.72rem] text-papier/45">Loyers encaissés sur le trimestre</p>
        </div>
      </div>
    </Cadre>
  );
}

export function VisuelRendement({ actif }: { actif: boolean }) {
  const criteres = [
    { label: "Flexibilité d'usage du bien", longue: 1, courte: 4 },
    { label: "Ajustement des prix à la demande", longue: 1, courte: 4 },
    { label: "Exposition à un impayé prolongé", longue: 3, courte: 1 },
    { label: "Charge de gestion pour vous", longue: 2, courte: 1 },
  ];
  return (
    <Cadre legende="Comparaison qualitative · à évaluer pour chaque bien">
      <div className="relative flex h-full flex-col justify-center gap-5 p-6 sm:p-10">
        <div className="flex justify-end gap-6 text-[0.72rem] text-papier/55">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-papier/40" /> Longue durée</span>
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-or" /> Courte durée gérée</span>
        </div>
        {criteres.map((c, i) => (
          <div key={c.label}>
            <p className="text-[0.84rem] text-papier/75">{c.label}</p>
            <div className="mt-2 space-y-1.5">
              {(["longue", "courte"] as const).map((k) => (
                <div key={k} className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className={cn("h-full rounded-full transition-[width] duration-[1400ms] ease-[var(--ease-cine)]", k === "courte" ? "bg-or" : "bg-papier/35")}
                    style={{ width: actif ? `${c[k] * 25}%` : "0%", transitionDelay: `${300 + i * 150}ms` }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Cadre>
  );
}

/* ---------------- Parcours courte durée ---------------- */

const NOTIFICATIONS: { icone: LucideIcon; qui: string; texte: string; quand: string }[] = [
  { icone: MessageCircle, qui: "Voyageur · Airbnb", texte: "Bonjour ! À quelle heure peut-on arriver ?", quand: "07:12" },
  { icone: KeyRound, qui: "Voyageur · Booking", texte: "Comment récupère-t-on les clés ?", quand: "09:40" },
  { icone: Sparkles, qui: "Ménage", texte: "Le ménage peut-il être fait avant 14 h ?", quand: "11:05" },
  { icone: Wrench, qui: "Voyageur", texte: "La climatisation de la chambre ne démarre pas.", quand: "15:27" },
  { icone: CalendarCheck, qui: "Nouvelle demande", texte: "Disponible du 12 au 16 ? Pour 4 personnes.", quand: "22:48" },
];

export function VisuelMessages({ actif }: { actif: boolean }) {
  const etape = useSequence(actif, NOTIFICATIONS.length, 700);
  return (
    <Cadre>
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_20%,rgb(185_138_172/0.10),transparent)]" />
      <div className="relative flex h-full items-center justify-center p-5 sm:p-10">
        <ul className="w-full max-w-sm space-y-2.5">
          {NOTIFICATIONS.map((n, i) => {
            const Icone = n.icone;
            return (
              <li
                key={i}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-charbon/85 p-3.5 shadow-[0_20px_40px_-24px_rgb(0_0_0/0.9)] backdrop-blur transition-all duration-700 ease-[var(--ease-cine)]",
                  etape > i ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                )}
                style={{ marginLeft: `${(i % 2) * 18}px` }}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-graphite-2 text-or">
                  <Icone className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between text-[0.7rem] text-papier/45">
                    <span>{n.qui}</span>
                    <span className="num">{n.quand}</span>
                  </span>
                  <span className="mt-0.5 block text-[0.86rem] leading-snug text-papier/85">{n.texte}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Cadre>
  );
}

const TACHES: { icone: LucideIcon; label: string }[] = [
  { icone: ShieldCheck, label: "Vérification d'identité" },
  { icone: FileCheck2, label: "Documents de voyage" },
  { icone: Key, label: "Coordination du check-in" },
  { icone: Sparkles, label: "Ménage" },
  { icone: Camera, label: "Contrôle qualité horodaté" },
  { icone: Wrench, label: "Maintenance" },
  { icone: Headphones, label: "Assistance voyageurs" },
  { icone: Hammer, label: "Constat des dommages" },
  { icone: LogOut, label: "Inspection de sortie" },
  { icone: ClipboardCheck, label: "Réclamations" },
];

export function VisuelOperations({ actif }: { actif: boolean }) {
  const etape = useSequence(actif, TACHES.length, 220, 300);
  return (
    <Cadre>
      <div className="relative h-full">
        <div className="absolute top-1/2 left-1/2 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-3xl border border-or/40 bg-charbon sm:h-28 sm:w-28">
          <BedDouble className="h-9 w-9 text-or" />
          <span className="absolute inset-0 rounded-3xl [animation:pulse-or_2.4s_ease-out_infinite]" />
        </div>
        {TACHES.map((t, i) => {
          const angle = (i / TACHES.length) * Math.PI * 2 - Math.PI / 2;
          const Icone = t.icone;
          return (
            <span
              key={t.label}
              className={cn(
                "absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-white/10 bg-graphite-2/90 px-2.5 py-1.5 text-[0.68rem] whitespace-nowrap text-papier/80 transition-all duration-700 ease-[var(--ease-cine)] sm:text-[0.74rem]",
                etape > i ? "scale-100 opacity-100" : "scale-75 opacity-0",
              )}
              style={{ left: `${50 + Math.cos(angle) * 38}%`, top: `${50 + Math.sin(angle) * 36}%` }}
            >
              <Icone className="h-3.5 w-3.5 text-or" />
              {t.label}
            </span>
          );
        })}
      </div>
    </Cadre>
  );
}

export function VisuelPortefeuille({ actif }: { actif: boolean }) {
  const etape = useSequence(actif, 3, 1000, 500);
  return (
    <Cadre>
      <div className="relative flex h-full items-center justify-center gap-3 p-6 sm:gap-5 sm:p-10">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn("w-1/3 max-w-44 transition-all duration-1000 ease-[var(--ease-cine)]", etape > i ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0")}
          >
            <div className="rounded-2xl border border-white/[0.08] bg-charbon/80 p-3 sm:p-4">
              <div className="grid aspect-[4/3] place-items-center rounded-xl bg-graphite-2">
                <BedDouble className="h-7 w-7 text-or/80" />
              </div>
              <p className="mt-3 text-[0.78rem] text-papier/80">Appartement {i + 1}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {Array.from({ length: 6 + i * 3 }).map((_, k) => (
                  <span key={k} className={cn("h-1.5 w-1.5 rounded-full transition-colors duration-700", etape > i ? (k % 4 === 0 ? "bg-alerte/80" : "bg-or/70") : "bg-white/10")} style={{ transitionDelay: `${k * 60}ms` }} />
                ))}
              </div>
            </div>
          </div>
        ))}
        <p className={cn("absolute top-6 right-6 text-right text-[0.78rem] text-papier/60 transition-opacity duration-700 sm:top-8 sm:right-8", etape >= 3 ? "opacity-100" : "opacity-0")}>
          <BellRing className="mb-1 ml-auto h-4 w-4 text-alerte" />
          Opérations à coordonner
          <br />
          sur trois adresses
        </p>
      </div>
    </Cadre>
  );
}

/* ---------------- Parcours bien vacant ---------------- */

export function VisuelDisponible({ actif }: { actif: boolean }) {
  return (
    <Cadre>
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_30%,rgb(217_205_189/0.16),transparent)]" />
      <div className="relative flex h-full items-center justify-center">
        <div className={cn("flex flex-col items-center gap-5 transition-all duration-[1400ms] ease-[var(--ease-cine)]", actif ? "opacity-100" : "translate-y-4 opacity-0")}>
          <span className="grid h-24 w-24 place-items-center rounded-full border border-or/50 bg-charbon">
            <Key className="h-10 w-10 text-or" />
          </span>
          <span className="rounded-full border border-white/10 px-4 py-2 text-[0.84rem] text-papier/75">Disponible · à exploiter</span>
        </div>
      </div>
    </Cadre>
  );
}

export function VisuelStrategies({ actif }: { actif: boolean }) {
  return (
    <Cadre legende="Deux stratégies, une évaluation">
      <svg viewBox="0 0 400 260" className="absolute inset-0 h-full w-full" aria-hidden>
        <g fill="none" stroke="#b98aac" strokeWidth="1.4" strokeOpacity="0.6">
          <path d="M200 70 C200 130 100 120 100 180" strokeDasharray="200" strokeDashoffset={actif ? 0 : 200} style={{ transition: "stroke-dashoffset 1.6s var(--ease-cine) .3s" }} />
          <path d="M200 70 C200 130 300 120 300 180" strokeDasharray="200" strokeDashoffset={actif ? 0 : 200} style={{ transition: "stroke-dashoffset 1.6s var(--ease-cine) .5s" }} />
        </g>
      </svg>
      <div className="absolute top-[14%] left-1/2 -translate-x-1/2 rounded-full border border-or/50 bg-charbon px-4 py-2 text-[0.8rem] text-papier">Votre bien</div>
      {[
        { x: "25%", t: "Longue durée", s: "Stabilité" },
        { x: "75%", t: "Courte durée", s: "Flexibilité" },
      ].map((b, i) => (
        <div
          key={b.t}
          className={cn("absolute top-[66%] -translate-x-1/2 rounded-2xl border border-white/10 bg-charbon/90 px-4 py-3 text-center transition-all duration-1000", actif ? "opacity-100" : "opacity-0")}
          style={{ left: b.x, transitionDelay: `${1200 + i * 200}ms` }}
        >
          <p className="text-[0.86rem] text-papier">{b.t}</p>
          <p className="text-[0.72rem] text-papier/50">{b.s}</p>
        </div>
      ))}
    </Cadre>
  );
}

export function VisuelPreparation({ actif }: { actif: boolean }) {
  const etapes = ["Équipement et linge", "Photos professionnelles", "Annonce et tarifs", "Procédures d'arrivée"];
  const etape = useSequence(actif, etapes.length, 600);
  return (
    <Cadre>
      <div className="relative flex h-full items-center justify-center p-6">
        <ul className="w-full max-w-xs space-y-3">
          {etapes.map((e, i) => (
            <li key={e} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-charbon/70 px-4 py-3">
              <span className={cn("grid h-6 w-6 place-items-center rounded-full border transition-all duration-500", etape > i ? "border-or bg-bouton text-white" : "border-white/20")}>
                {etape > i ? <Check className="h-3.5 w-3.5" /> : null}
              </span>
              <span className={cn("text-[0.88rem] transition-colors", etape > i ? "text-papier" : "text-papier/55")}>{e}</span>
            </li>
          ))}
        </ul>
      </div>
    </Cadre>
  );
}

export const VISUELS: Record<string, (p: { actif: boolean }) => React.JSX.Element> = {
  vacance: VisuelVacance,
  impaye: VisuelImpaye,
  rendement: VisuelRendement,
  messages: VisuelMessages,
  operations: VisuelOperations,
  portefeuille: VisuelPortefeuille,
  disponible: VisuelDisponible,
  strategies: VisuelStrategies,
  preparation: VisuelPreparation,
};

/** Scène média Higgsfield correspondante (si la vidéo est livrée, elle remplace le visuel) */
export const SCENE_MEDIA: Record<string, string | undefined> = {
  vacance: "vacance",
  impaye: "incertitude",
  messages: "messages",
  operations: "operations",
  portefeuille: "portefeuille",
};
