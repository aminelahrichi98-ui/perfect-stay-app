import { Card, Notice } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FormulaireEntreprise } from "./formulaire";

export const metadata = { title: "Entreprise" };

export default async function PageEntreprise() {
  const moi = await exigerAcces("parametres");
  const supabase = await createClient();
  const [{ data }, { data: equipe }] = await Promise.all([
    supabase
      .from("entreprise")
      .select("raison_sociale, adresse, ice, identifiant_fiscal, registre_commerce, patente, banque, rib, email, telephone, responsable_menage, taux_tva, mention_reglement")
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("profiles").select("id, prenom, nom").eq("type", "equipe").eq("actif", true).order("prenom"),
  ]);

  return (
    <Card className="max-w-3xl p-5 md:p-7">
      <h2 className="font-display text-xl font-semibold tracking-tight">Informations de l&apos;entreprise</h2>
      <p className="mt-1 mb-6 text-ink-2 text-pretty">Ces informations apparaîtront sur les factures de commission et les rapports envoyés aux propriétaires.</p>
      {data ? (
        <FormulaireEntreprise
          valeurs={{ ...data, taux_tva: Number(data.taux_tva) }}
          equipe={(equipe ?? []).map((p) => ({ id: p.id, nom: `${p.prenom} ${p.nom}`.trim() }))}
          lectureSeule={!peutModifier(moi, "parametres")}
        />
      ) : (
        <Notice ton="danger">Les informations de l&apos;entreprise sont introuvables. Le script de la base de données a-t-il bien été exécuté ?</Notice>
      )}
    </Card>
  );
}
