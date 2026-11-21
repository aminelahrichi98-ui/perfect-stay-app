import { cn } from "@/lib/cn";
import { formatDevise, formatEntier, formatPourcent, type Indicateurs } from "@/lib/creative";

export type LigneTableau = { cle: string; titre: React.ReactNode; sous?: React.ReactNode; i: Indicateurs; apres?: React.ReactNode };

function Cellules({ i, fort, devise }: { i: Indicateurs; fort?: boolean; devise: string }) {
  return (
    <>
      <td className={cn("num px-3 py-2.5 text-right whitespace-nowrap", fort && "font-semibold")}>{formatDevise(i.depenses, devise)}</td>
      <td className="num px-3 py-2.5 text-right">{formatEntier(i.impressions)}</td>
      <td className="num px-3 py-2.5 text-right">{formatEntier(i.clics)}</td>
      <td className="num px-3 py-2.5 text-right whitespace-nowrap">{formatPourcent(i.ctr)}</td>
      <td className="num px-3 py-2.5 text-right whitespace-nowrap">{formatDevise(i.cpc, devise)}</td>
      <td className="num px-3 py-2.5 text-right">{formatEntier(i.leads)}</td>
      <td className={cn("num px-3 py-2.5 text-right whitespace-nowrap", fort && "font-semibold")}>{formatDevise(i.cpl, devise)}</td>
    </>
  );
}

/** Tableau de performances : une ligne par élément, un total calculé sur les sommes, et une barre de dépenses. */
export function TableauPerformances({ lignes, total, devise, entete }: { lignes: LigneTableau[]; total: Indicateurs; devise: string; entete: string }) {
  const max = Math.max(...lignes.map((l) => l.i.depenses), 0.01);
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
      <table className="w-full min-w-[52rem] text-sm">
        <thead className="bg-sunken text-[0.8rem] text-ink-2">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium">{entete}</th>
            {["Dépenses", "Impressions", "Clics", "CTR lien", "CPC lien", "Leads", "CPL"].map((h) => (
              <th key={h} className="px-3 py-2.5 text-right font-medium">
                {h}
              </th>
            ))}
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {lignes.map((l) => (
            <tr key={l.cle} className="align-top">
              <td className="px-4 py-2.5">
                <div className="min-w-0">{l.titre}</div>
                {l.sous ? <div className="mt-0.5 text-[0.8rem] text-ink-3">{l.sous}</div> : null}
                <div className="mt-1.5 h-1.5 w-40 max-w-full overflow-hidden rounded-full bg-sunken" role="img" aria-label="Part des dépenses">
                  <div className="h-full rounded-full bg-wine-500" style={{ width: `${Math.round((l.i.depenses / max) * 100)}%` }} />
                </div>
              </td>
              <Cellules i={l.i} devise={devise} />
              <td className="px-3 py-2.5 text-right">{l.apres}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-line-strong bg-sunken/60">
          <tr>
            <td className="px-4 py-2.5 font-semibold">Total</td>
            <Cellules i={total} fort devise={devise} />
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
