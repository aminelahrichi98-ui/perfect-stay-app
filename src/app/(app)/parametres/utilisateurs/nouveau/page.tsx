import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { creerUtilisateur } from "../../actions";
import { FormulaireUtilisateur } from "../../formulaire-utilisateur";

export const metadata = { title: "Nouvel utilisateur" };

export default async function PageNouvelUtilisateur() {
  const moi = await exigerAcces("parametres", "modifier");
  return (
    <div className="max-w-3xl">
      <Link href="/parametres" className="press mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Utilisateurs
      </Link>
      <Card className="p-5 md:p-7">
        <h2 className="mb-6 font-display text-xl font-semibold tracking-tight">Nouvel utilisateur</h2>
        <FormulaireUtilisateur
          action={creerUtilisateur}
          accordant={{ admin: moi.admin, droits: moi.droits }}
          libelleBouton="Créer et envoyer l'invitation"
        />
      </Card>
    </div>
  );
}
