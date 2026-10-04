import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { seDeconnecter } from "@/app/connexion/actions";
import { LogoMark } from "@/components/logo";
import { Card } from "@/components/ui";
import { getUtilisateur } from "@/lib/auth";

export const metadata = { title: "Espace propriétaire" };

export default async function EspaceProprietaire() {
  const u = await getUtilisateur();
  if (!u || !u.actif) redirect("/connexion");
  if (u.type !== "proprietaire") redirect("/");

  return (
    <div className="min-h-dvh">
      <header className="flex h-14 items-center justify-between bg-aub-900 px-4 pt-[env(safe-area-inset-top)] text-white md:px-10">
        <span className="flex items-center gap-2.5">
          <LogoMark className="h-6 w-auto" />
          <span className="font-display text-base font-semibold tracking-tight">Perfect Stay</span>
        </span>
        <form action={seDeconnecter}>
          <button type="submit" className="press inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-aub-200 hover:bg-white/10">
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <h1 className="enter font-display text-3xl font-semibold tracking-tight">Bonjour {u.prenom}</h1>
        <Card className="enter mt-6 p-6" style={{ "--i": 1 } as React.CSSProperties}>
          <p className="font-medium">Votre espace propriétaire arrive bientôt.</p>
          <p className="mt-1 text-ink-2 text-pretty">
            Vous y retrouverez vos revenus mensuels, votre taux d&apos;occupation, le calendrier de vos logements et vos rapports à télécharger.
          </p>
        </Card>
      </main>
    </div>
  );
}
