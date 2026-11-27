import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Notice } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { UUID } from "@/lib/estimation/acces";
import { jour } from "@/lib/estimation/format";
import { etatIA } from "@/lib/marche/ia";
import { donneesVides, SchemaDonneesMarche } from "@/lib/marche/schema";
import { BUCKET_MARCHE, chargerParametres } from "@/lib/marche/serveur";
import { urlsLecture } from "@/lib/stockage";
import { createClient } from "@/lib/supabase/server";
import { Validation } from "./validation";

export const metadata = { title: "Validation des données de marché" };

export default async function PageValidationImport({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ extraire?: string; refusees?: string }> }) {
  await exigerAcces("estimateur", "modifier");
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: imp } = await supabase.from("marche_imports").select("id, statut, segment_id, donnees, modele, erreur, created_at").eq("id", id).maybeSingle();
  if (!imp) notFound();
  const [parametres, { data: lignes }, { data: quartiers }, { data: alias }] = await Promise.all([
    chargerParametres(supabase),
    supabase.from("marche_captures").select("id, chemin, nom, ordre").eq("import_id", id).order("ordre"),
    supabase.from("marche_quartiers").select("id, ville, ville_cle, nom, cle").eq("actif", true).order("nom"),
    supabase.from("marche_alias").select("quartier_id, ville_cle, cle"),
  ]);
  const urls = await urlsLecture(BUCKET_MARCHE, (lignes ?? []).map((l) => l.chemin));
  const captures = (lignes ?? []).map((l, i) => ({ id: l.id, numero: i + 1, nom: l.nom, url: urls.get(l.chemin) ?? "" }));
  const lu = SchemaDonneesMarche.safeParse(imp.donnees);
  const ia = etatIA(parametres.donnees.iaActive, parametres.donnees.iaModele);

  return (
    <div className="space-y-4">
      <Link href={imp.segment_id && imp.statut === "valide" ? `/estimateur/marche/${imp.segment_id}` : "/estimateur/marche"} className="press inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Base marché
      </Link>
      {sp.refusees ? <Notice ton="danger">Captures refusées : {sp.refusees}</Notice> : null}
      {imp.statut === "valide" ? <Notice ton="ok">Import validé : les données sont enregistrées comme version du segment. Elles ne sont plus modifiables (créez une nouvelle version pour les corriger).</Notice> : null}
      <Validation
        importId={id}
        statut={imp.statut}
        creeLe={jour(imp.created_at)}
        modele={imp.modele}
        erreurPrecedente={imp.erreur}
        initiales={lu.success ? lu.data : donneesVides()}
        aDesDonnees={lu.success}
        captures={captures}
        ia={{ disponible: ia.disponible, raison: ia.raison, modele: ia.modele }}
        quartiers={(quartiers ?? []).map((q) => ({ id: q.id, ville: q.ville, villeCle: q.ville_cle, nom: q.nom, cle: q.cle }))}
        alias={(alias ?? []).map((a) => ({ quartierId: a.quartier_id, villeCle: a.ville_cle, cle: a.cle }))}
        extraireAuto={sp.extraire === "1" && !lu.success && captures.length > 0 && ia.disponible}
      />
    </div>
  );
}
