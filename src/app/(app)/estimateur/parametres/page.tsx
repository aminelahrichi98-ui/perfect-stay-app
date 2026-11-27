import { Card, Notice } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { jour } from "@/lib/estimation/format";
import { etatIA } from "@/lib/marche/ia";
import { chargerParametres } from "@/lib/marche/serveur";
import { createClient } from "@/lib/supabase/server";
import { FormulaireParametresEstimateur, ListeOffres, ListeTemoignages } from "./formulaires";

export const metadata = { title: "Paramètres de l'estimateur" };

export default async function PageParametres() {
  const u = await exigerAcces("estimateur");
  const supabase = await createClient();
  const [p, { data: ligne }, { data: offres }, { data: temoignages }] = await Promise.all([
    chargerParametres(supabase),
    supabase.from("estimateur_parametres").select("*").maybeSingle(),
    supabase.from("estimateur_offres").select("id, titre, description, duree_mois, conditions, debut, fin, actif").order("created_at"),
    supabase.from("estimateur_temoignages").select("id, auteur, contexte, texte, verifie, actif").order("created_at"),
  ]);
  const ia = etatIA(p.donnees.iaActive, p.donnees.iaModele);

  return (
    <div className="max-w-4xl space-y-5">
      {!u.admin ? <Notice ton="info">Consultation seule : seul un administrateur peut modifier ces paramètres.</Notice> : null}
      {!ligne ? <Notice ton="danger">Paramètres introuvables : la migration 0015 n&apos;a pas encore été appliquée dans Supabase.</Notice> : null}
      <Card className="space-y-1 p-4 text-sm">
        <p className="font-medium">Extraction automatique des captures</p>
        <p className={ia.disponible ? "text-ok" : "text-warn"}>{ia.disponible ? `Active : ${ia.nom}, modèle ${ia.modele}. Les clés restent sur le serveur.` : ia.raison}</p>
        {p.majLe ? <p className="text-xs text-ink-3">Paramètres modifiés le {jour(p.majLe)}.</p> : null}
      </Card>
      {ligne ? <FormulaireParametresEstimateur initial={ligne} modifiable={u.admin} /> : null}
      <ListeOffres offres={offres ?? []} modifiable={u.admin} />
      <ListeTemoignages temoignages={temoignages ?? []} modifiable={u.admin} />
    </div>
  );
}
