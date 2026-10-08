import { Onglets } from "@/components/onglets";
import { PageHeader } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";

export default async function LayoutMarketing({ children }: { children: React.ReactNode }) {
  await exigerAcces("marketing");
  return (
    <>
      <PageHeader titre="Marketing" description="Budget publicitaire, coût par lead et calendrier des publications." />
      <Onglets
        libelle="Sections du marketing"
        items={[
          { href: "/marketing", label: "Dépenses publicitaires", exact: true },
          { href: "/marketing/publications", label: "Publications" },
        ]}
      />
      {children}
    </>
  );
}
