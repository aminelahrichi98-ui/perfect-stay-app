import { PageHeader } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { OngletsParametres } from "./onglets";

export default async function LayoutParametres({ children }: { children: React.ReactNode }) {
  const u = await exigerAcces("parametres");
  return (
    <>
      <PageHeader titre="Paramètres" description="Utilisateurs, droits d'accès et informations de l'entreprise." />
      <OngletsParametres admin={u.admin} />
      {children}
    </>
  );
}
