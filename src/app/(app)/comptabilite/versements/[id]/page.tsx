import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { lireModeTva } from "@/lib/mode-tva-serveur";
import { createClient } from "@/lib/supabase/server";
import { modifierVersement } from "../../actions";
import { FormulaireVersement } from "../../formulaire-versement";
import { chargerSaisie } from "../donnees-saisie";
import { SupprimerVersement } from "./supprimer-versement";

export const metadata = { title: "Versement" };

export default async function PageVersement({ params }: { params: Promise<{ id: string }> }) {
  const u = await exigerAcces("comptabilite", "modifier");
  const { id } = await params;
  const supabase = await createClient();
  const { data: v } = await supabase
    .from("versements")
    .select("id, logement_id, date_versement, montant_recu, frais_menage, taux_commission, note")
    .eq("id", id)
    .maybeSingle();
  if (!v) notFound();

  const [saisie, mode] = await Promise.all([chargerSaisie(), lireModeTva()]);
  // Le logement doit rester dans la liste même s'il est en pause
  const logements = saisie.logements.some((l) => l.id === v.logement_id)
    ? saisie.logements
    : [...saisie.logements, { id: v.logement_id, nom: saisie.nomsLogements[v.logement_id] ?? "Logement", frais_menage: Number(v.frais_menage), taux_commission: Number(v.taux_commission) }];

  return (
    <div className="max-w-2xl space-y-5">
      <Link href="/comptabilite/versements" className="press inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Versements
      </Link>
      <Card className="p-5 md:p-7">
        <h2 className="mb-6 font-display text-xl font-semibold tracking-tight">Modifier le versement</h2>
        <FormulaireVersement
          action={modifierVersement.bind(null, id)}
          mode={mode}
          libelleBouton="Enregistrer les modifications"
          {...saisie}
          logements={logements}
          edition={{
            logementId: v.logement_id,
            date: v.date_versement,
            montant: String(Number(v.montant_recu)).replace(".", ","),
            note: v.note,
            fraisMenage: Number(v.frais_menage),
            taux: Number(v.taux_commission),
          }}
        />
      </Card>
      {u.admin ? <SupprimerVersement id={id} /> : null}
    </div>
  );
}
