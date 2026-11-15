import { NextResponse } from "next/server";
import { erreursParChamp, qualifier, schemaLead } from "@/lib/funnel";

/*
  Réception des demandes d'estimation.
  - Validation complète côté serveur (mêmes règles que le navigateur).
  - Anti-spam : champ piège, durée minimale de remplissage, limite de fréquence par adresse IP.
  - Transmission : si LEAD_WEBHOOK_URL est défini (CRM, Zapier, Make, webhook de l'application),
    la demande y est envoyée en JSON. Sinon, le site est en MODE DÉMONSTRATION : rien n'est
    transmis et la réponse le dit explicitement.
*/

const DUREE_MIN_MS = 4000;
const FENETRE_MS = 10 * 60 * 1000;
const MAX_PAR_FENETRE = 5;
const envois = new Map<string, number[]>();

function tropDeDemandes(ip: string) {
  const maintenant = Date.now();
  const recents = (envois.get(ip) ?? []).filter((t) => maintenant - t < FENETRE_MS);
  recents.push(maintenant);
  envois.set(ip, recents);
  return recents.length > MAX_PAR_FENETRE;
}

export async function POST(request: Request) {
  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ ok: false, erreur: "Requête invalide." }, { status: 400 });
  }

  const resultat = schemaLead.safeParse(corps);
  if (!resultat.success) {
    return NextResponse.json({ ok: false, erreur: "Certaines informations sont invalides.", champs: erreursParChamp(resultat.error) }, { status: 422 });
  }
  const lead = resultat.data;

  // Robot probable : on répond comme si tout allait bien, sans rien transmettre
  if (lead.site || lead.dureeMs < DUREE_MIN_MS) return NextResponse.json({ ok: true, mode: "demo" });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnue";
  if (tropDeDemandes(ip)) return NextResponse.json({ ok: false, erreur: "Trop de demandes. Réessayez dans quelques minutes." }, { status: 429 });

  const qualification = qualifier(lead);
  const charge = {
    recuLe: new Date().toISOString(),
    source: "site-vitrine",
    qualification,
    ...lead,
    site: undefined,
  };

  const webhook = process.env.LEAD_WEBHOOK_URL;
  if (!webhook) {
    if (process.env.NODE_ENV !== "production") console.info("[leads] mode démonstration, demande non transmise :", JSON.stringify(charge));
    return NextResponse.json({ ok: true, mode: "demo", niveau: qualification.niveau });
  }

  try {
    const r = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(process.env.LEAD_WEBHOOK_SECRET ? { Authorization: `Bearer ${process.env.LEAD_WEBHOOK_SECRET}` } : {}) },
      body: JSON.stringify(charge),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(String(r.status));
  } catch {
    return NextResponse.json({ ok: false, erreur: "Votre demande n'a pas pu être envoyée. Réessayez dans un instant." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, mode: "transmis", niveau: qualification.niveau });
}
