import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { FormulaireMembre } from "../formulaire-membre";
import { DocumentsRh } from "./documents-rh";
import { SupprimerMembre } from "./supprimer-membre";

export const metadata = { title: "Fiche RH" };

export default async function PageMembre({ params }: { params: Promise<{ id: string }> }) {
  const u = await exigerAcces("rh");
  const { id } = await params;
  const modifiable = peutModifier(u, "rh");
  const supabase = await createClient();
  const { data: m } = await supabase.from("rh_membres").select("*").eq("id", id).maybeSingle();
  if (!m) notFound();
  const { data: docs } = await supabase.from("rh_documents").select("id, nom, taille, created_at").eq("membre_id", id).order("created_at", { ascending: false });
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/rh" className="press inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Équipe
      </Link>
      <Card className="p-5 md:p-7">
        <h2 className="mb-5 font-display text-xl font-semibold tracking-tight">{m.nom}</h2>
        {modifiable ? (
          <FormulaireMembre id={m.id} valeurs={{ nom: m.nom, role: m.role, categorie: m.categorie, contrat: m.type_contrat, telephone: m.telephone, email: m.email, arrivee: m.date_arrivee ?? "", depart: m.date_depart ?? "", notes: m.notes }} />
        ) : (
          <p className="text-ink-2">Vous pouvez consulter cette fiche mais pas la modifier.</p>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="mb-3 font-display text-lg font-semibold tracking-tight">Documents</h3>
        <DocumentsRh membreId={m.id} modifiable={modifiable} documents={(docs ?? []).map((d) => ({ id: d.id, nom: d.nom, taille: Number(d.taille), date: formatDate(new Date(d.created_at)) }))} />
      </Card>
      {modifiable ? <SupprimerMembre id={m.id} /> : null}
    </div>
  );
}
