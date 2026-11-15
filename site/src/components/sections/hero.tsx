"use client";

import { ArrowDown } from "lucide-react";
import { bouton } from "@/components/ui/bouton";
import { MediaCinema } from "@/components/ui/media-cinema";
import { CTA, HERO, MARQUE } from "@/lib/content";
import { useExperience } from "@/lib/experience";
import { ChoixProfil } from "./choix-profil";
import { HeroVisuel } from "./hero-visuel";

export function Hero() {
  const { ouvrirTunnel } = useExperience();
  return (
    <section id="haut" aria-labelledby="titre-hero" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <MediaCinema scene="hero">
          <HeroVisuel />
        </MediaCinema>
      </div>

      <div className="mx-auto flex w-full max-w-[88rem] flex-1 flex-col justify-end px-5 pt-32 pb-10 md:px-10 md:pb-14">
        <div className="max-w-[46rem] [animation:entree-bas_1.2s_var(--ease-cine)_both]">
          <p className="surtitre text-or">{HERO.surtitre}</p>
          <h1 id="titre-hero" className="titre mt-5 text-[2.9rem] text-papier sm:text-[4rem] lg:text-[5.4rem]">
            {HERO.titre}
          </h1>
          <p className="mt-6 max-w-[34rem] text-[1.06rem] leading-relaxed text-papier/72 md:text-[1.15rem]">{HERO.texte}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={() => ouvrirTunnel("hero")} className={bouton("or", "lg")}>
              {CTA.principal}
            </button>
            <a href="#appartement" className={bouton("contour", "lg")}>
              {CTA.secondaire}
            </a>
          </div>
        </div>

        <div className="mt-14 max-w-[52rem] [animation:entree-bas_1.2s_var(--ease-cine)_0.35s_both]">
          <ChoixProfil />
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
