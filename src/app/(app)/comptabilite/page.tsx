import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus, Wallet } from "lucide-react";
import { NavMois } from "@/components/nav-mois";
import { buttonClass, Card } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { aujourdhui, libelleMois, moisDe, moisValide } from "@/lib/dates";
import { formatMad, formatMontant } from "@/lib/format";
import type { ModeTva } from "@/lib/mode-tva";
import { lireModeTva } from "@/lib/mode-tva-serveur";
import { variation, type Totaux } from "@/lib/synthese";
import { chargerSynthese, libelleCategorie } from "./donnees";

export const metadata = { title: "Comptabilité" };

const commission = (t: Totaux, mode: ModeTva) => (mode === "ht" ? t.commissionHT : t.commissionTTC);

function Evolution({ precedent, actuel, inverse = false }: { precedent: number; actuel: number; inverse?: boolean }) {
  const v = variation(precedent, actuel);
  if (v === null) return <span className="text-[0.8rem] text-ink-3">Pas de comparaison</span>;
  const arrondi = Math.round(v);
  if (arrondi === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[0.8rem] text-ink-3">
        <Minus className="h-3.5 w-3.5" /> stable
      </span>
    );
  }
  const bon = inverse ? arrondi < 0 : arrondi > 0;
  const Icone = arrondi > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("num inline-flex items-center gap-1 text-[0.8rem] font-medium", bon ? "text-ok" : "text-danger")}>
      <Icone className="h-3.5 w-3.5" /> {arrondi > 0 ? "+" : ""}
      {arrondi} % <span className="font-normal text-ink-3">vs mois précédent</span>
    </span>
  );
}

