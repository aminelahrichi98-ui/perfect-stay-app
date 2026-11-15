"use client";

import { ArrowRight } from "lucide-react";
import { bouton } from "@/components/ui/bouton";
import { MediaCinema } from "@/components/ui/media-cinema";
import { Revele } from "@/components/ui/revele";
import { Surtitre } from "@/components/ui/surtitre";
import { cn } from "@/lib/cn";
import { PARCOURS, PROFILS, type Profil, type Scene } from "@/lib/content";
import { useExperience } from "@/lib/experience";
import { useVisible } from "@/lib/use-visible";
import { TransformationAppartement, TransformationSysteme } from "./transformations";
import { SCENE_MEDIA, VISUELS } from "./visuels";

function SceneParcours({ scene, index }: { scene: Scene; index: number }) {
  const [ref, actif] = useVisible<HTMLDivElement>({ seuil: 0.35 });
  const Visuel = VISUELS[scene.id];
  const media = SCENE_MEDIA[scene.id];
  const inverse = index % 2 === 1;
  return (
    <article ref={ref} className="grid items-center gap-8 py-14 md:grid-cols-12 md:gap-14 md:py-24">
      <div className={cn("md:col-span-7", inverse && "md:order-2")}>
        <div className={cn("transition-all duration-[1400ms] ease-[var(--ease-cine)]", actif ? "scale-100 opacity-100" : "scale-[0.97] opacity-0")}>
          {media ? (
            <MediaCinema scene={media} superposer className="h-full w-full object-cover">
              <Visuel actif={actif} />
            </MediaCinema>
          ) : (
            <Visuel actif={actif} />
          )}
        </div>
      </div>
      <div className={cn("md:col-span-5", inverse && "md:order-1")}>
        <Revele>
          <p className="num text-[0.8rem] text-papier/40">0{index + 1}</p>
          <Surtitre className="mt-3">{scene.surtitre}</Surtitre>
          <h3 className="titre mt-5 text-[2.1rem] text-papier md:text-[2.7rem]">{scene.titre}</h3>
          <p className="mt-5 max-w-md text-[1.02rem] leading-relaxed text-papier/65">{scene.texte}</p>
        </Revele>
      </div>
    </article>
  );
}

function Conclusion({ profil }: { profil: Profil }) {
  const { ouvrirTunnel } = useExperience();
  const [ref, actif] = useVisible<HTMLDivElement>({ seuil: 0.4 });
  const c = PARCOURS[profil].conclusion;
  return (
    <div ref={ref} className="py-14 md:py-24">
      <Revele className="mx-auto max-w-3xl text-center">
        <Surtitre className="justify-center">La bascule</Surtitre>
        <h3 className="titre mt-5 text-[2.3rem] text-papier md:text-[3.4rem]">{c.titre}</h3>
      </Revele>
      <div className="mx-auto mt-10 max-w-5xl md:mt-14">
        <MediaCinema scene="transformation" className="aspect-[16/10] rounded-[1.75rem]">
          {profil === "courte" ? <TransformationSysteme actif={actif} /> : <TransformationAppartement actif={actif} />}
        </MediaCinema>
      </div>
      <Revele className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row" delai={200}>
        <button type="button" onClick={() => ouvrirTunnel(`parcours-${profil}`)} className={bouton("or", "lg")}>
          {c.cta}
        </button>
        <a href="#perfect-stay" className={bouton("contour", "lg")}>
          Voir comment nous gérons <ArrowRight className="h-4 w-4" />
        </a>
      </Revele>
    </div>
  );
}

export function Parcours() {
  const { profil, choisirProfil } = useExperience();

  return (
    <section id="parcours" aria-labelledby="titre-parcours" className="relative scroll-mt-20 bg-charbon">
      <div className="mx-auto max-w-[88rem] px-5 pt-20 md:px-10 md:pt-28">
        <div className="flex flex-col gap-6 border-b border-white/[0.07] pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <Surtitre>Votre situation</Surtitre>
            <h2 id="titre-parcours" className="titre mt-4 text-[2.2rem] text-papier md:text-[3rem]">
              {profil ? PARCOURS[profil].intro : "Chaque stratégie locative a ses angles morts."}
            </h2>
          </div>
          <div role="group" aria-label="Choisir votre situation" className="flex shrink-0 flex-wrap gap-2">
            {(Object.keys(PROFILS) as Profil[]).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={profil === p}
                onClick={() => choisirProfil(p)}
                className={cn(
                  "h-10 rounded-full border px-4 text-[0.84rem] transition-colors",
                  profil === p ? "border-or bg-or text-papier" : "border-white/15 text-papier/70 hover:border-or/60 hover:text-papier",
                )}
              >
                {PROFILS[p].court}
              </button>
            ))}
          </div>
        </div>

        {profil ? (
          <div key={profil} className="[animation:entree-bas_0.9s_var(--ease-cine)_both]">
            {PARCOURS[profil].scenes.map((s, i) => (
              <SceneParcours key={s.id} scene={s} index={i} />
            ))}
            <Conclusion profil={profil} />
          </div>
        ) : (
          <p className="max-w-xl py-12 text-[1.05rem] leading-relaxed text-papier/60 md:py-16">
            Choisissez votre situation ci-dessus pour un parcours adapté à votre bien, ou poursuivez directement vers notre façon de gérer.
          </p>
        )}
      </div>
    </section>
  );
}
