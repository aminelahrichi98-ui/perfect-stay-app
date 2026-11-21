import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { formatDevise, formatEntier, formatPourcent, indicateurs, libelleSegment, statutAngle, totaliser } from "@/lib/creative";
import { charger, ScriptAFaire } from "../../commun";
import { LienRetour, Vide } from "../../elements";
import { chargerAngles, chargerCreatives, chargerPerformances, chargerReglages, totauxParAnnonce } from "../../donnees";
import { Galerie } from "../../galerie";
import { ActionsAngle } from "./fiche";

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-medium tracking-wide text-ink-3 uppercase">{titre}</h3>
      <div className="mt-1.5 text-[0.95rem] text-pretty whitespace-pre-line">{children || <span className="text-ink-3">Non renseigné</span>}</div>
    </div>
  );
}

export default async function PageAngle({ params }: { params: Promise<{ id: string }> }) {
  const u = await exigerAcces("marketing");
  const { id } = await params;
  const donnees = await charger(async () => {
    const [angles, creatives, perf, reglages] = await Promise.all([chargerAngles(), chargerCreatives({ angleId: id }), chargerPerformances(), chargerReglages()]);
    return { angles, creatives, perf, reglages };
  });
  if (!donnees) return <ScriptAFaire />;
  const angle = donnees.angles.find((a) => a.id === id);
  if (!angle) notFound();
  const modifiable = peutModifier(u, "marketing");
  const s = statutAngle(angle.statut);
  const parAnnonce = totauxParAnnonce(donnees.perf.lignes);
  const i = indicateurs(totaliser(donnees.creatives.flatMap((c) => (c.metaAdId && parAnnonce.has(c.metaAdId) ? [parAnnonce.get(c.metaAdId)!] : []))));
  const d = donnees.reglages.devise;
  const chiffres = [
    { titre: "Dépenses", valeur: formatDevise(i.depenses, d) },
    { titre: "Leads", valeur: formatEntier(i.leads) },
    { titre: "CPL", valeur: formatDevise(i.cpl, d) },
    { titre: "CTR lien", valeur: formatPourcent(i.ctr) },
  ];

  return (
    <div className="space-y-6">
      <LienRetour href="/marketing/creative">Tous les angles</LienRetour>
      <Card className="p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="num text-sm font-medium tracking-wide text-ink-3">{angle.code}</span>
              <Badge ton={s.ton}>{s.label}</Badge>
              <Badge>{libelleSegment(angle.segment)}</Badge>
            </div>
            <h2 className="mt-2 font-display text-2xl leading-tight font-semibold tracking-tight text-balance md:text-[1.75rem]">{angle.nom}</h2>
          </div>
          {modifiable ? <ActionsAngle angle={angle} /> : null}
        </div>
        {angle.hook ? <p className="mt-5 rounded-xl bg-wine-50 px-4 py-3 font-display text-lg leading-snug text-wine-800 text-pretty">« {angle.hook} »</p> : null}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Bloc titre="Problème principal">{angle.problemePrincipal}</Bloc>
          <Bloc titre="Problèmes secondaires">
            {angle.problemesSecondaires.length ? (
              <ul className="list-disc space-y-1 pl-5">
                {angle.problemesSecondaires.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            ) : null}
          </Bloc>
          <Bloc titre="Conséquences financières">{angle.consequences}</Bloc>
          <Bloc titre="USP">{angle.usp}</Bloc>
          <Bloc titre="Solution Perfect Stay">{angle.solution}</Bloc>
          <Bloc titre="CTA">{angle.cta}</Bloc>
        </div>
      </Card>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {chiffres.map((c) => (
          <li key={c.titre}>
            <Card className="h-full p-4">
              <p className="text-sm text-ink-2">{c.titre}</p>
              <p className="num mt-1 font-display text-2xl leading-tight font-semibold tracking-tight">{c.valeur}</p>
              <p className="mt-1 text-[0.78rem] text-ink-3">toutes ses images, toute la période</p>
            </Card>
          </li>
        ))}
      </ul>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">Images de cet angle</h2>
        <Galerie
          creatives={donnees.creatives}
          angles={[{ id: angle.id, code: angle.code, nom: angle.nom }]}
          angleFixe={angle.id}
          modifiable={modifiable}
          vide={<Vide titre="Aucune image pour cet angle">Créez plusieurs types d&apos;images pour le même angle : c&apos;est en les comparant que l&apos;on voit ce qui fonctionne.</Vide>}
        />
      </section>
    </div>
  );
}
