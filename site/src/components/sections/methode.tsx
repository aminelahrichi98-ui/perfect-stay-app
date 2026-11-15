import { Revele } from "@/components/ui/revele";
import { Surtitre } from "@/components/ui/surtitre";
import { METHODE } from "@/lib/content";

export function Methode() {
  return (
    <section id="methode" aria-labelledby="titre-methode" className="scroll-mt-20 bg-papier py-20 text-charbon md:py-28">
      <div className="mx-auto max-w-[88rem] px-5 md:px-10">
        <div className="grid gap-8 md:grid-cols-12">
          <Revele className="md:col-span-5">
            <Surtitre className="text-or-fonce">Méthode</Surtitre>
            <h2 id="titre-methode" className="titre mt-5 text-[2.4rem] md:text-[3.4rem]">
              De l&apos;évaluation au reporting, une exploitation en huit étapes.
            </h2>
            <p className="mt-5 max-w-md text-[1rem] leading-relaxed text-gris-fonce">
              Un processus standardisé, appliqué à chaque appartement : c&apos;est ce qui rend la qualité reproductible.
            </p>
          </Revele>
          <ol className="grid gap-px overflow-hidden rounded-[1.75rem] border border-charbon/10 bg-charbon/10 sm:grid-cols-2 md:col-span-7">
            {METHODE.map((e, i) => (
              <li key={e.titre} className="bg-papier p-6 md:p-7">
                <Revele delai={(i % 2) * 120}>
                  <span className="num font-display text-[2rem] leading-none text-or-fonce">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-4 text-[1.05rem] font-semibold">{e.titre}</h3>
                  <p className="mt-1.5 text-[0.92rem] leading-relaxed text-gris-fonce">{e.texte}</p>
                </Revele>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
