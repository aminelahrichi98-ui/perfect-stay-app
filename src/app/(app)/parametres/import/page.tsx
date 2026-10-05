import { redirect } from "next/navigation";
import { exigerAcces } from "@/lib/auth";
import { ImportAnciennesDonnees } from "./import-anciennes-donnees";

export const metadata = { title: "Import des anciennes données" };

export default async function PageImport() {
  const u = await exigerAcces("parametres");
  if (!u.admin) redirect("/parametres");
  return <ImportAnciennesDonnees />;
}
