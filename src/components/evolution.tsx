import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import { variation } from "@/lib/synthese";

/** Évolution en % par rapport au mois précédent (vert si c'est bon signe, rouge sinon ; `inverse` pour les dépenses). */
export function Evolution({ precedent, actuel, inverse = false }: { precedent: number; actuel: number; inverse?: boolean }) {
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
