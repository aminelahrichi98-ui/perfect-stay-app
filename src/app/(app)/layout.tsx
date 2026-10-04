import { redirect } from "next/navigation";
import { Navigation } from "@/components/nav";
import { getUtilisateur, modulesVisibles } from "@/lib/auth";
import { TYPES_UTILISATEUR } from "@/lib/modules";

export default async function LayoutApplication({ children }: { children: React.ReactNode }) {
  const u = await getUtilisateur();
  if (!u || !u.actif) redirect("/connexion");
  if (u.type === "proprietaire") redirect("/espace-proprietaire");

  const role = u.admin ? "Administrateur" : (TYPES_UTILISATEUR.find((t) => t.value === u.type)?.label ?? "");

  return (
    <div className="min-h-dvh">
      <Navigation autorises={modulesVisibles(u)} utilisateur={{ prenom: u.prenom, nom: u.nom, role }} />
      <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:ml-[17rem] md:w-[calc(100%-17rem)] md:max-w-none md:px-10 md:pt-10 md:pb-16">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
