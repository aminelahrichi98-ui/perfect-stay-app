import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { SetupGuide } from "@/components/setup-guide";
import { Notice } from "@/components/ui";
import { supabaseConfigure } from "@/lib/supabase/config";
import { FormulaireConnexion } from "./formulaire";

export const metadata: Metadata = { title: "Connexion" };

export default async function PageConnexion({ searchParams }: { searchParams: Promise<{ lien?: string }> }) {
  if (!supabaseConfigure()) return <SetupGuide />;
  const { lien } = await searchParams;
  return (
    <AuthShell titre="Bon retour" description="Connectez-vous pour accéder à votre espace Perfect Stay.">
      {lien === "expire" ? (
        <div className="mb-5">
          <Notice ton="danger">Ce lien a expiré ou a déjà été utilisé. Utilisez « Mot de passe oublié » pour en recevoir un nouveau.</Notice>
        </div>
      ) : null}
      <FormulaireConnexion />
    </AuthShell>
  );
}
