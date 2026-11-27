import { Onglets } from "@/components/onglets";
import { PageHeader } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";

export default async function LayoutEstimateur({ children }: { children: React.ReactNode }) {
  await exigerAcces("estimateur");
  return (
    <>
      <PageHeader titre="Estimateur" description="Estimations locatives fondées sur des données de marché validées, liées au CRM." />
      <Onglets
        libelle="Sections de l'estimateur"
        items={[
          { href: "/estimateur", label: "Tableau de bord", exact: true },
          { href: "/estimateur/nouvelle", label: "Nouvelle estimation" },
          { href: "/estimateur/historique", label: "Historique" },
          { href: "/estimateur/marche", label: "Base marché" },
          { href: "/estimateur/suivi", label: "Suivi" },
          { href: "/estimateur/parametres", label: "Paramètres" },
        ]}
      />
      {children}
    </>
  );
}
