import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { EditeurModele } from "../editeur-modele";

export const metadata = { title: "Nouveau modèle" };

export default async function PageNouveauModele() {
  await exigerAcces("checklists", "modifier");
  return (
    <div className="max-w-3xl">
      <Link href="/operations/check-lists" className="press mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Check-lists
      </Link>
      <Card className="p-5 md:p-7">
        <h2 className="mb-6 font-display text-xl font-semibold tracking-tight">Nouveau modèle</h2>
        <EditeurModele />
      </Card>
    </div>
  );
}
