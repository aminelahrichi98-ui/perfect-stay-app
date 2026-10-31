import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { lireLogementsCompta } from "../../donnees";
import { ImportAirbnb } from "./import-airbnb";

export const metadata = { title: "Importer un relevé Airbnb" };

export default async function PageImportAirbnb() {
  await exigerAcces("comptabilite", "modifier");
  const logements = (await lireLogementsCompta()).map((l) => ({ id: l.id, nom: l.nom, frais_menage: l.frais_menage }));
  return (
    <div className="max-w-4xl">
      <Link href="/comptabilite/versements" className="press mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Versements
      </Link>
      <Card className="p-5 md:p-7">
        <h2 className="font-display text-xl font-semibold tracking-tight">Importer un relevé Airbnb</h2>
        <div className="mt-1 mb-6 space-y-2 text-ink-2 text-pretty">
          <p>
            Sur Airbnb : <strong>Menu › Revenus › Historique des transactions</strong> (onglet « Versés » ou « À venir »), choisissez les dates puis{" "}
            <strong>Exporter › Télécharger le fichier CSV</strong>.
          </p>
          <p className="text-sm text-ink-3">
            Chaque réservation devient un versement Airbnb, comptabilisé le lendemain du check-in. Les réservations déjà saisies ne sont jamais importées deux fois, et rien n&apos;est enregistré avant
            votre confirmation.
          </p>
        </div>
        <ImportAirbnb logements={logements} />
      </Card>
    </div>
  );
}
