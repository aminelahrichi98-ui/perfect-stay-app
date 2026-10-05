import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { creerLogement } from "../actions";
import { proprietairesDisponibles } from "../donnees";
import { FormulaireLogement, VALEURS_VIDES } from "../formulaire-logement";

export const metadata = { title: "Nouveau logement" };

export default async function PageNouveauLogement() {
  await exigerAcces("logements", "modifier");
  const proprietaires = await proprietairesDisponibles();
  return (
    <div className="max-w-3xl">
      <Link href="/logements" className="press mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Logements
      </Link>
      <Card className="p-5 md:p-7">
        <h1 className="mb-8 font-display text-2xl font-semibold tracking-tight">Nouveau logement</h1>
        <FormulaireLogement action={creerLogement} valeurs={VALEURS_VIDES} proprietaires={proprietaires} libelleBouton="Créer le logement" />
      </Card>
    </div>
  );
}
