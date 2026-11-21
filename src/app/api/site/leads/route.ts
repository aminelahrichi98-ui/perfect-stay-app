import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/*
  Réception des demandes de Revenue Audit envoyées par le site vitrine.
  Le site appelle cette adresse avec le secret partagé SITE_LEADS_SECRET (en-tête Authorization).
  Chaque demande devient un prospect du CRM (source « site »), avec le détail du bien en note.
*/

type Charge = {
  recuLe?: string;
  qualification?: { niveau?: string; raisons?: string[] };
  ville?: { ville?: string; villeAutre?: string };
  quartier?: { quartier?: string };
  bien?: { typeBien?: string; surface?: number; chambres?: string; capacite?: number; ameublement?: string; equipements?: string[] };
  situation?: Record<string, unknown> & { situation?: string };
  objectif?: { objectifs?: string[] };
  contact?: { prenom?: string; nom?: string; telephone?: string; email?: string; rendezVous?: boolean; creneau?: string };
  attribution?: Record<string, string>;
};

const SITUATIONS: Record<string, string> = { longue: "Location longue durée", courte: "Location courte durée", vacant: "Logement vacant" };
const LIBELLES: Record<string, string> = {
  loyer: "Loyer mensuel (MAD)",
  occupation: "Occupation",
  disponibilite: "Disponibilité",
  revenuMensuel: "Revenu mensuel moyen (MAD)",
  tauxOccupation: "Taux d'occupation (%)",
  gestionActuelle: "Gestion actuelle",
  defi: "Principal défi",
  lienAnnonce: "Annonce",
  ameublementPrevu: "Ameublement prévu",
  strategie: "Stratégie envisagée",
};
const texte = (v: unknown, max = 200) => (typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0, max) : "");

function autorise(request: NextRequest, secret: string) {
  const recu = Buffer.from((request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, ""));
  const attendu = Buffer.from(secret);
  return recu.length === attendu.length && timingSafeEqual(recu, attendu);
}

async function journaliser(statut: "cree" | "erreur", detail: string) {
  try {
    await createAdminClient().from("crm_webhook_journal").insert({ statut, evenement: "site vitrine", detail: detail.slice(0, 500) });
  } catch {
    // le journal ne doit jamais empêcher de répondre
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.SITE_LEADS_SECRET;
  if (!secret) return NextResponse.json({ erreur: "SITE_LEADS_SECRET n'est pas configuré." }, { status: 503 });
  if (!autorise(request, secret)) return NextResponse.json({ erreur: "Accès refusé." }, { status: 401 });

  let c: Charge;
  try {
    c = (await request.json()) as Charge;
  } catch {
    return NextResponse.json({ erreur: "Corps illisible." }, { status: 400 });
  }
  const nom = [texte(c.contact?.prenom, 60), texte(c.contact?.nom, 60)].filter(Boolean).join(" ");
  const telephone = texte(c.contact?.telephone, 30);
  if (!nom || !telephone) return NextResponse.json({ erreur: "Nom et téléphone obligatoires." }, { status: 422 });

  const ville = c.ville?.ville === "Autre" ? texte(c.ville?.villeAutre, 60) : texte(c.ville?.ville, 60);
  const situation = texte(c.situation?.situation, 20);
  const lignes = [
    "Demande de Revenue Audit reçue depuis le site.",
    c.contact?.rendezVous ? `Rendez-vous demandé${c.contact.creneau ? ` : ${texte(c.contact.creneau, 40).toLowerCase()}` : ""}.` : "Pas de rendez-vous demandé.",
    `Situation : ${SITUATIONS[situation] ?? "non précisée"}`,
    ...Object.entries(c.situation ?? {})
      .filter(([k, v]) => k !== "situation" && LIBELLES[k] && texte(v, 300))
      .map(([k, v]) => `${LIBELLES[k]} : ${texte(v, 300)}`),
    `Quartier : ${texte(c.quartier?.quartier, 80) || "non précisé"}`,
    `Bien : ${[texte(c.bien?.typeBien, 40), c.bien?.surface ? `${texte(c.bien.surface)} m²` : "", c.bien?.chambres ? `${texte(c.bien.chambres, 10)} ch.` : "", c.bien?.capacite ? `${texte(c.bien.capacite)} voyageurs` : "", texte(c.bien?.ameublement, 40)].filter(Boolean).join(", ")}`,
    c.bien?.equipements?.length ? `Équipements : ${c.bien.equipements.map((e) => texte(e, 40)).join(", ")}` : "",
    c.objectif?.objectifs?.length ? `Objectifs : ${c.objectif.objectifs.map((o) => texte(o, 60)).join(", ")}` : "",
    c.qualification?.niveau ? `Priorité : ${texte(c.qualification.niveau, 20)}${c.qualification.raisons?.length ? ` (${c.qualification.raisons.map((r) => texte(r, 80)).join(" ; ")})` : ""}` : "",
    c.attribution?.utm_source ? `Origine : ${texte(c.attribution.utm_source, 60)}${c.attribution.utm_medium ? ` / ${texte(c.attribution.utm_medium, 60)}` : ""}` : "",
  ].filter(Boolean);

  const { data, error } = await createAdminClient()
    .from("crm_leads")
    .insert({
      nom,
      telephone,
      email: texte(c.contact?.email, 120),
      ville,
      type_bien: texte(c.bien?.typeBien, 60),
      source: "site",
      campagne: texte(c.attribution?.utm_campaign, 200),
      notes: lignes.join("\n").slice(0, 4000),
    })
    .select("id")
    .single();
  if (error) {
    await journaliser("erreur", error.message);
    return NextResponse.json({ erreur: "Le prospect n'a pas pu être enregistré." }, { status: 500 });
  }
  await journaliser("cree", nom);
  return NextResponse.json({ ok: true, id: data.id });
}
