import { NextResponse, type NextRequest } from "next/server";
import { droitEstimateur, UUID } from "@/lib/estimation/acces";
import { controlerDonnees, normaliserExtraction } from "@/lib/marche/extraction";
import { etatIA, fournisseurExtraction } from "@/lib/marche/ia";
import type { CaptureIA } from "@/lib/marche/ia/fournisseur";
import { preparerPourIA, verifierCapture } from "@/lib/marche/images";
import { LIBELLES_TYPE, type TypeSegment } from "@/lib/marche/schema";
import { BUCKET_MARCHE, chargerParametres } from "@/lib/marche/serveur";
import { telecharger } from "@/lib/stockage";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/*
  Extraction des captures d'un import par le service d'IA configuré (côté serveur uniquement).
  Seules les captures sont envoyées, avec au plus la description du segment attendu (ville, quartier, typologie) :
  aucune donnée de propriétaire. Le résultat reste un brouillon jusqu'à la validation humaine.
*/
export async function POST(request: NextRequest) {
  const u = await droitEstimateur();
  if (!u) return NextResponse.json({ erreur: "Accès refusé." }, { status: 403 });
  let importId = "";
  try {
    importId = String(((await request.json()) as { importId?: unknown }).importId ?? "");
  } catch {
    return NextResponse.json({ erreur: "Requête illisible." }, { status: 400 });
  }
  if (!UUID.test(importId)) return NextResponse.json({ erreur: "Import introuvable." }, { status: 404 });

  const supabase = await createClient();
  const params = await chargerParametres(supabase);
  const etat = etatIA(params.donnees.iaActive, params.donnees.iaModele);
  const fournisseur = etat.disponible ? fournisseurExtraction(params.donnees.iaModele) : null;
  if (!fournisseur) return NextResponse.json({ erreur: etat.raison, code: "non_configure" }, { status: 503 });

  const { data: imp } = await supabase.from("marche_imports").select("id, statut, segment_id").eq("id", importId).maybeSingle();
  if (!imp) return NextResponse.json({ erreur: "Import introuvable." }, { status: 404 });
  if (imp.statut === "valide" || imp.statut === "abandonne") return NextResponse.json({ erreur: "Cet import est clos." }, { status: 409 });
  const { data: lignes } = await supabase.from("marche_captures").select("chemin, ordre").eq("import_id", importId).order("ordre");
  if (!lignes?.length) return NextResponse.json({ erreur: "Ajoutez au moins une capture." }, { status: 422 });

  // Segment attendu (actualisation) : description publique, jamais de donnée personnelle
  let segmentAttendu: string | undefined;
  if (imp.segment_id) {
    const { data: s } = await supabase.from("marche_segments").select("type_logement, chambres, chambres_max, marche_quartiers(ville, nom)").eq("id", imp.segment_id).maybeSingle();
    const q = s?.marche_quartiers as unknown as { ville: string; nom: string } | null;
    if (s && q) segmentAttendu = `${q.ville}, ${q.nom}, ${LIBELLES_TYPE[s.type_logement as TypeSegment]}${s.type_logement === "studio" ? "" : ` ${s.chambres}${s.chambres_max ? ` à ${s.chambres_max}` : ""} chambre(s)`}`;
  }

  const captures: CaptureIA[] = [];
  try {
    for (const [i, l] of lignes.entries()) {
      const brut = await telecharger(BUCKET_MARCHE, l.chemin);
      const v = await verifierCapture(brut);
      if ("erreur" in v) return NextResponse.json({ erreur: `Capture ${i + 1} : ${v.erreur}` }, { status: 422 });
      captures.push({ numero: i + 1, ...(await preparerPourIA(brut)) });
    }
  } catch {
    return NextResponse.json({ erreur: "Les captures n'ont pas pu être lues dans le stockage." }, { status: 500 });
  }

  const resultat = await fournisseur.extraire(captures, { segmentAttendu });
  if (!resultat.ok) {
    await supabase.from("marche_imports").update({ erreur: resultat.erreur.slice(0, 500), modele: fournisseur.modele }).eq("id", importId);
    return NextResponse.json({ erreur: resultat.erreur, code: resultat.code }, { status: resultat.code === "limite" ? 429 : 502 });
  }

  const donnees = normaliserExtraction(resultat.extraction, captures.length);
  if (resultat.repli) donnees.avertissements.unshift(`Lecture faite par le modèle de repli (${resultat.modele}) : vérifiez chaque valeur avec attention.`);
  const { error } = await supabase
    .from("marche_imports")
    .update({ extraction: resultat.extraction, donnees, statut: "extrait", modele: resultat.modele.slice(0, 80), erreur: "" })
    .eq("id", importId)
    .neq("statut", "valide");
  if (error) return NextResponse.json({ erreur: "Le résultat n'a pas pu être enregistré." }, { status: 500 });
  return NextResponse.json({ donnees, incoherences: controlerDonnees(donnees), modele: resultat.modele, repli: resultat.repli });
}
