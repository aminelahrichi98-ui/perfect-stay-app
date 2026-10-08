import { PageHeader } from "@/components/ui";
import { Onglets } from "@/components/onglets";
import { exigerConnecte } from "./connecte";
import { MODULE_BY_KEY, type ModuleKey } from "@/lib/modules";
import { peutVoir } from "@/lib/auth";

export default async function LayoutOperations({ children }: { children: React.ReactNode }) {
  const u = await exigerConnecte();
  const onglets = (["menage", "maintenance", "stock", "checklists"] as ModuleKey[])
    .filter((k) => peutVoir(u, k))
    .map((k) => ({ href: MODULE_BY_KEY[k].href, label: MODULE_BY_KEY[k].label }));
  return (
    <>
      <PageHeader titre="Opérations" description="Ménages, maintenance, stock et check-lists." />
      {onglets.length > 1 ? <Onglets libelle="Sections des opérations" items={onglets} /> : null}
      {children}
    </>
  );
}
