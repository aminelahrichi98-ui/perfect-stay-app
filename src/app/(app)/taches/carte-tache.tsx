import Link from "next/link";
import { CalendarDays, CheckSquare, Home, Paperclip, Repeat, Sparkles, Wrench } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatJour } from "@/lib/dates";
import { enRetard, initiales, prioriteDe } from "@/lib/taches";
import { CaseTerminer } from "./case-terminer";

export type CarteData = {
  id: string;
  titre: string;
  type: string;
  pole: string;
  priorite: string;
  statut: string;
  echeance: string | null;
  logementNom: string | null;
  responsableNom: string | null;
  recurrente: boolean;
  sousFaites: number;
  sousTotal: number;
  nbPieces: number;
};

export const lienTache = (t: { id: string; type: string }) => (t.type === "menage" ? `/operations/menage/${t.id}` : `/taches/${t.id}`);

/** Carte d'une tâche : titre, pôle, échéance, responsable, avancement des sous-tâches. */
export function CarteTache({ t, aujourdhui, compacte = false, afficherStatut = false }: { t: CarteData; aujourdhui: string; compacte?: boolean; afficherStatut?: boolean }) {
  const p = prioriteDe(t.priorite);
  const retard = enRetard(t, aujourdhui);
  const termine = t.statut === "termine";
  const Icone = t.type === "menage" ? Sparkles : t.type === "maintenance" ? Wrench : null;
  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-surface p-3 shadow-card transition-[border-color,box-shadow] duration-150 hover:border-aub-300 hover:shadow-pop",
        retard ? "border-danger/40" : "border-line",
        termine && "opacity-65",
      )}
    >
      <div className="flex items-start gap-2.5">
        {t.type === "tache" ? <CaseTerminer id={t.id} termine={termine} titre={t.titre} /> : <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center text-ink-3">{Icone ? <Icone className="h-4 w-4" /> : null}</span>}
        <div className="min-w-0 flex-1">
          <Link href={lienTache(t)} className={cn("block text-[0.95rem] leading-snug font-medium text-pretty after:absolute after:inset-0 after:content-['']", termine && "line-through decoration-ink-3")}>
            {t.titre}
          </Link>
          <div className="relative mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.8rem] text-ink-3">
            {t.priorite !== "normal" ? (
              <span className={cn("inline-flex items-center gap-1 font-medium", p.ton === "danger" ? "text-danger" : "text-warn")}>
                <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", p.ton === "danger" ? "bg-danger" : "bg-warn")} />
                {p.label}
              </span>
            ) : null}
            {t.echeance ? (
              <span className={cn("num inline-flex items-center gap-1", retard && "font-medium text-danger")}>
                <CalendarDays className="h-3.5 w-3.5" /> {formatJour(t.echeance).slice(0, 5)}
                {retard ? " · en retard" : ""}
              </span>
            ) : null}
            {t.sousTotal ? (
              <span className="num inline-flex items-center gap-1">
                <CheckSquare className="h-3.5 w-3.5" /> {t.sousFaites}/{t.sousTotal}
              </span>
            ) : null}
            {t.nbPieces ? (
              <span className="num inline-flex items-center gap-1">
                <Paperclip className="h-3.5 w-3.5" /> {t.nbPieces}
              </span>
            ) : null}
            {t.recurrente ? <Repeat className="h-3.5 w-3.5" aria-label="Tâche récurrente" /> : null}
          </div>
          {!compacte || t.logementNom ? (
            <div className="relative mt-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-sunken px-1.5 py-0.5 text-[0.72rem] font-medium whitespace-nowrap text-ink-2">{t.pole}</span>
              {t.logementNom ? (
                <span className="inline-flex min-w-0 max-w-full items-center gap-1 text-[0.78rem] text-ink-3">
                  <Home className="h-3 w-3 shrink-0" />
                  <span className="truncate">{t.logementNom}</span>
                </span>
              ) : null}
              {afficherStatut && t.type !== "tache" ? <span className="text-[0.72rem] text-ink-3">{t.type === "menage" ? "Ménage" : "Maintenance"}</span> : null}
              {t.responsableNom ? (
                <span title={t.responsableNom} className="ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-full bg-wine-100 text-[0.65rem] font-semibold text-wine-800">
                  {initiales(t.responsableNom)}
                  <span className="sr-only">{t.responsableNom}</span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
