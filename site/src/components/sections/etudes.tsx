import { Revele } from "@/components/ui/revele";
import { Surtitre } from "@/components/ui/surtitre";
import { ETUDES_DE_CAS, PREUVES, type EtudeDeCas } from "@/lib/content";

const mad = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} MAD`;
const NATURE = { reel: "Résultat observé", estimation: "Estimation", projection: "Projection" } as const;

function Carte({ e }: { e: EtudeDeCas }) {
  const max = Math.max(e.loyerLongueDuree, e.revenuNetMensuel, 1);
  const ecart = e.revenuNetMensuel - e.loyerLongueDuree;
  return (
    <article className="flex h-full flex-col rounded-[1.75rem] border border-charbon/15 bg-white/60 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="titre text-[1.7rem]">{e.quartier}</p>
        <span className={`rounded-full px-3 py-1 text-[0.72rem] ${e.nature === "reel" ? "bg-or-fonce text-papier" : "border border-charbon/25 text-gris-fonce"}`}>{NATURE[e.nature]}</span>
      </div>
      <p className="mt-1 text-[0.9rem] text-gris-fonce">
        {e.typologie} · {e.surface} m² · {e.chambres} chambre{e.chambres > 1 ? "s" : ""} · {e.periode}
      </p>
      <div className="mt-7 space-y-3">
        {[
          ["Loyer longue durée de référence", e.loyerLongueDuree, "bg-charbon/30"],
          ["Revenu net propriétaire en courte durée", e.revenuNetMensuel, "bg-bouton"],
        ].map(([nom, v, c]) => (
          <div key={nom as string}>
            <div className="flex justify-between text-[0.84rem]">
              <span className="text-gris-fonce">{nom}</span>
              <span className="num font-medium">{mad(v as number)} / mois</span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-charbon/[0.07]">
              <div className={`h-full rounded-full ${c}`} style={{ width: `${((v as number) / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-charbon/15 pt-6 text-[0.86rem]">
        {[
          ["Chiffre d'affaires", `${mad(e.chiffreAffairesMensuel)} / mois`],
          ["Taux d'occupation", `${e.tauxOccupation} %`],
          ["Prix moyen par nuit (ADR)", mad(e.adr)],
          ["Charges d'exploitation", `${mad(e.chargesMensuelles)} / mois`],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-gris-fonce">{k}</dt>
            <dd className="num mt-0.5 font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 rounded-xl bg-or-fonce/[0.06] px-4 py-3 text-[0.92rem]">
        Différence nette : <strong className="num">{ecart >= 0 ? "+" : ""}{mad(ecart)} / mois</strong>
      </p>
      {e.commentaire ? <p className="mt-4 text-[0.86rem] leading-relaxed text-gris-fonce">{e.commentaire}</p> : null}
    </article>
  );
}

/** Études de cas réelles. Tant que `ETUDES_DE_CAS` est vide, aucun chiffre n'est affiché. */
export function Etudes({ complet = false }: { complet?: boolean }) {
  const cas = complet ? ETUDES_DE_CAS : ETUDES_DE_CAS.slice(0, 3);
  return (
    <section id="etudes" aria-labelledby="titre-etudes" className="scroll-mt-20 bg-papier-2 py-20 text-charbon md:py-28">
      <div className="mx-auto max-w-[88rem] px-5 md:px-10">
        <Revele className="max-w-3xl">
          <Surtitre className="text-or-fonce">Études de cas</Surtitre>
          <h2 id="titre-etudes" className="titre mt-5 text-[2.2rem] md:text-[3.2rem]">
            {PREUVES.titre}
          </h2>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-gris-fonce">Des appartements que nous gérons à Casablanca, avec leurs résultats. Chaque fiche précise s&apos;il s&apos;agit d&apos;un résultat observé, d&apos;une estimation ou d&apos;une projection.</p>
        </Revele>
        {cas.length ? (
          <ul className="mt-12 grid gap-5 lg:grid-cols-3">
            {cas.map((e, i) => (
              <li key={e.id}>
                <Revele delai={i * 100} className="h-full">
                  <Carte e={e} />
                </Revele>
              </li>
            ))}
          </ul>
        ) : (
          <Revele className="mt-12 rounded-[1.75rem] border border-dashed border-charbon/25 p-8 md:p-12">
            <p className="titre text-[1.7rem]">Nos premières études de cas sont en cours de préparation.</p>
            <p className="mt-3 max-w-2xl text-[0.98rem] leading-relaxed text-gris-fonce">Nous ne publions que des chiffres réels, vérifiés et validés par les propriétaires concernés. En attendant, votre audit vous donne une analyse établie pour votre propre appartement.</p>
          </Revele>
        )}
      </div>
    </section>
  );
}
