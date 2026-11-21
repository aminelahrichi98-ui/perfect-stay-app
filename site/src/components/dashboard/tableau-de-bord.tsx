"use client";

import { BarChart3, Camera, CheckCircle2, CircleDot, Clock, FileText, FolderLock, Hammer, Info, KeyRound, LayoutGrid, MessageCircle, Receipt, Sparkles, Wrench, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Revele } from "@/components/ui/revele";
import { Surtitre } from "@/components/ui/surtitre";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { APPLICATION } from "@/lib/content";
import { DEMO_SYNC, type Operation } from "@/lib/demo";
import { useVisible } from "@/lib/use-visible";

type Onglet = "performance" | "operations" | "qualite" | "patrimoine";
const ONGLETS: { id: Onglet; label: string; icone: LucideIcon }[] = [
  { id: "performance", label: "Performance", icone: BarChart3 },
  { id: "operations", label: "Opérations", icone: LayoutGrid },
  { id: "qualite", label: "Qualité", icone: Camera },
  { id: "patrimoine", label: "Patrimoine", icone: FolderLock },
];

const mad = (n: number) => `${new Intl.NumberFormat("fr-FR").format(n).replace(/\s/g, " ")} MAD`;

function Kpi({ label, valeur, note }: { label: string; valeur: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-charbon/60 p-4">
      <p className="text-[0.72rem] text-papier/50">{label}</p>
      <p className="num mt-1.5 text-[1.1rem] font-semibold tracking-tight whitespace-nowrap text-papier sm:text-[1.35rem]">{valeur}</p>
      {note ? <p className="mt-0.5 text-[0.7rem] text-papier/40">{note}</p> : null}
    </div>
  );
}

