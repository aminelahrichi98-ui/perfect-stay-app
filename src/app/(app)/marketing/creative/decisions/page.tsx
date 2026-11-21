import Link from "next/link";
import { Badge, Card, Notice } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { formatDevise, formatEntier, formatPourcent, indicateurs, libelleType, RECOMMANDATIONS, recommander, statutCreative, totaliser } from "@/lib/creative";
import { aujourdhui, moisDe, moisSuivant, premierDuMois } from "@/lib/dates";
import { charger, ScriptAFaire } from "../commun";
import { lienAngle, Vide } from "../elements";
import { chargerAngles, chargerCreatives, chargerPerformances, chargerReglages, totauxParAnnonce } from "../donnees";
import { FormulaireReglages, StatutCreative } from "./controles";

export default async function PageDecisions() {
  const u = await exigerAcces("marketing");
  const mois = moisDe(aujourdhui());
  const donnees = await charger(async () => {
    const [angles, creatives, perf, duMois, reglages] = await Promise.all([chargerAngles(), chargerCreatives(), chargerPerformances(), chargerPerformances(premierDuMois(mois), premierDuMois(moisSuivant(mois))), chargerReglages()]);
    return { angles, creatives, perf, duMois, reglages };
  });
  if (!donnees) return <ScriptAFaire />;
  const modifiable = peutModifier(u, "marketing");
  const r = donnees.reglages;
  const d = r.devise;
  const parAnnonce = totauxParAnnonce(donnees.perf.lignes);
  const depenseMois = totaliser(donnees.duMois.lignes).depenses;
  const part = r.budgetMensuel > 0 ? Math.min(100, Math.round((depenseMois / r.budgetMensuel) * 100)) : 0;

  const suivies = donnees.creatives.filter((c) => c.metaAdId && c.statut !== "archivee").map((c) => ({ c, t: parAnnonce.get(c.metaAdId!) ?? { depenses: 0, impressions: 0, clics: 0, leads: 0 } }));
  const ordre = { PAUSE: 0, TEST_NEW_IMAGE: 1, CONTINUE: 2, INSUFFICIENT_DATA: 3 } as const;
  const avis = suivies.map((s) => ({ ...s, avis: recommander(s.t, r), i: indicateurs(s.t) })).sort((a, b) => ordre[a.avis.statut] - ordre[b.avis.statut] || b.t.depenses - a.t.depenses);
  const parAngle = donnees.angles
    .filter((a) => a.statut !== "archived")
    .map((a) => {
      const t = totaliser(suivies.filter((s) => s.c.angleId === a.id).map((s) => s.t));
      return { a, t, avis: recommander(t, r), n: suivies.filter((s) => s.c.angleId === a.id).length };
    })
    .filter((x) => x.n > 0);
  const sansAnnonce = donnees.creatives.filter((c) => !c.metaAdId && c.statut !== "archivee").length;

  return (
    <div className="space-y-6">
      {!r.cplConfirme ? <Notice ton="info">Le CPL cible de {formatDevise(r.cplCible, d)} est une valeur de départ. Confirmez-le ou modifiez-le dans les réglages ci-dessous : toutes les recommandations en dépendent.</Notice> : null}

      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-ink-2">Budget du mois en cours</p>
            <p className="num mt-1 font-display text-2xl font-semibold tracking-tight">
              {formatDevise(depenseMois, d)} <span className="text-base font-medium text-ink-3">sur {formatDevise(r.budgetMensuel, d)}</span>
            </p>
          </div>
          <p className="num text-sm text-ink-2">{part} % du budget</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunken" role="img" aria-label={`${part} % du budget mensuel dépensé`}>
          <div className={`h-full rounded-full ${depenseMois > r.budgetMensuel ? "bg-danger" : "bg-wine-500"}`} style={{ width: `${part}%` }} />
        </div>
        <p className="mt-2 text-[0.82rem] text-ink-3">D&apos;après les performances importées dont la période est dans le mois en cours.</p>
      </Card>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">Par image</h2>
        <p className="max-w-prose text-sm text-ink-2 text-pretty">Chaque recommandation explique ses raisons. Rien n&apos;est appliqué automatiquement : c&apos;est vous qui changez le statut d&apos;une image, ici ou dans Meta Ads Manager.</p>
        {avis.length ? (
          <ul className="space-y-3">
            {avis.map(({ c, i, avis: a }) => {
              const rec = RECOMMANDATIONS[a.statut];
              return (
                <li key={c.id}>
                  <Card className="grid gap-4 p-4 md:grid-cols-[auto_minmax(0,1fr)_13rem] md:items-start">
                    {c.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- adresse temporaire du stockage privé
                      <img src={c.imageUrl} alt="" loading="lazy" className="h-20 w-20 rounded-xl object-cover" />
                    ) : (
                      <span className="h-20 w-20 rounded-xl bg-sunken" />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="num font-medium">{c.code}</span>
                        <Badge ton={rec.ton}>{rec.label}</Badge>
                      </div>
                      <p className="mt-0.5 text-[0.82rem] text-ink-3">
                        {libelleType(c.type)} ·{" "}
                        <Link href={lienAngle(c.angleId)} className="underline underline-offset-4">
                          {c.angleNom}
                        </Link>
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-ink-2">
                        {a.raisons.map((x) => (
                          <li key={x} className="text-pretty">
                            {x}
                          </li>
                        ))}
                      </ul>
                      <p className="num mt-2 text-[0.82rem] text-ink-3">
                        {formatDevise(i.depenses, d)} · {formatEntier(i.impressions)} impressions · CTR {formatPourcent(i.ctr)} · {i.leads} lead{i.leads > 1 ? "s" : ""} · CPL {formatDevise(i.cpl, d)}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[0.82rem] text-ink-3">Statut actuel</p>
                      {modifiable ? <StatutCreative id={c.id} statut={c.statut} code={c.code} /> : <Badge ton={statutCreative(c.statut).ton}>{statutCreative(c.statut).label}</Badge>}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        ) : (
          <Vide titre="Aucune image suivie pour l'instant">Une image apparaît ici dès qu&apos;elle porte un Meta Ad ID. Publiez l&apos;image dans Meta Ads Manager, copiez l&apos;identifiant de la publicité sur sa fiche, puis importez les performances.</Vide>
        )}
        {sansAnnonce ? <p className="text-[0.82rem] text-ink-3">{sansAnnonce} image(s) n&apos;ont pas encore de Meta Ad ID et ne peuvent pas être évaluées.</p> : null}
      </section>

      {parAngle.length ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">Par angle</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {parAngle.map(({ a, t, avis: av, n }) => {
              const rec = RECOMMANDATIONS[av.statut];
              const i = indicateurs(t);
              return (
                <li key={a.id}>
                  <Card className="h-full p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={lienAngle(a.id)} className="font-medium underline-offset-4 hover:underline">
                        <span className="num text-ink-3">{a.code}</span> {a.nom}
                      </Link>
                      <Badge ton={rec.ton}>{rec.label}</Badge>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-ink-2">
                      {av.raisons.map((x) => (
                        <li key={x} className="text-pretty">
                          {x}
                        </li>
                      ))}
                    </ul>
                    <p className="num mt-2 text-[0.82rem] text-ink-3">
                      {n} image{n > 1 ? "s" : ""} suivie{n > 1 ? "s" : ""} · {formatDevise(i.depenses, d)} · {i.leads} lead{i.leads > 1 ? "s" : ""} · CPL {formatDevise(i.cpl, d)}
                    </p>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">Réglages</h2>
        <Card className="p-5">{modifiable ? <FormulaireReglages reglages={r} /> : <p className="text-sm text-ink-2">CPL cible : {formatDevise(r.cplCible, d)} · budget mensuel : {formatDevise(r.budgetMensuel, d)}.</p>}</Card>
      </section>
    </div>
  );
}
