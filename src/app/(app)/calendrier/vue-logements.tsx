import Link from "next/link";
import { cn } from "@/lib/cn";
import { etatsDuMois, joursDuMois, nuitsReservees, tauxOccupation, type ReservationCalendrier } from "@/lib/calendrier";
import type { Mois } from "@/lib/dates";
import { ZoneDefilante } from "./zone-defilante";

const LETTRES = ["L", "M", "M", "J", "V", "S", "D"];
const NOMS_JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

type Ligne = { id: string; nom: string; ville: string; reservations: ReservationCalendrier[] };

/** Tous les logements en lignes, les jours du mois en colonnes : les nuits réservées sont en vert. */
export function VueLogements({ mois, aujourdhui, lignes }: { mois: Mois; aujourdhui: string; lignes: Ligne[] }) {
  const jours = joursDuMois(mois);
  const indexJour = (j: string) => (new Date(`${j}T00:00:00Z`).getUTCDay() + 6) % 7;

  return (
    <ZoneDefilante>
      <table className="w-full border-separate border-spacing-0">
        <caption className="sr-only">Occupation des logements, jour par jour</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 min-w-[10.5rem] border-b border-line bg-surface px-4 py-2 text-left text-xs font-medium tracking-wide text-ink-3 uppercase">
              Logement
            </th>
            {jours.map((j) => {
              const i = indexJour(j);
              const weekend = i >= 5;
              const aujourd = j === aujourdhui;
              return (
                <th
                  key={j}
                  scope="col"
                  data-jour-courant={aujourd ? "" : undefined}
                  className={cn("w-9 min-w-9 border-b border-line px-0 py-1.5 text-center", weekend && "bg-sunken/70", aujourd && "bg-wine-50")}
                >
                  <span className="sr-only">{NOMS_JOURS[i]} </span>
                  <span className="block text-[0.65rem] font-medium text-ink-3 uppercase" aria-hidden="true">
                    {LETTRES[i]}
                  </span>
                  <span className={cn("num mx-auto mt-0.5 grid h-6 w-6 place-items-center rounded-full text-[0.78rem]", aujourd ? "bg-wine-600 font-semibold text-white" : "text-ink")}>
                    {Number(j.slice(8))}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => {
            const etats = etatsDuMois(mois, l.reservations);
            const nuits = nuitsReservees(etats);
            const taux = Math.round(tauxOccupation(etats) * 100);
            return (
              <tr key={l.id}>
                <th scope="row" className="sticky left-0 z-10 border-b border-line bg-surface px-4 py-2 text-left font-normal">
                  <Link href={`/calendrier?vue=mois&logement=${l.id}&mois=${mois}`} className="press block min-w-0 rounded-lg">
                    <span className="block max-w-[9rem] truncate font-medium">{l.nom}</span>
                    <span className="num block text-[0.78rem] text-ink-3">
                      {nuits} nuit{nuits > 1 ? "s" : ""} · {taux} %
                    </span>
                  </Link>
                </th>
                {etats.map((e) => {
                  const weekend = indexJour(e.jour) >= 5;
                  const aujourd = e.jour === aujourdhui;
                  return (
                    <td key={e.jour} className={cn("relative h-14 border-b border-line p-0", weekend && "bg-sunken/70", aujourd && "bg-wine-50")}>
                      {e.etat !== "libre" && e.reservationId ? (
                        <button
                          type="button"
                          data-resa={e.reservationId}
                          aria-label={`${l.nom}, ${e.etat === "nuit" ? "nuit réservée" : "nuit bloquée"} le ${e.jour.split("-").reverse().join("/")}`}
                          className={cn(
                            "absolute inset-y-3 transition-colors duration-150 focus-visible:z-10",
                            e.etat === "nuit" ? "bg-nuit hover:bg-nuit-fort" : "hachures",
                            e.debut ? "left-[3px] rounded-l-lg" : "left-0",
                            e.fin ? "right-[3px] rounded-r-lg" : "right-0",
                          )}
                        />
                      ) : null}
                      {e.depart ? (
                        <span title="Départ : jour de ménage" aria-hidden="true" className="pointer-events-none absolute bottom-1 left-1/2 z-[1] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-wine-600" />
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </ZoneDefilante>
  );
}