export default async function PageSynthese({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const u = await exigerAcces("comptabilite");
  const sp = await searchParams;
  const courant = moisDe(aujourdhui());
  const mois = moisValide(sp.mois) ? sp.mois : courant;
  const mode = await lireModeTva();
  const { actuel, precedent, tauxTva } = await chargerSynthese(mois);
  const modifiable = peutModifier(u, "comptabilite");
  const t = actuel.total;
  const tp = precedent.total;
  const libelleCommission = mode === "ht" ? "Commissions HT" : "Commissions TTC";
  const vide = t.nbVersements === 0 && actuel.depensesTotal === 0;

  const suffixe = mode === "ht" ? "HT" : "TTC";
  const commissionNette = (tot: typeof t, depenses: number) => Math.round((commission(tot, mode) - depenses) * 100) / 100;
  const tuiles = [
    {
      titre: "Encaissements",
      valeur: t.encaisse,
      precedent: tp.encaisse,
      note: "ménage + commissions TTC",
      fort: true,
    },
    { titre: "Frais de ménage perçus", valeur: t.menage, precedent: tp.menage, note: `${t.nbVersements} versement${t.nbVersements > 1 ? "s" : ""} ce mois-ci` },
    { titre: "Dépenses", valeur: actuel.depensesTotal, precedent: precedent.depensesTotal, note: "non refacturées aux propriétaires", inverse: true },
    {
      titre: `Commissions nettes ${suffixe}`,
      valeur: commissionNette(t, actuel.depensesTotal),
      precedent: commissionNette(tp, precedent.depensesTotal),
      note: `commissions ${suffixe} − dépenses`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="enter flex flex-wrap items-center justify-between gap-3">
        <NavMois mois={mois} moisCourant={courant} lien={(m) => `/comptabilite?mois=${m}`} />
        {modifiable ? (
          <Link href="/comptabilite/versements/nouveau" className={buttonClass("primary")}>
            <Wallet className="h-4 w-4" /> Saisir un versement
          </Link>
        ) : null}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tuiles.map((c, i) => (
          <li key={c.titre} className="enter" style={{ "--i": i + 1 } as React.CSSProperties}>
            <Card className={cn("h-full p-5", c.fort && "!border-aub-900 !bg-aub-900 text-white")}>
              <p className={cn("text-sm", c.fort ? "text-aub-200" : "text-ink-2")}>{c.titre}</p>
              <p className="num mt-1 font-display text-[1.65rem] leading-tight font-semibold tracking-tight">
                {formatMontant(c.valeur)} <span className={cn("text-base font-medium", c.fort ? "text-aub-300" : "text-ink-3")}>MAD</span>
              </p>
              <p className={cn("mt-1 text-[0.8rem]", c.fort ? "text-aub-300" : "text-ink-3")}>{c.note}</p>
              <div className={cn("mt-3", c.fort && "[&_span]:!text-aub-200 [&_.text-ok]:!text-[oklch(0.82_0.14_152)] [&_.text-danger]:!text-[oklch(0.8_0.12_25)]")}>
                <Evolution precedent={c.precedent} actuel={c.valeur} inverse={c.inverse} />
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {vide ? (
        <Card className="enter flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">
            <Wallet className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-xl font-semibold tracking-tight capitalize">Rien d&apos;enregistré en {libelleMois(mois)}</h2>
          <p className="mt-1 max-w-md text-ink-2 text-pretty">Saisissez les versements reçus pour chaque réservation : tous les calculs se font automatiquement.</p>
        </Card>
      ) : (
        <>
          {/* Ordinateur : tableau */}
          <Card className="enter hidden overflow-hidden md:block" style={{ "--i": 5 } as React.CSSProperties}>
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-base font-semibold tracking-tight">Par logement</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[56rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[0.72rem] font-medium tracking-wide text-ink-3 uppercase">
                    <th className="px-5 py-2.5">Logement</th>
                    <th className="px-3 py-2.5 text-right">Nuits</th>
                    <th className="px-3 py-2.5 text-right">Montants reçus</th>
                    <th className="px-3 py-2.5 text-right">Loyers hors ménage</th>
                    <th className="px-3 py-2.5 text-right">{libelleCommission}</th>
                    <th className="px-3 py-2.5 text-right">Revenu propriétaire</th>
                    <th className="px-3 py-2.5 text-right">Ménage</th>
                    <th className="px-5 py-2.5 text-right">Dépenses</th>
                  </tr>
                </thead>
                <tbody>
                  {actuel.lignes.map((l) => (
                    <tr key={l.logementId} className="border-b border-line last:border-0">
                      <td className="px-5 py-3 font-medium">
                        <Link href={`/comptabilite/versements?mois=${mois}&logement=${l.logementId}`} className="press rounded hover:text-wine-700">
                          {l.nom}
                        </Link>
                      </td>
                      <td className="num px-3 py-3 text-right text-ink-2">{l.occupation === null ? "—" : `${l.nuits} · ${Math.round(l.occupation * 100)} %`}</td>
                      <td className="num px-3 py-3 text-right">{formatMontant(l.totaux.montantsRecus)}</td>
                      <td className="num px-3 py-3 text-right">{formatMontant(l.totaux.loyerNet)}</td>
                      <td className="num px-3 py-3 text-right font-semibold">{formatMontant(commission(l.totaux, mode))}</td>
                      <td className="num px-3 py-3 text-right">{formatMontant(l.totaux.revenuProprietaire)}</td>
                      <td className="num px-3 py-3 text-right">{formatMontant(l.totaux.menage)}</td>
                      <td className="num px-5 py-3 text-right text-ink-2">{l.depenses ? formatMontant(l.depenses) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-sunken/60 font-semibold">
                    <td className="px-5 py-3">Total</td>
                    <td className="px-3 py-3" />
                    <td className="num px-3 py-3 text-right">{formatMontant(t.montantsRecus)}</td>
                    <td className="num px-3 py-3 text-right">{formatMontant(t.loyerNet)}</td>
                    <td className="num px-3 py-3 text-right text-wine-700">{formatMontant(commission(t, mode))}</td>
                    <td className="num px-3 py-3 text-right">{formatMontant(t.revenuProprietaire)}</td>
                    <td className="num px-3 py-3 text-right">{formatMontant(t.menage)}</td>
                    <td className="num px-5 py-3 text-right">{formatMontant(actuel.lignes.reduce((s, l) => s + l.depenses, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Téléphone : une carte par logement */}
          <ul className="space-y-3 md:hidden">
            {actuel.lignes.map((l, i) => (
              <li key={l.logementId} className="enter" style={{ "--i": Math.min(i + 5, 9) } as React.CSSProperties}>
                <Card className="p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-base font-semibold tracking-tight">{l.nom}</h3>
                    <span className="num text-[0.8rem] text-ink-3">{l.occupation === null ? "—" : `${l.nuits} nuits · ${Math.round(l.occupation * 100)} %`}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                    {[
                      ["Montants reçus", l.totaux.montantsRecus],
                      ["Loyers hors ménage", l.totaux.loyerNet],
                      [libelleCommission, commission(l.totaux, mode)],
                      ["Revenu propriétaire", l.totaux.revenuProprietaire],
                      ["Ménage perçu", l.totaux.menage],
                      ["Dépenses", l.depenses],
                    ].map(([label, valeur]) => (
                      <div key={String(label)}>
                        <dt className="text-[0.78rem] text-ink-3">{String(label)}</dt>
                        <dd className="num font-medium">{formatMontant(Number(valeur))}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              </li>
            ))}
          </ul>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="enter p-5" style={{ "--i": 6 } as React.CSSProperties}>
              <h2 className="mb-3 font-display text-base font-semibold tracking-tight">Dépenses par catégorie</h2>
              {Object.keys(actuel.depensesParCategorie).length ? (
                <ul className="divide-y divide-line">
                  {Object.entries(actuel.depensesParCategorie)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, montant]) => (
                      <li key={cat} className="flex items-center justify-between py-2.5">
                        <span>{libelleCategorie(cat)}</span>
                        <span className="num font-medium">{formatMad(montant)}</span>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-3">Aucune dépense ce mois-ci.</p>
              )}
            </Card>
            <Card className="enter p-5" style={{ "--i": 7 } as React.CSSProperties}>
              <h2 className="mb-3 font-display text-base font-semibold tracking-tight">Comment lire ces chiffres</h2>
              <ul className="space-y-2 text-sm leading-relaxed text-ink-2 text-pretty">
                <li>
                  <strong className="text-ink">Commission TTC</strong> : ce que Perfect Stay reçoit réellement. Le <strong className="text-ink">HT</strong> s&apos;en déduit (TVA {String(tauxTva).replace(".", ",")} %). Utilisez l&apos;interrupteur HT | TTC en haut de page.
                </li>
                <li>
                  <strong className="text-ink">Revenu propriétaire</strong> : loyers hors ménage moins la commission TTC. Il est versé directement au propriétaire par la plateforme.
                </li>
                <li>
                  <strong className="text-ink">Solde</strong> : ce que Perfect Stay garde après ses dépenses du mois.
                </li>
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
