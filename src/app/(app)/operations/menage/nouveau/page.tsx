import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { aujourdhui } from "@/lib/dates";
import { lireLogementsOps, lireResponsables } from "../../donnees";
import { FormulaireMenage } from "./formulaire";

export const metadata = { title: "Nouveau ménage" };

export default async function PageNouveauMenage() {
  await exigerAcces("menage", "modifier");
  const [logements, responsables] = await Promise.all([lireLogementsOps(), lireResponsables()]);
  return (
    <div className="max-w-2xl">
      <Link href="/operations/menage" className="press mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Ménages
      </Link>
      <Card className="p-5 md:p-7">
        <h2 className="mb-6 font-display text-xl font-semibold tracking-tight">Nouveau ménage</h2>
        <FormulaireMenage logements={logements.map((l) => ({ id: l.id, nom: l.nom }))} responsables={responsables} aujourdhui={aujourdhui()} />
      </Card>
    </div>
  );
}
