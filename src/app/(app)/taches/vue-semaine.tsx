import Link from "next/link";
import { AlertTriangle, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { ajouterJours, libelleJourCourt, type Jour } from "@/lib/dates";
import { comparerTaches, enRetard, joursDeLaSemaine } from "@/lib/taches";
import { CarteTache, type CarteData } from "./carte-tache";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/** Semaine du lundi au dimanche : une colonne par jour sur ordinateur, une liste par jour sur téléphone. */
export function VueSemaine({ taches, lundi, aujourdhui, peutModifier, filtresUrl }: { taches: CarteData[]; lundi: Jour; aujourdhui: string; peutModifier: boolean; filtresUrl: string }) {
  const jours = joursDeLaSemaine(lundi);
  const dimanche = ajouterJours(lundi, 6);
  const visibles = taches.filter((t) => t.statut !== "annule");
  const parJour = (j: Jour) => visibles.filter((t) => t.echeance === j).sort(comparerTaches);
  // Ce qui est en retard reste visible tant que ce n'est pas fait, même sur une autre semaine
  const retard = visibles.filter((t) => enRetard(t, aujourdhui) && t.echeance! < lundi).sort(comparerTaches);
  const sansDate = visibles.filter((t) => !t.echeance && t.statut !== "termine").sort(comparerTaches);

  return (
    <div className="space-y-5">
      {retard.length ? (
        <section aria-labelledby="retard" className="rounded-2xl border border-danger/30 bg-danger-bg/50 p-3">
          <h2 id="retard" className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-danger">
            <AlertTriangle className="h-4 w-4" /> En retard <span className="num font-medium">({retard.length})</span>
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {retard.map((t) => (
              <li key={t.id}>
                <CarteTache t={t} aujourdhui={aujourdhui} afficherStatut />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-3 md:grid-cols-7">
        {jours.map((j, i) => {
          const liste = parJour(j);
          const aujourd = j === aujourdhui;
          return (
            <section key={j} aria-labelledby={`j-${j}`} className={cn("min-w-0 rounded-2xl p-2.5", aujourd ? "bg-wine-50 ring-2 ring-wine-300" : "bg-sunken/70", i >= 5 && !aujourd && "bg-sunken/40")}>
              <header className="mb-2 flex items-center justify-between px-1">
                <h2 id={`j-${j}`} className={cn("text-sm font-semibold", aujourd && "text-wine-800")}>
                  <span className="md:hidden">{JOURS[i]} </span>
                  <span className="hidden md:inline">{libelleJourCourt(j).split(" ")[0]} </span>
                  <span className="num">{Number(j.slice(8))}</span>
                  {aujourd ? <span className="ml-1.5 text-xs font-medium">· aujourd&apos;hui</span> : null}
                </h2>
                {peutModifier ? (
                  <Link href={`/taches/nouvelle?echeance=${j}${filtresUrl}`} aria-label={`Ajouter une tâche le ${JOURS[i].toLowerCase()} ${Number(j.slice(8))}`} className="press grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-surface hover:text-ink">
                    <Plus className="h-4 w-4" />
                  </Link>
                ) : null}
              </header>
              <ul className="space-y-2">
                {liste.map((t) => (
                  <li key={t.id}>
                    <CarteTache t={t} aujourdhui={aujourdhui} compacte afficherStatut />
                  </li>
                ))}
                {!liste.length ? <li className="px-1 py-2 text-sm text-ink-3 md:hidden">Rien de prévu</li> : null}
              </ul>
            </section>
          );
        })}
      </div>

      {sansDate.length ? (
        <section aria-labelledby="sans-date" className="rounded-2xl bg-sunken/70 p-3">
          <h2 id="sans-date" className="mb-2 px-1 text-sm font-semibold">
            Sans date <span className="num font-medium text-ink-3">({sansDate.length})</span>
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sansDate.map((t) => (
              <li key={t.id}>
                <CarteTache t={t} aujourdhui={aujourdhui} afficherStatut />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="sr-only">Semaine du {lundi} au {dimanche}</p>
    </div>
  );
}
