import { Plus } from "lucide-react";
import { Revele } from "@/components/ui/revele";
import { Surtitre } from "@/components/ui/surtitre";
import { FAQ } from "@/lib/content";

export function Faq() {
  return (
    <section id="faq" aria-labelledby="titre-faq" className="zone-contraste scroll-mt-20 bg-papier py-20 text-charbon md:py-28">
      <div className="mx-auto grid max-w-[88rem] gap-10 px-5 md:grid-cols-12 md:px-10">
        <Revele className="md:col-span-4">
          <Surtitre className="text-or-fonce">Questions fréquentes</Surtitre>
          <h2 id="titre-faq" className="titre mt-5 text-[2.4rem] md:text-[3.2rem]">
            Ce que les propriétaires nous demandent.
          </h2>
        </Revele>
        <div className="divide-y divide-charbon/10 border-y border-charbon/10 md:col-span-8">
          {FAQ.map((q) => (
            <details key={q.question} className="group py-1">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-3 text-[1.05rem] font-medium [&::-webkit-details-marker]:hidden">
                {q.question}
                <Plus className="h-5 w-5 shrink-0 text-or-fonce transition-transform duration-300 group-open:rotate-45" />
              </summary>
              <p className="max-w-2xl pb-6 text-[0.98rem] leading-relaxed text-gris-fonce">{q.reponse}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