function Performance() {
  const mois = DEMO_SYNC.mois;
  const [choisi, setChoisi] = useState(mois.length - 1);
  const max = Math.max(...mois.map((m) => m.revenus));
  const total = mois.reduce((s, m) => s + m.revenus, 0);
  const occMoy = Math.round(mois.reduce((s, m) => s + m.occupation, 0) / mois.length);
  const m = mois[choisi];
  const points = mois.map((x, i) => [(i / (mois.length - 1)) * 100, 100 - (x.revenus / max) * 82] as const);
  const ligne = points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={`Revenus · ${m.mois}`} valeur={mad(m.revenus)} />
        <Kpi label={`Occupation · ${m.mois}`} valeur={`${m.occupation} %`} />
        <Kpi label="Prix moyen par nuit" valeur={mad(m.prixMoyen)} />
        <Kpi label="Revenus sur 12 mois" valeur={mad(total)} note={`Occupation moyenne ${occMoy} %`} />
      </div>
      <div className="rounded-2xl border border-white/[0.06] bg-charbon/60 p-4">
        <div className="flex items-center justify-between text-[0.75rem] text-papier/55">
          <span>Revenus mensuels</span>
          <span>Touchez un mois</span>
        </div>
        <div className="relative mt-3 h-44">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            <defs>
              <linearGradient id="aire" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--color-or)" stopOpacity="0.35" />
                <stop offset="1" stopColor="var(--color-or)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${ligne} L100 100 L0 100Z`} fill="url(#aire)" />
            <path d={ligne} fill="none" stroke="var(--color-or)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
            <line x1={points[choisi][0]} x2={points[choisi][0]} y1="0" y2="100" stroke="var(--color-papier)" strokeOpacity="0.25" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-charbon bg-or" style={{ left: `${points[choisi][0]}%`, top: `${points[choisi][1]}%` }} />
          <div className="absolute inset-0 flex">
            {mois.map((x, i) => (
              <button key={x.mois} type="button" onClick={() => setChoisi(i)} aria-label={`${x.mois} : ${mad(x.revenus)}`} aria-pressed={choisi === i} className="h-full flex-1 rounded-md hover:bg-white/[0.03]" />
            ))}
          </div>
        </div>
        <div className="mt-2 flex justify-between text-[0.62rem] text-papier/40">
          {mois.map((x, i) => (
            <span key={x.mois} className={cn(i % 2 === 1 && "hidden sm:inline", choisi === i && "text-or")}>
              {x.mois}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const ICONE_OP: Record<Operation["type"], LucideIcon> = { arrivee: KeyRound, menage: Sparkles, maintenance: Wrench, voyageur: MessageCircle };
const STATUT_OP: Record<Operation["statut"], { label: string; classe: string; icone: LucideIcon }> = {
  fait: { label: "Fait", classe: "text-ok", icone: CheckCircle2 },
  en_cours: { label: "En cours", classe: "text-or-clair", icone: CircleDot },
  prevu: { label: "Prévu", classe: "text-papier/55", icone: Clock },
};

function Operations() {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_15rem]">
      <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.06] bg-charbon/60">
        {DEMO_SYNC.operations.map((o, i) => {
          const Icone = ICONE_OP[o.type];
          const s = STATUT_OP[o.statut];
          const IconeStatut = s.icone;
          return (
            <li key={i} className="flex items-center gap-3 px-4 py-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-graphite-2 text-or">
                <Icone className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.88rem] text-papier/90">{o.libelle}</span>
                <span className="block text-[0.72rem] text-papier/45">{o.quand}</span>
              </span>
              <span className={cn("flex items-center gap-1.5 text-[0.75rem]", s.classe)}>
                <IconeStatut className="h-3.5 w-3.5" /> {s.label}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
        <Kpi label="Prochaines arrivées" valeur="3" note="sur 7 jours" />
        <Kpi label="Demandes voyageurs ouvertes" valeur="0" />
        <Kpi label="Maintenance en cours" valeur="1" />
        <Kpi label="État opérationnel" valeur="Normal" />
      </div>
    </div>
  );
}

function Qualite() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {DEMO_SYNC.controles.map((c) => (
          <figure key={c.piece} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-charbon/60">
            <div className="relative aspect-[4/3]" style={{ background: `linear-gradient(135deg, ${c.teinte[0]}, ${c.teinte[1]})` }}>
              <span className="absolute inset-x-[18%] bottom-[22%] h-[22%] rounded-md bg-white/35" />
              <span className="absolute top-[18%] right-[16%] h-[30%] w-[22%] rounded-sm bg-white/45" />
              <span className="num absolute bottom-2 left-2 rounded bg-charbon/75 px-1.5 py-0.5 text-[0.62rem] text-papier">{c.quand}</span>
            </div>
            <figcaption className="flex items-center justify-between px-3 py-2.5 text-[0.78rem]">
              <span className="text-papier/80">{c.piece}</span>
              <span className={c.statut === "valide" ? "text-ok" : "text-or-clair"}>{c.statut === "valide" ? "Validé" : "À revoir"}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="flex items-center gap-2 text-[0.75rem] text-papier/45">
        <Info className="h-3.5 w-3.5" /> Chaque photo est horodatée et rattachée au ménage et au logement concernés.
      </p>
    </div>
  );
}

const ICONE_DOC = { depense: Receipt, dommage: Hammer, document: FileText } as const;

function Patrimoine() {
  const l = DEMO_SYNC.logement;
  return (
    <div className="grid gap-3 lg:grid-cols-[15rem_1fr]">
      <div className="rounded-2xl border border-white/[0.06] bg-charbon/60 p-4">
        <div className="aspect-[4/3] rounded-xl bg-[linear-gradient(135deg,var(--color-beige),var(--color-or))]" />
        <p className="mt-3 text-[0.92rem] text-papier">{l.nom}</p>
        <p className="text-[0.75rem] text-papier/50">
          {l.quartier} · {l.chambres} chambres
        </p>
      </div>
      <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.06] bg-charbon/60">
        {DEMO_SYNC.documents.map((d) => {
          const Icone = ICONE_DOC[d.type];
          return (
            <li key={d.libelle} className="flex items-center gap-3 px-4 py-3.5">
              <Icone className="h-4 w-4 shrink-0 text-or" />
              <span className="min-w-0 flex-1 truncate text-[0.88rem] text-papier/85">{d.libelle}</span>
              {d.montant ? <span className="num text-[0.8rem] text-papier/60">{mad(d.montant)}</span> : null}
              <span className="num text-[0.75rem] text-papier/40">{d.date}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TableauDeBord() {
  const [onglet, setOnglet] = useState<Onglet>("performance");
  const [ref, vu] = useVisible<HTMLDivElement>({ seuil: 0.3 });
  useEffect(() => {
    if (vu) track("InvestorDashboardViewed");
  }, [vu]);
  const Contenu = useMemo(() => ({ performance: Performance, operations: Operations, qualite: Qualite, patrimoine: Patrimoine })[onglet], [onglet]);

  return (
    <section id="application" aria-labelledby="titre-application" className="relative scroll-mt-20 overflow-hidden bg-graphite py-20 md:py-28">
      <div aria-hidden className="absolute top-0 left-1/2 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(182_154_112/0.12),transparent)]" />
      <div className="relative mx-auto max-w-[88rem] px-5 md:px-10">
        <Revele className="mx-auto max-w-3xl text-center">
          <Surtitre className="justify-center">Technologie propriétaire</Surtitre>
          <h2 id="titre-application" className="titre mt-5 text-[2.4rem] text-papier md:text-[3.6rem]">
            {APPLICATION.titre}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[1.02rem] leading-relaxed text-papier/65">{APPLICATION.texte}</p>
        </Revele>

        <Revele delai={150} className="mt-12 md:mt-16">
          <div ref={ref} className="overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-charbon shadow-[0_60px_120px_-40px_rgb(0_0_0/0.9)]">
            {/* Barre de fenêtre */}
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3.5">
              <span className="flex gap-1.5" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              </span>
              <span className="text-[0.78rem] text-papier/55">Espace propriétaire · {DEMO_SYNC.logement.nom}</span>
              <span className="ml-auto rounded-full border border-or/40 bg-or/10 px-3 py-1 text-[0.68rem] font-medium tracking-wide text-or-clair">Données de démonstration</span>
            </div>
            <div className="grid md:grid-cols-[13rem_1fr]">
              <nav aria-label="Modules du tableau de bord" className="flex gap-1 overflow-x-auto border-b border-white/[0.06] p-3 md:flex-col md:border-r md:border-b-0">
                {ONGLETS.map((o) => {
                  const Icone = o.icone;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={onglet === o.id}
                      onClick={() => setOnglet(o.id)}
                      className={cn("flex h-11 shrink-0 items-center gap-2.5 rounded-xl px-3.5 text-[0.86rem] transition-colors", onglet === o.id ? "bg-white/[0.07] text-papier" : "text-papier/55 hover:text-papier")}
                    >
                      <Icone className={cn("h-4 w-4", onglet === o.id ? "text-or" : "")} />
                      {o.label}
                    </button>
                  );
                })}
              </nav>
              <div key={onglet} className="min-h-[24rem] p-4 [animation:entree-bas_0.5s_var(--ease-cine)_both] md:p-6">
                <Contenu />
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-[0.75rem] text-papier/40">{APPLICATION.mention}</p>
        </Revele>
      </div>
    </section>
  );
}
