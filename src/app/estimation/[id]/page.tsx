import { notFound } from "next/navigation";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { lienWhatsapp } from "@/lib/estimation/parametres";
import type { Snapshot } from "@/lib/estimation/snapshot";
import { BUCKET_MARCHE } from "@/lib/marche/serveur";
import { urlsLecture } from "@/lib/stockage";
import { createClient } from "@/lib/supabase/server";
import { BarreV2 } from "./barre-v2";
import { DocumentV1 } from "./document-v1";
import { DocumentV2 } from "./document-v2";

async function charger(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("estimations").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const e = await charger((await params).id);
  return { title: { absolute: e ? `Estimation Perfect Stay - ${e.prenom} - ${e.quartier}` : "Estimation Perfect Stay" } };
}

const STYLE_FEUILLES = `
  @page { size: A4 portrait; margin: 0; }
  .feuille { width: 210mm; height: 297mm; position: relative; overflow: hidden; background: white; break-after: page; page-break-after: always; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .feuille:last-child { break-after: auto; page-break-after: auto; }
  @media screen { .feuille { margin: 0 auto 24px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.08), 0 12px 32px rgb(0 0 0 / 0.08); border-radius: 4px; zoom: var(--zoom-feuille, 1); } }
  @media print { html, body { background: white !important; } .feuille { margin: 0; box-shadow: none; border-radius: 0; zoom: 1 !important; } }
`;

export default async function PageEstimation({ params }: { params: Promise<{ id: string }> }) {
  const u = await exigerAcces("estimateur");
  const e = await charger((await params).id);
  if (!e) notFound();
  if (e.modele_document !== "v2") return <DocumentV1 e={e} />;

  const s = e.snapshot as Snapshot | null;
  if (!s?.resultat) notFound();
  const supabase = await createClient();
  const [photos, comparables, { data: lead }] = await Promise.all([
    urlsLecture("estimations", s.photoBien ? [s.photoBien] : []),
    urlsLecture(BUCKET_MARCHE, s.comparables.map((c) => c.photo).filter(Boolean)),
    e.lead_id ? supabase.from("crm_leads").select("telephone").eq("id", e.lead_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const message = `Bonjour ${s.proprietaire.prenom}, voici l'estimation de revenus de votre logement préparée par Perfect Stay.`;

  return (
    <div className="apercu-estimation min-h-dvh bg-sunken print:bg-white">
      <style>{STYLE_FEUILLES}</style>
      <BarreV2 id={e.id} statut={e.statut} leadId={e.lead_id} lienWhatsappProprietaire={lead?.telephone ? lienWhatsapp(lead.telephone, message) : ""} modifiable={peutModifier(u, "estimateur")} />
      <main className="px-4 pt-4 pb-10 print:p-0">
        {s.marche ? (
          <DocumentV2 s={s} statut={e.statut} photoUrl={s.photoBien ? (photos.get(s.photoBien) ?? null) : null} comparablesUrls={comparables} />
        ) : (
          <p className="mx-auto max-w-[210mm] rounded-xl bg-surface p-6 text-ink-2">Brouillon sans données de marché : complétez-le pour obtenir l&apos;aperçu du document.</p>
        )}
      </main>
    </div>
  );
}
