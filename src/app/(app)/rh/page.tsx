import Link from "next/link";
import { Plus, UserRound } from "lucide-react";
import { Badge, buttonClass, Card, Notice } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { formatJour } from "@/lib/dates";
import { anciennete, libelleContrat } from "@/lib/rh";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Équipe et prestataires" };

export default async function PageRh({ searchParams }: { searchParams: Promise<{ supprime?: string }> }) {
  const u = await exigerAcces("rh");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("rh_membres").select("id, nom, role, categorie, type_contrat, telephone, date_arrivee, date_depart").order("nom");
  const membres = data ?? [];
  const presents = membres.filter((m) => !m.date_depart);
  const partis = membres.filter((m) => m.date_depart);
  const modifiable = peutModifier(u, "rh");

  const ligne = (m: (typeof membres)[number]) => (
    <li key={m.id}>
      <Link href={`/rh/${m.id}`} className="press flex min-h-[4.25rem] items-center gap-4 px-5 py-3 hover:bg-sunken/60">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-wine-100 font-semibold text-wine-800">{m.nom.charAt(0).toUpperCase()}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{m.nom}</span>
          <span className="block truncate text-sm text-ink-2">
            {m.role || "Rôle non renseigné"}
            {m.date_arrivee ? <span className="text-ink-3"> · {m.date_depart ? `de ${formatJour(m.date_arrivee)} à ${formatJour(m.date_depart)}` : `depuis ${anciennete(m.date_arrivee)}`}</span> : null}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <Badge ton={m.categorie === "prestataire" ? "attention" : "marque"}>{m.categorie === "prestataire" ? "Prestataire" : "Équipe"}</Badge>
          <span className="text-xs text-ink-3">{libelleContrat(m.type_contrat)}</span>
        </span>
      </Link>
    </li>
  );

  return (
    <div className="space-y-5">
      {sp.supprime ? <Notice ton="ok">Fiche supprimée.</Notice> : null}
      {modifiable ? (
        <Link href="/rh/nouveau" className={buttonClass("primary", "md")}>
          <Plus className="h-4 w-4" /> Nouvelle fiche
        </Link>
      ) : null}
      {presents.length ? (
        <Card className="enter overflow-hidden">
          <ul className="divide-y divide-line">{presents.map(ligne)}</ul>
        </Card>
      ) : (
        <Card className="enter flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">
            <UserRound className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">Aucune fiche pour le moment</h2>
          <p className="mt-1 max-w-md text-ink-2 text-pretty">Créez une fiche pour chaque membre de l&apos;équipe et chaque prestataire : coordonnées, contrat, date d&apos;arrivée et documents.</p>
        </Card>
      )}
      {partis.length ? (
        <section aria-labelledby="anciens" className="space-y-2">
          <h2 id="anciens" className="text-sm font-medium tracking-wide text-ink-3 uppercase">
            Anciens
          </h2>
          <Card className="overflow-hidden opacity-75">
            <ul className="divide-y divide-line">{partis.map(ligne)}</ul>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
