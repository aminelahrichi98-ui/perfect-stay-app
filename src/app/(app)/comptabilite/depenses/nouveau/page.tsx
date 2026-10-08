import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { aujourdhui } from "@/lib/dates";
import { lireLogementsCompta } from "../../donnees";
import { FormulaireDepense } from "../../formulaire-depense";

export const metadata = { title: "Nouvelle dépense" };

export default async function PageNouvelleDepense() {
  const u = await exigerAcces("comptabilite", "modifier");
  const logements = await lireLogementsCompta();
  return (
    <div className="max-w-2xl">
      <Link href="/comptabilite/depenses" className="press mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Dépenses
      </Link>
      <Card className="p-5 md:p-7">
        <h2 className="mb-6 font-display text-xl font-semibold tracking-tight">Nouvelle dépense</h2>
        <FormulaireDepense logements={logements.map((l) => ({ id: l.id, nom: l.nom }))} aujourdhui={aujourdhui()} peutSupprimer={u.admin} />
      </Card>
    </div>
  );
}
