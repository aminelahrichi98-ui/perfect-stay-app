import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { lireModeTva } from "@/lib/mode-tva-serveur";
import { creerVersement } from "../../actions";
import { FormulaireVersement } from "../../formulaire-versement";
import { chargerSaisie } from "../donnees-saisie";

export const metadata = { title: "Nouveau versement" };

export default async function PageNouveauVersement() {
  await exigerAcces("comptabilite", "modifier");
  const [saisie, mode] = await Promise.all([chargerSaisie(), lireModeTva()]);
  return (
    <div className="max-w-2xl">
      <Link href="/comptabilite/versements" className="press mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Versements
      </Link>
      <Card className="p-5 md:p-7">
        <h2 className="mb-6 font-display text-xl font-semibold tracking-tight">Nouveau versement</h2>
        <FormulaireVersement action={creerVersement} mode={mode} libelleBouton="Enregistrer le versement" {...saisie} />
      </Card>
    </div>
  );
}
