import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { ETAPES_ONBOARDING, progression } from "@/lib/operations";
import { lireSuivis } from "../donnees";
import { EtapesOnboarding } from "./etapes";

export const metadata = { title: "Onboarding du logement" };

export default async function PageOnboardingLogement({ params }: { params: Promise<{ id: string }> }) {
  const u = await exigerAcces("onboarding");
  const { id } = await params;
  const [suivi] = await lireSuivis(["onboarding", "actif", "en_pause"], id);
  if (!suivi) notFound();
  const pct = progression(suivi.faites, ETAPES_ONBOARDING.length);
  return (
    <>
      <Link href="/onboarding" className="press mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Onboarding
      </Link>
      <PageHeader
        titre={suivi.nom}
        description={`${suivi.faites} étape${suivi.faites > 1 ? "s" : ""} sur ${ETAPES_ONBOARDING.length} · ${pct} %`}
        action={
          <Link href={`/logements/${suivi.id}`} className="press inline-flex h-11 items-center rounded-xl border border-line-strong bg-surface px-5 font-medium shadow-card hover:bg-sunken">
            Ouvrir la fiche logement
          </Link>
        }
      />
      <div className="max-w-2xl space-y-4">
        {suivi.statut === "actif" ? <Badge ton="ok">Logement actif : onboarding terminé</Badge> : null}
        <Card className="overflow-hidden">
          <EtapesOnboarding logementId={suivi.id} etapes={suivi.etapes} modifiable={peutModifier(u, "onboarding")} statut={suivi.statut} />
        </Card>
      </div>
    </>
  );
}
