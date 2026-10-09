import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { Evolution } from "@/components/evolution";
import { exigerAcces, peutVoir } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { aujourdhui, formatJour, moisDe } from "@/lib/dates";
import { formatJourLong, formatMontant, momentDeLaJournee } from "@/lib/format";
import { MODULE_BY_KEY } from "@/lib/modules";
import { lireModeTva } from "@/lib/mode-tva-serveur";
import { prioriteDe } from "@/lib/taches";
import { chargerSynthese } from "../comptabilite/donnees";
import { lireIndicateurs } from "../crm/donnees";
import { lienTache } from "../taches/carte-tache";
import { lireBudgetMarketing, lireTachesDuJour, lireTauxReservation } from "./donnees";

export const metadata = { title: "Dashboard" };

type Carte = { titre: string; valeur: string; note: string; evolution?: React.ReactNode; href: string };

export default async function Dashboard() {
  const u = await exigerAcces("dashboard");
  const moment = momentDeLaJournee();
  const salut = moment === "soir" ? "Bonsoir" : "Bonjour";
  const auj = aujourdhui();
  const mois = moisDe(auj);
  const mode = await lireModeTva();
  const sansErreur = <T,>(p: Promise<T>) => p.catch(() => null);

  // Chaque bloc n'est chargé que si l'utilisateur a le droit du module concerné
  const [taux, synthese, crm, marketing, taches] = await Promise.all([
    peutVoir(u, "calendrier") ? sansErreur(lireTauxReservation()) : null,
    peutVoir(u, "comptabilite") ? sansErreur(chargerSynthese(mois)) : null,
    peutVoir(u, "crm") ? sansErreur(lireIndicateurs()) : null,
    peutVoir(u, "marketing") ? sansErreur(lireBudgetMarketing()) : null,
    sansErreur(lireTachesDuJour()),
  ]);

  const cartes: Carte[] = [];
  if (taux) {
    cartes.push({
      titre: "Biens réservés",
      valeur: taux.aujourdhui.total ? `${taux.aujourdhui.occupes} sur ${taux.aujourdhui.total}` : "—",
      note: `cette nuit · occupation du mois ${Math.round(taux.mois * 100)} %`,
      evolution: <Evolution precedent={taux.moisPrecedent} actuel={taux.mois} />,
      href: "/calendrier",
    });
  }
  if (synthese) {
    const t = synthese.actuel.total;
    const p = synthese.precedent.total;
    const c = (x: typeof t) => (mode === "ht" ? x.commissionHT : x.commissionTTC);
    cartes.push({
      titre: `Commissions du mois ${mode === "ht" ? "HT" : "TTC"}`,
      valeur: `${formatMontant(c(t))} MAD`,
      note: `${t.nbVersements} versement${t.nbVersements > 1 ? "s" : ""} saisi${t.nbVersements > 1 ? "s" : ""}`,
      evolution: <Evolution precedent={c(p)} actuel={c(t)} />,
      href: "/comptabilite",
    });
  }
  if (crm) {
    cartes.push({ titre: "Leads appelés", valeur: String(crm.appelesSemaine), note: "depuis lundi", href: "/crm" });
    cartes.push({ titre: "Biens signés", valeur: String(crm.signesMois), note: "depuis le début du mois", href: "/crm" });
  }
  if (marketing) {
    cartes.push({
      titre: "Budget marketing",
      valeur: `${formatMontant(marketing.mois)} MAD`,
      note: "dépensé ce mois",
      evolution: <Evolution precedent={marketing.precedent} actuel={marketing.mois} inverse />,
      href: "/marketing",
    });
  }

  const lignes = synthese ? synthese.actuel.lignes.filter((l) => l.totaux.nbVersements > 0 || l.occupation !== null) : [];

  return (
    <>
      <header className="enter mb-6">
        <p className="text-sm font-medium text-ink-3 capitalize">{formatJourLong()}</p>
        <h1 className="mt-1 font-display text-[1.9rem] leading-tight font-semibold tracking-tight md:text-4xl">
          {salut} {u.prenom}
        </h1>
      </header>

      {cartes.length ? (
        <ul className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
          {cartes.map((c, i) => (
            <li key={c.titre} className="enter" style={{ "--i": i } as React.CSSProperties}>
              <Link href={c.href} className="press group block h-full">
                <Card className="flex h-full flex-col p-4 transition-[border-color,box-shadow] duration-150 group-hover:border-line-strong group-hover:shadow-pop">
                  <p className="flex items-center justify-between gap-2 text-sm text-ink-2">
                    {c.titre}
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-3 transition-transform duration-150 ease-[var(--ease-out)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </p>
                  <p className="num mt-1 font-display text-[1.65rem] leading-tight font-semibold tracking-tight">{c.valeur}</p>
                  <p className="mt-1 text-[0.8rem] text-ink-3 text-pretty">{c.note}</p>
                  {c.evolution ? <div className="mt-auto pt-2.5">{c.evolution}</div> : null}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_24rem]">
        {lignes.length ? (
          <section aria-labelledby="par-logement" className="enter min-w-0" style={{ "--i": 4 } as React.CSSProperties}>
            <h2 id="par-logement" className="mb-3 font-display text-lg font-semibold tracking-tight">
              Par logement <span className="text-sm font-normal text-ink-3">· ce mois</span>
            </h2>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[0.72rem] font-medium tracking-wide text-ink-3 uppercase">
                      <th className="px-5 py-2.5">Logement</th>
                      <th className="px-3 py-2.5 text-right">Loyers hors ménage</th>
                      <th className="px-3 py-2.5 text-right">Commission {mode === "ht" ? "HT" : "TTC"}</th>
                      <th className="px-5 py-2.5 text-right">Occupation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {lignes.map((l) => (
                      <tr key={l.logementId}>
                        <td className="px-5 py-3 font-medium">{l.nom}</td>
                        <td className="num px-3 py-3 text-right">{formatMontant(l.totaux.loyerNet)}</td>
                        <td className="num px-3 py-3 text-right font-semibold">{formatMontant(mode === "ht" ? l.totaux.commissionHT : l.totaux.commissionTTC)}</td>
                        <td className="num px-5 py-3 text-right">{l.occupation === null ? <span className="text-ink-3">—</span> : `${Math.round(l.occupation * 100)} %`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        ) : null}

        <section aria-labelledby="taches-jour" className={cn("enter min-w-0", !lignes.length && "xl:col-span-2 xl:max-w-2xl")} style={{ "--i": 5 } as React.CSSProperties}>
          <h2 id="taches-jour" className="mb-3 flex items-center justify-between gap-2 font-display text-lg font-semibold tracking-tight">
            <span>Tâches du jour et en retard</span>
            {taches?.retard ? (
              <Badge ton="danger">
                <AlertTriangle className="h-3 w-3" /> {taches.retard} en retard
              </Badge>
            ) : null}
          </h2>
          <Card className="overflow-hidden">
            {taches?.taches.length ? (
              <ul className="divide-y divide-line">
                {taches.taches.map((t) => {
                  const retard = (t.echeance ?? "") < auj;
                  const p = prioriteDe(t.priorite);
                  return (
                    <li key={t.id}>
                      <Link href={lienTache(t)} className="press flex items-center gap-3 px-4 py-3 hover:bg-sunken/60">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{t.titre}</span>
                          <span className={cn("num block text-sm", retard ? "font-medium text-danger" : "text-ink-3")}>
                            {t.echeance ? formatJour(t.echeance) : ""}
                            {retard ? " · en retard" : " · aujourd'hui"} · {t.pole}
                          </span>
                        </span>
                        {t.priorite !== "normal" ? <Badge ton={p.ton}>{p.label}</Badge> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="flex items-center gap-2.5 px-5 py-6 text-ink-2">
                <CheckCircle2 className="h-5 w-5 text-ok" /> Rien d&apos;urgent : aucune tâche du jour ni en retard.
              </p>
            )}
            {peutVoir(u, "taches") ? (
              <Link href="/taches" className="press block border-t border-line px-4 py-3 text-sm font-medium text-wine-700 hover:bg-sunken/60">
                Voir toutes les tâches
              </Link>
            ) : null}
          </Card>
        </section>
      </div>

      {!cartes.length && !lignes.length ? (
        <p className="mt-6 max-w-prose text-ink-2 text-pretty">
          Votre tableau de bord affichera ici les chiffres des modules auxquels vous avez accès, dont {MODULE_BY_KEY.taches.label.toLowerCase()} du jour.
        </p>
      ) : null}
    </>
  );
}
