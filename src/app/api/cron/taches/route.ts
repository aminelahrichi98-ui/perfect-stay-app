import { NextResponse, type NextRequest } from "next/server";
import { genererRecurrences } from "@/app/(app)/taches/generation";
import { autoriserCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/** Chaque jour : crée les tâches récurrentes des 14 prochains jours (sans doublon si l'appel est répété). */
async function executer(request: NextRequest) {
  const etat = autoriserCron(request);
  if (etat === "non-configure") return NextResponse.json({ erreur: "CRON_SECRET n'est pas configuré (24 caractères minimum)." }, { status: 503 });
  if (etat === "refuse") return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, creees: await genererRecurrences() });
  } catch (e) {
    return NextResponse.json({ ok: false, erreur: e instanceof Error ? e.message : "Erreur." }, { status: 500 });
  }
}

export const GET = executer;
export const POST = executer;
