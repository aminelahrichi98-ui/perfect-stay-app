import { cn } from "@/lib/cn";
import { etatsDuMois, grilleMois, type ReservationCalendrier } from "@/lib/calendrier";
import { formatJour, nbNuits, type Mois } from "@/lib/dates";

const ENTETES = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

/** Un logement, un mois : grille façon Airbnb, les nuits réservées en vert. */
export function VueMois({
  mois,
  aujourdhui,
  nomLogement,
  reservations,
  plateformes,
}: {
  mois: Mois;
  aujourdhui: string;
  nomLogement: string;
  reservations: ReservationCalendrier[];
  plateformes: Record<string, string>;
}) {
  const etats = new Map(etatsDuMois(mois, reservations).map((e) => [e.jour, e]));
  const semaines = grilleMois(mois);
  const parId = new Map(reservations.map((r) => [r.id, r]));

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="grid grid-cols-7 border-b border-line bg-sunken/50 text-center text-xs font-medium tracking-wide text-ink-3 uppercase" aria-hidden="true">
        {ENTETES.map((e) => (
          <div key={e} className="py-2">
            {e}
          </div>
        ))}
      </div>
      <div role="grid" aria-label={`Calendrier de ${nomLogement}`}>
        {semaines.map((semaine, s) => (
          <div role="row" key={s} className="grid grid-cols-7">
            {semaine.map((jour, c) => {
              if (!jour) return <div role="gridcell" key={c} className="min-h-[4.25rem] border-b border-l border-line bg-sunken/30 first:border-l-0 md:min-h-[5.5rem]" />;
              const e = etats.get(jour)!;
              const aujourd = jour === aujourdhui;
              const resa = e.reservationId ? parId.get(e.reservationId) : undefined;
              const afficherEtiquette = e.etat !== "libre" && resa && (e.debut || c === 0);
              const nuits = resa ? nbNuits(resa.arrivee, resa.depart) : 0;
              return (
                <div
                  role="gridcell"
                  key={c}
                  className={cn("relative min-h-[4.25rem] border-b border-l border-line first:border-l-0 md:min-h-[5.5rem]", c >= 5 && "bg-sunken/40", aujourd && "bg-wine-50")}
                >
                  <span className={cn("num absolute top-1.5 left-2 grid h-6 min-w-6 place-items-center rounded-full px-1 text-[0.8rem]", aujourd ? "bg-wine-600 font-semibold text-white" : "text-ink-2")}>
                    {Number(jour.slice(8))}
                  </span>
                  {e.etat !== "libre" && e.reservationId ? (
                    <button
                      type="button"
                      data-resa={e.reservationId}
                      aria-label={`${e.etat === "nuit" ? "Réservation" : "Nuits bloquées"} du ${formatJour(resa?.arrivee ?? jour)} au ${formatJour(resa?.depart ?? jour)}`}
                      className={cn(
                        "absolute bottom-2 flex h-7 items-center overflow-hidden px-2 text-left text-[0.72rem] font-medium whitespace-nowrap transition-colors duration-150 md:h-8 md:text-xs",
                        e.etat === "nuit" ? "bg-nuit text-white hover:bg-nuit-fort" : "hachures text-ink-2",
                        e.debut ? "left-1.5 rounded-l-lg" : "left-0",
                        e.fin ? "right-1.5 rounded-r-lg" : "right-0",
                      )}
                    >
                      {afficherEtiquette ? (
                        <span className="truncate">
                          {e.etat === "nuit" ? `${nuits} nuit${nuits > 1 ? "s" : ""} · ${plateformes[e.reservationId] ?? ""}` : "Bloqué"}
                        </span>
                      ) : null}
                    </button>
                  ) : null}
                  {e.depart ? (
                    <span title="Départ : jour de ménage" aria-hidden="true" className="pointer-events-none absolute top-2.5 right-2 h-2 w-2 rounded-full bg-wine-600" />
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
