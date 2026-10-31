import { redirect } from "next/navigation";
import { getUtilisateur } from "@/lib/auth";
import { FormulaireMotDePasse } from "./formulaire";

export const metadata = { title: "Mon mot de passe" };

export default async function PageMonCompte() {
  const u = await getUtilisateur();
  if (!u || !u.actif) redirect("/connexion");
  return <FormulaireMotDePasse email={u.email} retour={u.type === "proprietaire" ? "/espace-proprietaire" : "/"} />;
}
