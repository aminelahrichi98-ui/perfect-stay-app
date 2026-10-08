import { NextResponse, type NextRequest } from "next/server";
import { autoriserCron } from "@/lib/cron-auth";
import { genererDocumentsDuMois, moisASolder } from "@/lib/documents-serveur";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Le 1er de chaque mois : rapports mensuels et factures de commission du mois précédent.
 * Sans danger si l'appel est répété : une facture déjà émise n'est jamais refaite.
 */
async function executer(request: NextRequest) {
  const etat = autoriserCron(request);
  if (etat === "non-configure") {
    return NextResponse.json({ erreur: "CRON_SECRET n'est pas configuré (24 caractères minimum)." }, { status: 503 });
  }
  if (etat === "refuse") return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });

  try {
    const bilan = await genererDocumentsDuMois(moisASolder(), null);
    return NextResponse.json({ ok: bilan.erreurs.length === 0, ...bilan });
  } catch (e) {
    return NextResponse.json({ ok: false, erreur: e instanceof Error ? e.message : "Erreur." }, { status: 500 });
  }
}

export const GET = executer;
export const POST = executer;
