import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AssistantEstimation } from "./assistant";

export const metadata = { title: "Nouvelle estimation" };

export default async function PageNouvelleEstimation() {
  await exigerAcces("estimateur", "modifier");
  // Le numéro de l'entreprise est lisible ici même sans le droit « Paramètres » : c'est une donnée publique du PDF
  const { data: entreprise } = await createAdminClient().from("entreprise").select("telephone").eq("id", 1).maybeSingle();
  return (
    <div className="max-w-3xl">
      <Link href="/estimateur" className="press mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Estimateur
      </Link>
      <Card className="p-5 md:p-7">
        <AssistantEstimation whatsapp={entreprise?.telephone?.trim() ?? ""} />
      </Card>
    </div>
  );
}
