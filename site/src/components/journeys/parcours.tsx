"use client";

/*
  Le cœur de l'entonnoir : le propriétaire choisit sa situation, puis voit SON accroche,
  SES problèmes et la réponse Perfect Stay. Le choix est mémorisé et transmis au formulaire.
*/
import { AlertTriangle, ArrowRight, Check, RefreshCw } from "lucide-react";
import { bouton } from "@/components/ui/bouton";
import { Revele } from "@/components/ui/revele";
import { Surtitre } from "@/components/ui/surtitre";
import { ChoixProfil } from "@/components/sections/choix-profil";
import { cn } from "@/lib/cn";
import { HERO, PARCOURS, PROFILS, type Profil } from "@/lib/content";
import { track } from "@/lib/analytics";
import { useExperience } from "@/lib/experience";
import { useVisible } from "@/lib/use-visible";
import { TransformationAppartement } from "./transformations";

function AvantApres() {
  const [ref, actif] = useVisible<HTMLDivElement>({ seuil: 0.4 });
  return (
    <div ref={ref} className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-charbon">
      <div className="aspect-[16/10]">
        <TransformationAppartement actif={actif} />
      </div>
    </div>
  );
}

function Detail({ profil }: { profil: Profil }) {
  const { ouvrirTunnel, choisirProfil } = useExperience();
  const p = PARCOURS[profil];
  const ouvrir = (source: string) => {
    track("CtaClicked", { cta: source, profil });
    ouvrirTunnel(source);
  };
  return (
    <div id="parcours-detail" key={profil} className="scroll-mt-24 [animation:entree-bas_0.9s_var(--ease-cine)_both]">
      {/* Accroche propre à la situation */}
      <div className="grid gap-8 border-t border-white/[0.07] py-14 md:grid-cols-12 md:py-20">
        <div className="md:col-span-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-or/50 bg-or/10 px-3.5 py-1.5 text-[0.78rem] text-or-clair">{PROFILS[profil].court}</span>
            <button
              type="button"
              onClick={() => {
                choisirProfil(null);
                document.getElementById("parcours")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1.5 text-[0.82rem] text-papier/60 underline decoration-papier/25 underline-offset-4 hover:text-papier"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Changer de situation
            </button>
          </div>
          <h3 className="titre mt-6 text-[2.2rem] leading-[1.06] text-papier md:text-[3.4rem]">{p.usp}</h3>
          <p className="mt-6 max-w-2xl text-[1.06rem] leading-relaxed text-papier/70">{p.sousTitre}</p>
        </div>
        <div className="flex items-end md:col-span-4 md:justify-end">
          <button type="button" onClick={() => ouvrir(`parcours-${profil}-haut`)} className={bouton("or", "lg", "h-auto min-h-14 w-full py-3 text-center whitespace-normal md:w-auto md:max-w-[20rem]")}>
            {p.cta}
          </button>
        </div>
      </div>

      {/* Problèmes */}
      <div className="pb-6">
        <Revele>
          <Surtitre>Ce que vous vivez peut-être</Surtitre>
          <h4 className="titre mt-4 max-w-3xl text-[1.9rem] text-papier md:text-[2.6rem]">{p.titreProblemes}</h4>
        </Revele>
        <ol className={cn("mt-10 grid gap-4 sm:grid-cols-2", p.problemes.length > 4 ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
          {p.problemes.map((pb, i) => (
            <li key={pb.titre}>
              <Revele delai={i * 90} className="group flex h-full flex-col rounded-[1.5rem] border border-white/10 bg-graphite/70 p-6 transition-[border-color,transform] duration-500 hover:-translate-y-1 hover:border-alerte/60">
                <div className="flex items-center justify-between">
                  <span className="num text-[0.78rem] text-papier/40">0{i + 1}</span>
                  <AlertTriangle className="h-4 w-4 text-alerte/80" />
                </div>
                <p className="mt-6 text-[1.08rem] font-semibold text-papier">{pb.titre}</p>
                <p className="mt-2.5 text-[0.93rem] leading-relaxed text-papier/65">{pb.texte}</p>
              </Revele>
            </li>
          ))}
        </ol>
      </div>

      {/* Solution */}
      <div className="py-14 md:py-20">
        <Revele className="grain relative overflow-hidden rounded-[2rem] border border-or/25 bg-graphite p-7 md:p-14">
          <Surtitre>La réponse Perfect Stay</Surtitre>
          <h4 className="titre mt-5 max-w-4xl text-[2rem] leading-[1.08] text-papier md:text-[3.1rem]">{p.solution.titre}</h4>
          {p.solution.intro ? <p className="mt-5 max-w-2xl text-[1.02rem] leading-relaxed text-papier/70">{p.solution.intro}</p> : null}
          <div className={cn("mt-10 grid gap-10", profil === "vacant" && "lg:grid-cols-2 lg:items-center")}>
            <ul className={cn("grid gap-x-8 gap-y-3.5", profil !== "vacant" && "sm:grid-cols-2 lg:grid-cols-3")}>
              {p.solution.points.map((pt, i) => (
                <li key={pt} className="flex items-start gap-3 text-[0.98rem] text-papier/85">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-bouton text-[0.7rem] font-semibold text-white">{p.solution.ordonne ? i + 1 : <Check className="h-3.5 w-3.5" />}</span>
                  {pt}
                </li>
              ))}
            </ul>
            {profil === "vacant" ? <AvantApres /> : null}
          </div>
          {p.solution.mention ? <p className="mt-8 max-w-2xl border-l-2 border-or/50 pl-4 text-[0.9rem] leading-relaxed text-papier/60">{p.solution.mention}</p> : null}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={() => ouvrir(`parcours-${profil}-solution`)} className={bouton("or", "lg", "h-auto min-h-14 py-3 text-center whitespace-normal")}>
              {p.cta}
            </button>
            <a href="#programme" className={bouton("contour", "lg")}>
              Voir notre méthode <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </Revele>
      </div>
    </div>
  );
}

export function Parcours() {
  const { profil } = useExperience();
  return (
    <section id="parcours" aria-labelledby="titre-parcours" className="relative scroll-mt-20 bg-charbon">
      <div className="mx-auto max-w-[88rem] px-5 pt-20 md:px-10 md:pt-28">
        <div className="pb-12">
          <Surtitre>Votre situation</Surtitre>
          <h2 id="titre-parcours" className="titre mt-4 max-w-3xl text-[2.2rem] text-papier md:text-[3.2rem]">
            {HERO.question}
          </h2>
          <p className="mt-4 max-w-xl text-[1rem] text-papier/60">Un clic, et le site s&apos;adapte à votre bien.</p>
          <div className="mt-9">
            <ChoixProfil />
          </div>
        </div>
        {profil ? <Detail profil={profil} /> : null}
      </div>
    </section>
  );
}
