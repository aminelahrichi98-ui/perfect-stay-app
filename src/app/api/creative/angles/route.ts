import { NextResponse, type NextRequest } from "next/server";
import { secretValide } from "@/lib/creative-import";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Contexte des angles, pour préparer une image : problèmes, hook, USP, solution, CTA, images déjà faites. */
export async function GET(request: NextRequest) {
  const acces = secretValide(request);
  if (acces === "absent") return NextResponse.json({ erreur: "CREATIVE_IMPORT_SECRET n'est pas configuré (24 caractères au minimum)." }, { status: 503 });
  if (acces === "refuse") return NextResponse.json({ erreur: "Accès refusé." }, { status: 401 });
  const admin = createAdminClient();
  const [{ data: angles, error }, { data: creatives }] = await Promise.all([
    admin.from("ci_angles").select("id, code, nom, segment, probleme_principal, problemes_secondaires, consequences, hook, usp, solution, cta, statut").neq("statut", "archived").order("code"),
    admin.from("ci_creatives").select("code, angle_id, type_image, version, hook, statut"),
  ]);
  if (error) return NextResponse.json({ erreur: "Les angles n'ont pas pu être lus." }, { status: 500 });
  return NextResponse.json({
    angles: (angles ?? []).map(({ id, ...a }) => ({ ...a, images: (creatives ?? []).filter((c) => c.angle_id === id).map((c) => ({ code: c.code, type_image: c.type_image, version: c.version, hook: c.hook, statut: c.statut })) })),
  });
}
