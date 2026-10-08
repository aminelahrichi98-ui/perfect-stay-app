import { Onglets } from "@/components/onglets";
import { PageHeader } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";

export default async function LayoutRh({ children }: { children: React.ReactNode }) {
  await exigerAcces("rh");
  return (
    <>
      <PageHeader titre="RH" description="L'équipe, les prestataires et les recrutements en cours." />
      <Onglets
        libelle="Sections des ressources humaines"
        items={[
          { href: "/rh", label: "Équipe et prestataires", exact: true },
          { href: "/rh/recrutements", label: "Recrutements" },
        ]}
      />
      {children}
    </>
  );
}
