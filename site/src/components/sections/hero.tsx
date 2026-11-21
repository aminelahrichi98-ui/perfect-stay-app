"use client";

/*
  Hero cinéma : la vidéo du salon avance avec le défilement (la lumière envahit la pièce).
  L'accroche est visible dès l'arrivée, sans défiler. Sur téléphone, tablette en portrait et
  « mouvement réduit », on sert une image fixe composée : la vidéo n'est alors jamais téléchargée.
*/
import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { bouton } from "@/components/ui/bouton";
import { CTA, HERO, MARQUE } from "@/lib/content";
import { track } from "@/lib/analytics";
import { useExperience } from "@/lib/experience";

const VIDEO = "/media/hero-scrub.mp4";
const POSTER = "/media/hero-poster.jpg";
const FIXE = "/media/hero-ending.jpg";
const GATES = [
  "(max-width: 720px)",
  "(orientation: portrait) and (max-width: 1024px)",
  "(orientation: portrait) and (pointer: coarse)",
  "(orientation: landscape) and (pointer: coarse) and (max-height: 560px)",
  "(prefers-reduced-motion: reduce)",
];
/** Bandes de texte en progression de défilement [début, fin] */
const BANDES: [number, number][] = [
  [0, 0.3],
  [0.4, 0.66],
  [0.76, 1],
];
const borne = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lisse = (p: number, a: number, b: number) => {
  const t = borne((p - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export function Hero() {
  const { ouvrirTunnel } = useExperience();
  const [scrub, setScrub] = useState(false);
  const [pret, setPret] = useState(false);
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const b0 = useRef<HTMLDivElement>(null);
  const b1 = useRef<HTMLDivElement>(null);
  const b2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const listes = GATES.map((q) => window.matchMedia(q));
    const maj = () => setScrub(!listes.some((m) => m.matches));
    maj();
    listes.forEach((m) => m.addEventListener("change", maj));
    return () => listes.forEach((m) => m.removeEventListener("change", maj));
  }, []);

  useEffect(() => {
    if (!scrub) return;
    const el = section.current;
    const v = video.current;
    if (!el || !v) return;
    let annule = false;
    let cible = 0;
    let affiche = 0;
    let raf: number | null = null;
    let dernier = 0;
    let occupe = false;
    let attente: number | null = null;
    let visible = true;
    let url: string | null = null;
    const etat = BANDES.map(() => -1);

    const progression = () => {
      const r = el.getBoundingClientRect();
      const plage = r.height - window.innerHeight;
      return plage > 0 ? borne(-r.top / plage, 0, 1) : 0;
    };
    const chercher = (t: number) => {
      if (!v.duration) return;
      if (occupe) {
        attente = t;
        return;
      }
      if (Math.abs(v.currentTime - t) < 0.001) return;
      occupe = true;
      v.currentTime = t;
    };
    const surSeeked = () => {
      occupe = false;
      if (attente !== null) {
        const t = attente;
        attente = null;
        chercher(t);
      }
    };
    const surErreur = () => {
      occupe = false;
      attente = null;
    };
    const textes = (p: number) => {
      BANDES.forEach(([a, b], i) => {
        const f = Math.min(0.03, (b - a) / 3);
        const o = (i === 0 ? 1 : lisse(p, a, a + f)) * (i === BANDES.length - 1 ? 1 : 1 - lisse(p, b - f, b));
        if (Math.abs(o - etat[i]) < 0.008 && o !== 0 && o !== 1) return;
        if (o === etat[i]) return;
        etat[i] = o;
        const n = [b0, b1, b2][i].current;
        if (!n) return;
        n.style.opacity = o.toFixed(3);
        n.style.visibility = o === 0 ? "hidden" : "visible";
        n.style.transform = `translateY(${((1 - o) * 18).toFixed(1)}px)`;
      });
    };
    const tic = (t: number) => {
      const dt = Math.min(100, t - (dernier || t));
      dernier = t;
      affiche += (cible - affiche) * (1 - Math.pow(1 - 0.16, dt / 16.667));
      if (Math.abs(cible - affiche) < 0.0005) {
        affiche = cible;
        raf = null;
        dernier = 0;
      } else raf = requestAnimationFrame(tic);
      chercher(affiche * (v.duration || 0) * 0.999);
      textes(affiche);
    };
    const surDefilement = () => {
      cible = progression();
      if (raf === null && visible) raf = requestAnimationFrame(tic);
    };
    const obs = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) surDefilement();
    });
    obs.observe(el);
    v.addEventListener("seeked", surSeeked);
    v.addEventListener("error", surErreur);
    window.addEventListener("scroll", surDefilement, { passive: true });
    window.addEventListener("resize", surDefilement);
    cible = affiche = progression();
    textes(affiche);

    // La vidéo est chargée en entier (Blob) : le défilement fonctionne même sans téléchargement partiel
    fetch(VIDEO, { priority: "low" } as RequestInit)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error("vidéo indisponible"))))
      .then((blob) => {
        if (annule) return;
        url = URL.createObjectURL(blob);
        v.src = url;
        v.load();
        v.addEventListener(
          "canplay",
          () => {
            chercher(progression() * v.duration * 0.999);
            setPret(true);
          },
          { once: true },
        );
      })
      .catch(() => {
        /* la page reste complète sur l'image fixe */
      });

    return () => {
      annule = true;
      obs.disconnect();
      v.removeEventListener("seeked", surSeeked);
      v.removeEventListener("error", surErreur);
      window.removeEventListener("scroll", surDefilement);
      window.removeEventListener("resize", surDefilement);
      if (raf !== null) cancelAnimationFrame(raf);
      if (url) URL.revokeObjectURL(url);
      [b0, b1, b2].forEach((r) => r.current?.removeAttribute("style"));
      setPret(false);
    };
  }, [scrub]);

  const bande = "absolute top-1/2 left-5 w-[min(38rem,46vw)] -translate-y-1/2 md:left-12 lg:left-20";

  return (
    <section ref={section} id="haut" aria-labelledby="titre-hero" className="zone-sombre relative" style={{ height: scrub ? "380vh" : undefined }}>
      <div className={scrub ? "sticky top-0 h-[100svh] overflow-hidden bg-charbon" : "relative flex min-h-[100svh] flex-col justify-end overflow-hidden bg-charbon"}>
        <div aria-hidden className="absolute inset-0 bg-cover bg-[position:78%_center] md:bg-center" style={{ backgroundImage: `url(${scrub ? POSTER : FIXE})` }} />
        {scrub ? (
          <video ref={video} muted playsInline preload="none" aria-hidden tabIndex={-1} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 will-change-transform ${pret ? "opacity-100" : "opacity-0"}`} />
        ) : null}
        <div
          aria-hidden
          className={
            scrub
              ? "absolute inset-0 bg-[linear-gradient(90deg,rgb(22_8_19/0.86)_0%,rgb(22_8_19/0.58)_36%,rgb(22_8_19/0)_66%),linear-gradient(180deg,rgb(22_8_19/0.5),rgb(22_8_19/0)_22%)]"
              : "absolute inset-0 bg-[linear-gradient(180deg,rgb(22_8_19/0.45)_0%,rgb(22_8_19/0.2)_30%,rgb(22_8_19/0.94)_72%)]"
          }
        />

        <div ref={b0} className={scrub ? bande : "relative px-5 pt-32 pb-10"}>
          <div className="[animation:entree-bas_1.2s_var(--ease-cine)_both]">
            <p className="surtitre text-or-clair">{HERO.surtitre}</p>
            <h1 id="titre-hero" className="titre mt-5 text-[2.5rem] leading-[1.04] text-papier sm:text-[3.1rem] lg:text-[3.9rem]">
              {HERO.titre}
            </h1>
            <p className="mt-5 max-w-[34rem] text-[1.02rem] leading-relaxed text-papier/78 md:text-[1.08rem]">{HERO.texte}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => {
                  track("CtaClicked", { cta: "hero-principal" });
                  document.getElementById("parcours")?.scrollIntoView({ behavior: "smooth" });
                }}
                className={bouton("or", "lg", "whitespace-normal text-center")}
              >
                {CTA.principal}
              </button>
              <a href="#programme" onClick={() => track("CtaClicked", { cta: "hero-secondaire" })} className={bouton("contour", "lg")}>
                {CTA.secondaire}
              </a>
            </div>
          </div>
        </div>

        {scrub ? (
          <>
            <div ref={b1} className={bande} style={{ opacity: 0, visibility: "hidden" }}>
              <p className="titre text-[2.6rem] leading-[1.05] text-papier lg:text-[3.8rem]">{MARQUE.promesse}</p>
            </div>
            <div ref={b2} className={bande} style={{ opacity: 0, visibility: "hidden" }}>
              <p className="surtitre text-or-clair">Perfect Stay Revenue Audit</p>
              <p className="titre mt-4 text-[2.6rem] leading-[1.05] text-papier lg:text-[3.8rem]">{MARQUE.signature}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => ouvrirTunnel("hero-fin")} className={bouton("or", "lg")}>
                  {CTA.audit}
                </button>
                <a href="#parcours" className="inline-flex items-center gap-2 text-[0.92rem] text-papier/80 hover:text-papier">
                  Commencer par ma situation <ArrowDown className="h-4 w-4 [animation:flotte_2.4s_ease-in-out_infinite]" />
                </a>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
