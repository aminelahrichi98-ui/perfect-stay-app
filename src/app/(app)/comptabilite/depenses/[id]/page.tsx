import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { aujourdhui } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { lireLogementsCompta } from "../../donnees";
import { FormulaireDepense } from "../../formulaire-depense";
import { BoutonJustificatif } from "./bouton-justificatif";

export const metadata = { title: "Dépense" };

export default async function PageDepense({ params }: { params: Promise<{ id: string }> }) {
  const u = await exigerAcces("comptabilite", "modifier");
  const { id } = await params;
  const supabase = await createClient();
  const { data: d } = await supabase.from("depenses").select("id, date_depense, logement_id, categorie, description, montant, justificatif, justificatif_nom").eq("id", id).maybeSingle();
  if (!d) notFound();
  const logements = await lireLogementsCompta();

  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/comptabilite/depenses" className="press inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Dépenses
      </Link>
      <Card className="p-5 md:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">Modifier la dépense</h2>
          {d.justificatif ? <BoutonJustificatif id={d.id} /> : null}
        </div>
        <FormulaireDepense
          logements={logements.map((l) => ({ id: l.id, nom: l.nom }))}
          aujourdhui={aujourdhui()}
          peutSupprimer={u.admin || true}
          edition={{
            id: d.id,
            date: d.date_depense,
            logementId: d.logement_id ?? "",
            categorie: d.categorie,
            description: d.description,
            montant: String(Number(d.montant)).replace(".", ","),
            justificatifNom: d.justificatif ? (d.justificatif_nom ?? "Justificatif") : null,
          }}
        />
      </Card>
    </div>
  );
}
