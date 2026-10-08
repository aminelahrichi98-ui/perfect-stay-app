import { NextResponse, type NextRequest } from "next/server";
import { analyserLeadMeta, extraireLeadgen, verifierSignature } from "@/lib/meta-leads";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const VERSION_GRAPH = "v21.0";

/** Meta vérifie une fois l'adresse du webhook en envoyant un « jeton de vérification » : on le compare au nôtre. */
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const jeton = process.env.META_VERIFY_TOKEN;
  if (jeton && p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === jeton) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200, headers: { "content-type": "text/plain" } });
  }
  return new NextResponse("Refusé", { status: 403 });
}

async function journaliser(statut: "recu" | "cree" | "doublon" | "erreur", evenement: string, detail: string) {
  try {
    await createAdminClient().from("crm_webhook_journal").insert({ statut, evenement: evenement.slice(0, 80), detail: detail.slice(0, 500) });
  } catch {
    // le journal ne doit jamais empêcher de répondre à Meta
  }
}

/** Nouveau lead d'un formulaire Meta : on vérifie la signature, on récupère le lead chez Meta, on le crée dans le CRM. */
export async function POST(request: NextRequest) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return NextResponse.json({ erreur: "META_APP_SECRET n'est pas configuré." }, { status: 503 });
  const corps = await request.text();
  if (!verifierSignature(corps, request.headers.get("x-hub-signature-256"), secret)) {
    return NextResponse.json({ erreur: "Signature invalide." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(corps);
  } catch {
    return NextResponse.json({ erreur: "Corps illisible." }, { status: 400 });
  }
  const evenements = extraireLeadgen(json);
  const acces = process.env.META_PAGE_ACCESS_TOKEN;
  const admin = createAdminClient();

  for (const e of evenements) {
    try {
      if (!acces) {
        await journaliser("erreur", `leadgen ${e.leadgenId}`, "META_PAGE_ACCESS_TOKEN n'est pas configuré : le lead n'a pas pu être récupéré.");
        continue;
      }
      const reponse = await fetch(
        `https://graph.facebook.com/${VERSION_GRAPH}/${encodeURIComponent(e.leadgenId)}?fields=field_data,created_time,ad_name,campaign_name,form_id&access_token=${encodeURIComponent(acces)}`,
        { cache: "no-store" },
      );
      if (!reponse.ok) {
        await journaliser("erreur", `leadgen ${e.leadgenId}`, `Meta a répondu ${reponse.status} (jeton expiré ou autorisation « leads_retrieval » manquante ?).`);
        continue;
      }
      const donnees = (await reponse.json()) as { field_data?: { name: string; values?: string[] }[]; campaign_name?: string; ad_name?: string };
      const lead = analyserLeadMeta(donnees.field_data ?? []);
      const { error } = await admin.from("crm_leads").insert({
        ...lead,
        source: "meta",
        campagne: (donnees.campaign_name || donnees.ad_name || "").slice(0, 200),
        meta_lead_id: e.leadgenId,
      });
      if (error?.code === "23505") await journaliser("doublon", `leadgen ${e.leadgenId}`, "Lead déjà reçu.");
      else if (error) await journaliser("erreur", `leadgen ${e.leadgenId}`, error.message);
      else await journaliser("cree", `leadgen ${e.leadgenId}`, lead.nom);
    } catch (err) {
      await journaliser("erreur", `leadgen ${e.leadgenId}`, err instanceof Error ? err.message : "Erreur inconnue.");
    }
  }
  if (!evenements.length) await journaliser("recu", "envoi sans lead", "Aucun nouveau lead dans cet envoi.");
  // Toujours 200 une fois la signature vérifiée : sinon Meta renvoie le même lead en boucle
  return NextResponse.json({ ok: true, leads: evenements.length });
}
