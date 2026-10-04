import { Card, Notice } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FormulaireEntreprise } from "./formulaire";

export const metadata = { title: "Entreprise" };

export default async function PageEntreprise() {
  const moi = await exigerAcces("parametres");
  const supabase = await createClient();
  const { data } = await supabase
    .from("entreprise")
    .select("raison_sociale, adresse, ice, identifiant_fiscal, registre_commerce, patente, banque, rib, email, telephone")
    .eq("id", 1)
    .maybeSingle();

  return (
    <Card className="max-w-3xl p-5 md:p-7">
      <h2 className="font-display text-xl font-semibold tracking-tight">Informations de l&apos;entreprise</h2>
      <p className="mt-1 mb-6 text-ink-2 text-pretty">Ces informations apparaîtront sur les factures de commission et les rapports envoyés aux propriétaires.</p>
      {data ? (
        <FormulaireEntreprise valeurs={data} lectureSeule={!peutModifier(moi, "parametres")} />
      ) : (
        <Notice ton="danger">Les informations de l&apos;entreprise sont introuvables. Le script de la base de données a-t-il bien été exécuté ?</Notice>
      )}
    </Card>
  );
}
