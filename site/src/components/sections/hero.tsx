"use client";

import { ArrowDown } from "lucide-react";
import { bouton } from "@/components/ui/bouton";
import { MediaCinema } from "@/components/ui/media-cinema";
import { CTA, HERO, MARQUE } from "@/lib/content";
import { MEDIAS } from "@/lib/medias";
import { useExperience } from "@/lib/experience";
import { HeroVisuel, VoileHero } from "./hero-visuel";

export function Hero() {
  const { ouvrirTunnel } = useExperience();
  return (
    <section id="haut" aria-labelledby="titre-hero" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <MediaCinema scene="hero" className="absolute inset-0">
          <HeroVisuel />
        </MediaCinema>
        {MEDIAS.hero.video ? <VoileHero /> : null}
      </div>

      <div className="mx-auto flex w-full max-w-[88rem] flex-1 flex-col items-center justify-center px-5 pt-32 pb-16 text-center md:px-10">
        <div className="flex max-w-[52rem] flex-col items-center [animation:entree-bas_1.2s_var(--ease-cine)_both]">
          <p className="surtitre text-or">{HERO.surtitre}</p>
          <h1 id="titre-hero" className="titre mt-5 text-[2.9rem] text-papier sm:text-[4rem] lg:text-[5.4rem]">
            {HERO.titre}
          </h1>
          <p className="mx-auto mt-6 max-w-[36rem] text-[1.06rem] leading-relaxed text-papier/72 md:text-[1.15rem]">{HERO.texte}</p>
          <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
            <button type="button" onClick={() => ouvrirTunnel("hero")} className={bouton("or", "lg")}>
              {CTA.principal}
            </button>
            <a href="#appartement" className={bouton("contour", "lg")}>
              {CTA.secondaire}
            </a>
          </div>
        </div>

      </div>

      <div className="mx-auto flex w-full max-w-[88rem] items-center justify-between border-t border-white/[0.07] px-5 py-4 text-[0.78rem] text-papier/45 md:px-10">
        <span>{MARQUE.signature}</span>
        <a href="#parcours" className="hidden items-center gap-2 hover:text-papier/80 sm:inline-flex">
          Défiler <ArrowDown className="h-3.5 w-3.5 [animation:flotte_2.4s_ease-in-out_infinite]" />
        </a>
      </div>
    </section>
  );
}
