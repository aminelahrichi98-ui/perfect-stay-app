import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { POLES } from "@/lib/modules";
import { lireLogementsOps, lireResponsables } from "../../operations/donnees";
import { ImporterListe } from "./importer-liste";

export const metadata = { title: "Coller une liste" };

export default async function PageImporter() {
  const u = await exigerAcces("taches", "modifier");
  const [logements, responsables] = await Promise.all([lireLogementsOps(), lireResponsables()]);
  return (
    <div className="max-w-3xl">
      <Link href="/taches" className="press mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Tâches
      </Link>
      <Card className="p-5 md:p-7">
        <h2 className="font-display text-xl font-semibold tracking-tight">Coller une liste d&apos;actions</h2>
        <p className="mt-1 mb-6 text-ink-2 text-pretty">Collez vos notes, une action par ligne (avec ou sans puces). Vous vérifiez la liste avant que les tâches soient créées.</p>
        <ImporterListe
          poleParDefaut={u.poles.find((p) => (POLES as readonly string[]).includes(p)) ?? "Opérations"}
          logements={logements.map((l) => ({ id: l.id, nom: l.nom }))}
          responsables={responsables}
        />
      </Card>
    </div>
  );
}
