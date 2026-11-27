import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, Notice } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { UUID } from "@/lib/estimation/acces";
import { typologie } from "@/lib/estimation/format";
import { etatIA } from "@/lib/marche/ia";
import { chargerParametres } from "@/lib/marche/serveur";
import { createClient } from "@/lib/supabase/server";
import { NouvelImport } from "./nouvel-import";

export const metadata = { title: "Importer des captures" };

export default async function PageImport({ searchParams }: { searchParams: Promise<{ segment?: string }> }) {
  await exigerAcces("estimateur", "modifier");
  const { segment } = await searchParams;
  const supabase = await createClient();
  const params = await chargerParametres(supabase);
  const ia = etatIA(params.donnees.iaActive, params.donnees.iaModele);
  let cible = "";
  if (segment && UUID.test(segment)) {
    const { data: s } = await supabase.from("marche_segments").select("type_logement, chambres, chambres_max, marche_quartiers(ville, nom)").eq("id", segment).maybeSingle();
    const q = s?.marche_quartiers as unknown as { ville: string; nom: string } | null;
    if (s && q) cible = `${q.nom} (${q.ville}) · ${typologie(s.type_logement, s.chambres, s.chambres_max)}`;
  }
  return (
    <div className="max-w-4xl space-y-4">
      <Link href="/estimateur/marche" className="press inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Base marché
      </Link>
      <Card className="space-y-4 p-5 md:p-7">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">{cible ? `Actualiser : ${cible}` : "Importer des captures PriceLabs"}</h2>
          <p className="mt-1 text-sm text-ink-2">
            Ajoutez une ou plusieurs captures d&apos;un même segment (tableau de bord, percentiles, revenus mensuels, annonces comparables). Rien ne devient actif avant votre validation.
          </p>
        </div>
        {!ia.disponible ? <Notice ton="info">{ia.raison} Les captures seront conservées comme sources et vous saisirez les valeurs à côté.</Notice> : null}
        <NouvelImport segmentId={segment && UUID.test(segment) ? segment : undefined} />
      </Card>
    </div>
  );
}
