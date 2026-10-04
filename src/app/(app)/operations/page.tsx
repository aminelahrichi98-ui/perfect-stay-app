import { redirect } from "next/navigation";
import { getUtilisateur, peutVoir } from "@/lib/auth";
import { MODULE_BY_KEY, type ModuleKey } from "@/lib/modules";

export default async function Operations() {
  const u = await getUtilisateur();
  if (!u) redirect("/connexion");
  const premier = (["menage", "maintenance", "stock", "checklists"] as ModuleKey[]).find((k) => peutVoir(u, k));
  redirect(premier ? MODULE_BY_KEY[premier].href : "/acces-refuse");
}
