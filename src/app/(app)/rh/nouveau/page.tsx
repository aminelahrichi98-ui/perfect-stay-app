import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { aujourdhui } from "@/lib/dates";
import { FormulaireMembre } from "../formulaire-membre";

export const metadata = { title: "Nouvelle fiche RH" };

export default async function PageNouveauMembre() {
  await exigerAcces("rh", "modifier");
  return (
    <div className="max-w-2xl">
      <Link href="/rh" className="press mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Équipe
      </Link>
      <Card className="p-5 md:p-7">
        <h2 className="mb-6 font-display text-xl font-semibold tracking-tight">Nouvelle fiche</h2>
        <FormulaireMembre valeurs={{ nom: "", role: "", categorie: "equipe", contrat: "cdi", telephone: "", email: "", arrivee: aujourdhui(), depart: "", notes: "" }} />
      </Card>
    </div>
  );
}
