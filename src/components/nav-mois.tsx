import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { libelleMois, moisPrecedent, moisSuivant, type Mois } from "@/lib/dates";

/** Navigation d'un mois à l'autre ; `lien` fabrique l'adresse de la page pour un mois donné. */
export function NavMois({ mois, moisCourant, lien }: { mois: Mois; moisCourant: Mois; lien: (mois: Mois) => string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Link href={lien(moisPrecedent(mois))} aria-label="Mois précédent" className="press grid h-11 w-11 place-items-center rounded-xl border border-line-strong bg-surface shadow-card hover:bg-sunken">
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <h2 className="min-w-[8.5rem] text-center font-display text-lg font-semibold tracking-tight capitalize" aria-live="polite">
        {libelleMois(mois)}
      </h2>
      <Link href={lien(moisSuivant(mois))} aria-label="Mois suivant" className="press grid h-11 w-11 place-items-center rounded-xl border border-line-strong bg-surface shadow-card hover:bg-sunken">
        <ChevronRight className="h-5 w-5" />
      </Link>
      {mois !== moisCourant ? (
        <Link href={lien(moisCourant)} className="press ml-1 inline-flex h-9 items-center rounded-xl px-3.5 text-sm font-medium text-ink-2 hover:bg-sunken hover:text-ink">
          Ce mois-ci
        </Link>
      ) : null}
    </div>
  );
}
