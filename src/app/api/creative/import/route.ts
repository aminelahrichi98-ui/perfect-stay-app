import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { adresseAutorisee, codeCreative, TYPES_IMAGE } from "@/lib/creative";
import { secretValide } from "@/lib/creative-import";
import { deposer, supprimer } from "@/lib/stockage";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "creatives";
const TAILLE_MAX = 15 * 1024 * 1024;
const FORMATS: Record<string, { ext: string; type: string }> = { png: { ext: "png", type: "image/png" }, jpeg: { ext: "jpg", type: "image/jpeg" }, webp: { ext: "webp", type: "image/webp" } };
const court = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/*
  Dépôt d'une image publicitaire par Claude, après validation de l'utilisateur.
  Corps JSON : { angle_code, type_image, hook, prompt, image_url | image_base64, notes? }
  - image_url : adresse https d'un fichier Higgsfield (le serveur la télécharge lui-même) ;
  - image_base64 : l'image encodée, quand l'adresse n'est pas utilisable.
  L'image est créée en « Brouillon » : la publication dans Meta reste manuelle.
*/
export async function POST(request: NextRequest) {
  const acces = secretValide(request);
  if (acces === "absent") return NextResponse.json({ erreur: "CREATIVE_IMPORT_SECRET n'est pas configuré (24 caractères au minimum)." }, { status: 503 });
  if (acces === "refuse") return NextResponse.json({ erreur: "Accès refusé." }, { status: 401 });

  let corps: Record<string, unknown>;
  try {
    corps = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ erreur: "Corps illisible." }, { status: 400 });
  }
  const angleCode = court(corps.angle_code, 20).toUpperCase();
  const type = court(corps.type_image, 20);
  if (!/^ANG-\d{3,}$/.test(angleCode)) return NextResponse.json({ erreur: "angle_code attendu sous la forme ANG-001." }, { status: 422 });
  if (!TYPES_IMAGE.some((t) => t.value === type)) return NextResponse.json({ erreur: `type_image attendu parmi : ${TYPES_IMAGE.map((t) => t.value).join(", ")}.` }, { status: 422 });

  // Récupération de l'image
  let contenu: Buffer;
  if (typeof corps.image_url === "string" && corps.image_url) {
    const adresse = adresseAutorisee(corps.image_url);
    if (!adresse) return NextResponse.json({ erreur: "image_url refusée : seules les adresses https des fichiers Higgsfield sont acceptées." }, { status: 422 });
    try {
      const r = await fetch(adresse, { redirect: "error", signal: AbortSignal.timeout(30_000), cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      if (Number(r.headers.get("content-length") ?? 0) > TAILLE_MAX) return NextResponse.json({ erreur: "Image trop lourde (15 Mo au maximum)." }, { status: 413 });
      contenu = Buffer.from(await r.arrayBuffer());
    } catch {
      return NextResponse.json({ erreur: "L'image n'a pas pu être téléchargée depuis cette adresse." }, { status: 502 });
    }
  } else if (typeof corps.image_base64 === "string" && corps.image_base64) {
    contenu = Buffer.from(corps.image_base64.replace(/^data:image\/[a-z]+;base64,/, ""), "base64");
  } else return NextResponse.json({ erreur: "Fournissez image_url ou image_base64." }, { status: 422 });
  if (!contenu.length || contenu.length > TAILLE_MAX) return NextResponse.json({ erreur: "Image vide ou trop lourde (15 Mo au maximum)." }, { status: 413 });

  // Vérification : une vraie image fixe, pas une vidéo ni une animation
  let format: { ext: string; type: string };
  try {
    const meta = await sharp(contenu).metadata();
    const f = FORMATS[meta.format ?? ""];
    if (!f || (meta.pages ?? 1) > 1) throw new Error("format");
    format = f;
  } catch {
    return NextResponse.json({ erreur: "Le fichier n'est pas une image fixe PNG, JPG ou WebP." }, { status: 415 });
  }

  const admin = createAdminClient();
  const { data: angle } = await admin.from("ci_angles").select("id, code").eq("code", angleCode).maybeSingle();
  if (!angle) return NextResponse.json({ erreur: `Angle ${angleCode} introuvable.` }, { status: 404 });

  const chemin = `${randomUUID()}-claude.${format.ext}`;
  try {
    await deposer(BUCKET, chemin, contenu, format.type);
  } catch {
    return NextResponse.json({ erreur: "L'image n'a pas pu être enregistrée dans le stockage." }, { status: 500 });
  }
  // Deux dépôts simultanés pourraient viser la même version : on réessaie avec la suivante
  for (let essai = 0; essai < 3; essai++) {
    const { data: versions } = await admin.from("ci_creatives").select("version").eq("angle_id", angle.id).eq("type_image", type).order("version", { ascending: false }).limit(1);
    const version = (versions?.[0]?.version ?? 0) + 1;
    const code = codeCreative(angle.code, type, version);
    const { data, error } = await admin
      .from("ci_creatives")
      .insert({ code, angle_id: angle.id, type_image: type, version, hook: court(corps.hook, 300), prompt: court(corps.prompt, 6000), notes: court(corps.notes, 1000), image_chemin: chemin, statut: "brouillon" })
      .select("id")
      .single();
    if (data) return NextResponse.json({ ok: true, code, id: data.id, statut: "brouillon" }, { status: 201 });
    if (error?.code !== "23505") break;
  }
  await supprimer(BUCKET, [chemin]);
  return NextResponse.json({ erreur: "L'image n'a pas pu être enregistrée." }, { status: 500 });
}
