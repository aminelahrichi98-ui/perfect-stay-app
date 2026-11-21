"use client";

/*
  Le moment de convergence : les trois parcours se rejoignent. Trois filets d'or (longue durée,
  courte durée, bien vacant) convergent vers le monogramme, puis la marque se révèle.
  La composition finale reprend l'angle isométrique de la maquette 3D qui suit (raccord de plan).
*/
import { Monogramme } from "@/components/ui/logo";
import { MediaCinema } from "@/components/ui/media-cinema";
import { cn } from "@/lib/cn";
import { CONVERGENCE } from "@/lib/content";
import { useVisible } from "@/lib/use-visible";

export function Convergence() {
  const [ref, actif] = useVisible<HTMLDivElement>({ seuil: 0.45 });
  const chemins = ["M0 80 C260 80 420 210 600 250", "M0 250 C240 250 400 250 600 250", "M0 420 C260 420 420 290 600 250"];
  return (
    <section id="perfect-stay" aria-labelledby="titre-convergence" className="relative scroll-mt-16 overflow-hidden bg-charbon">
      {/* La séquence vidéo est sombre : elle n'est montrée que sur le thème sombre */}
      <div className="seulement-sombre">
        <MediaCinema scene="convergence" className="absolute inset-0 opacity-60">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,rgb(182_154_112/0.14),transparent_70%)]" />
        </MediaCinema>
      </div>
      <div aria-hidden className="seulement-clair absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,rgb(182_154_112/0.12),transparent_70%)]" />
      <div ref={ref} className="relative mx-auto flex min-h-[92svh] max-w-[88rem] flex-col items-center justify-center px-5 py-24 text-center md:px-10">
        <svg viewBox="0 0 1200 500" className="absolute inset-x-0 top-1/2 h-[60%] w-full -translate-y-1/2" aria-hidden preserveAspectRatio="none">
          <g fill="none" stroke="var(--color-or)" strokeWidth="1.2">
            {chemins.map((d, i) => (
              <path
                key={d}
                d={d}
                strokeOpacity="0.55"
                strokeDasharray="700"
                strokeDashoffset={actif ? 0 : 700}
                style={{ transition: `stroke-dashoffset 2.2s var(--ease-cine) ${i * 180}ms` }}
              />
            ))}
            {chemins.map((d, i) => (
              <path
                key={`m${d}`}
                d={d}
                transform="matrix(-1 0 0 1 1200 0)"
                strokeOpacity="0.3"
                strokeDasharray="700"
                strokeDashoffset={actif ? 0 : 700}
                style={{ transition: `stroke-dashoffset 2.2s var(--ease-cine) ${300 + i * 180}ms` }}
              />
            ))}
          </g>
        </svg>

        <div className={cn("relative transition-all duration-[1600ms] ease-[var(--ease-cine)]", actif ? "scale-100 opacity-100" : "scale-90 opacity-0")} style={{ transitionDelay: "1.4s" }}>
          <span className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-or/40 bg-charbon shadow-[0_0_80px_-10px_rgb(182_154_112/0.45)] md:h-28 md:w-28">
            <Monogramme className="h-12 w-auto text-or md:h-14" />
          </span>
        </div>
        <h2
          id="titre-convergence"
          className={cn("titre relative mt-10 text-[3.6rem] text-papier transition-all duration-[1400ms] ease-[var(--ease-cine)] md:text-[7rem]", actif ? "opacity-100" : "translate-y-6 opacity-0")}
          style={{ transitionDelay: "1.8s" }}
        >
          {CONVERGENCE.titre}
        </h2>
        <p
          className={cn("titre relative mt-3 text-[1.5rem] text-or-clair italic transition-all duration-[1400ms] md:text-[2.2rem]", actif ? "opacity-100" : "translate-y-4 opacity-0")}
          style={{ transitionDelay: "2.1s" }}
        >
          {CONVERGENCE.signature}
        </p>
        <p className={cn("relative mt-8 max-w-xl text-[1.05rem] leading-relaxed text-papier/65 transition-all duration-[1400ms]", actif ? "opacity-100" : "opacity-0")} style={{ transitionDelay: "2.4s" }}>
          {CONVERGENCE.texte}
        </p>
      </div>
    </section>
  );
}
