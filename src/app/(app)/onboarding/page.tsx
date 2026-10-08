import Link from "next/link";
import { Plus, Rocket } from "lucide-react";
import { Badge, buttonClass, Card, PageHeader } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { ETAPES_ONBOARDING, progression } from "@/lib/operations";
import { lireSuivis } from "./donnees";

export const metadata = { title: "Onboarding" };

export default async function PageOnboarding() {
  const u = await exigerAcces("onboarding");
  const suivis = await lireSuivis(["onboarding"]);
  const peutCreer = u.admin || Boolean(u.droits.logements?.modifier);
  return (
    <>
      <PageHeader
        titre="Onboarding"
        description="L'intégration d'un nouveau logement, étape par étape. Quand tout est fait, il passe en « Actif »."
        action={
          peutCreer ? (
            <Link href="/logements/nouveau" className={buttonClass("primary", "md")}>
              <Plus className="h-4 w-4" /> Nouveau logement
            </Link>
          ) : undefined
        }
      />
      {suivis.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {suivis.map((s, i) => {
            const pct = progression(s.faites, ETAPES_ONBOARDING.length);
            const prochaine = s.etapes.find((e) => !e.fait);
            return (
              <li key={s.id} className="enter" style={{ "--i": i } as React.CSSProperties}>
                <Link href={`/onboarding/${s.id}`} className="press block h-full rounded-2xl border border-line bg-surface p-5 shadow-card hover:border-wine-300">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-lg font-semibold tracking-tight">{s.nom}</h2>
                      <p className="truncate text-sm text-ink-3">{s.ville || "Ville non renseignée"}</p>
                    </div>
                    <span className="num font-display text-2xl font-semibold">{pct} %</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Avancement de ${s.nom}`}>
                    <div className="h-full rounded-full bg-wine-600" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-3 text-sm text-ink-2">
                    {s.faites} étape{s.faites > 1 ? "s" : ""} sur {ETAPES_ONBOARDING.length}
                    {prochaine ? <span className="text-ink-3"> · prochaine : {prochaine.libelle.toLowerCase()}</span> : null}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card className="enter flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">
            <Rocket className="h-7 w-7" />
          </span>
          <Badge ton="marque" className="mt-5">
            Aucun logement en onboarding
          </Badge>
          <h2 className="mt-3 font-display text-xl font-semibold tracking-tight">Tout est en ligne</h2>
          <p className="mt-1 max-w-md text-ink-2 text-pretty">Créez un logement avec le statut « Onboarding » pour suivre les 8 étapes de son intégration.</p>
        </Card>
      )}
    </>
  );
}
