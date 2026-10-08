import { PageHeader } from "@/components/ui";
import { BasculeTva } from "@/components/bascule-tva";
import { Onglets } from "@/components/onglets";
import { exigerAcces } from "@/lib/auth";
import { lireModeTva } from "@/lib/mode-tva-serveur";

export default async function LayoutComptabilite({ children }: { children: React.ReactNode }) {
  await exigerAcces("comptabilite");
  const mode = await lireModeTva();
  return (
    <>
      <PageHeader titre="Comptabilité" description="Versements, dépenses, rapports et factures de commission." action={<BasculeTva mode={mode} />} />
      <Onglets
        libelle="Sections de la comptabilité"
        items={[
          { href: "/comptabilite", label: "Synthèse", exact: true },
          { href: "/comptabilite/versements", label: "Versements" },
          { href: "/comptabilite/depenses", label: "Dépenses" },
          { href: "/comptabilite/documents", label: "Documents" },
        ]}
      />
      {children}
    </>
  );
}
