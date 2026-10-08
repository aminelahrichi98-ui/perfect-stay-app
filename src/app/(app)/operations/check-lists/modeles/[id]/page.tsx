import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EditeurModele } from "../editeur-modele";

export const metadata = { title: "Modèle de check-list" };

export default async function PageModele({ params }: { params: Promise<{ id: string }> }) {
  await exigerAcces("checklists", "modifier");
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: m }, { data: points }] = await Promise.all([
    supabase.from("checklist_modeles").select("id, nom, type, actif").eq("id", id).maybeSingle(),
    supabase.from("checklist_modele_points").select("libelle, photo_requise, ordre").eq("modele_id", id).order("ordre"),
  ]);
  if (!m) notFound();
  return (
    <div className="max-w-3xl">
      <Link href="/operations/check-lists" className="press mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Check-lists
      </Link>
      <Card className="p-5 md:p-7">
        <h2 className="mb-6 font-display text-xl font-semibold tracking-tight">Modifier le modèle</h2>
        <EditeurModele modele={{ ...m, points: (points ?? []).map((p) => ({ libelle: p.libelle, photo_requise: p.photo_requise })) }} />
      </Card>
    </div>
  );
}
