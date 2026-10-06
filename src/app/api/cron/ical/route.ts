import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { synchroniserLiens } from "@/lib/synchro-serveur";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Appel autorisé uniquement avec le mot de passe `CRON_SECRET` (envoyé par Supabase ou par Vercel). */
function autorise(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 24) return "non-configure" as const;
  const recu = request.headers.get("authorization") ?? "";
  const attendu = `Bearer ${secret}`;
  const a = Buffer.from(recu);
  const b = Buffer.from(attendu);
  return a.length === b.length && timingSafeEqual(a, b) ? ("ok" as const) : ("refuse" as const);
}

async function executer(request: NextRequest) {
  const etat = autorise(request);
  if (etat === "non-configure") {
    return NextResponse.json({ erreur: "CRON_SECRET n'est pas configuré (24 caractères minimum)." }, { status: 503 });
  }
  if (etat === "refuse") return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });

  try {
    const rapport = await synchroniserLiens();
    return NextResponse.json({ ok: true, ...rapport.totaux });
  } catch (e) {
    return NextResponse.json({ ok: false, erreur: e instanceof Error ? e.message : "Erreur." }, { status: 500 });
  }
}

export const GET = executer;
export const POST = executer;
