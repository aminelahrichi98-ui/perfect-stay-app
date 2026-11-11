import Link from "next/link";
import { Calculator, FileText, Plus } from "lucide-react";
import { buttonClass, Card, PageHeader } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { formatJour, jourDepuisInstant } from "@/lib/dates";
import { formatMad0, libelleType, parMois } from "@/lib/estimateur";
import { createClient } from "@/lib/supabase/server";
import { SupprimerEstimation } from "./supprimer";

export const metadata = { title: "Estimateur" };

export default async function PageEstimateur() {
  const u = await exigerAcces("estimateur");
  const modifiable = peutModifier(u, "estimateur");
  const supabase = await createClient();
  const { data } = await supabase
    .from("estimations")
    .select("id, created_at, prenom, telephone, quartier, type_bien, net_bas, net_haut")
    .order("created_at", { ascending: false })
    .limit(200);
  const liste = data ?? [];

  return (
    <>
      <PageHeader
        titre="Estimateur"
        description="Estimez les revenus d'un bien prospect et envoyez au propriétaire un PDF aux couleurs de Perfect Stay."
        action={
          modifiable ? (
            <Link href="/estimateur/nouvelle" className={buttonClass("primary", "md")}>
              <Plus className="h-4 w-4" /> Nouvelle estimation
            </Link>
          ) : null
        }
      />
      {liste.length ? (
        <Card className="enter overflow-hidden">
          <h2 className="border-b border-line px-5 py-3.5 font-display text-base font-semibold tracking-tight">Historique</h2>
          <ul className="divide-y divide-line">
            {liste.map((e) => (
              <li key={e.id} className="flex items-center gap-2 pr-2">
                <Link href={`/estimation/${e.id}`} className="press flex min-h-[4.25rem] min-w-0 flex-1 items-center gap-4 px-5 py-3 hover:bg-sunken/60">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-wine-50 text-wine-700">
                    <FileText className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {e.prenom} · {libelleType(e.type_bien)}
                    </span>
                    <span className="block truncate text-[0.82rem] text-ink-3">
                      {formatJour(jourDepuisInstant(e.created_at))} · {e.quartier}
                      {e.telephone ? ` · ${e.telephone}` : ""}
                    </span>
                  </span>
                  <span className="num shrink-0 text-right">
                    <span className="block font-medium">
                      {formatMad0(parMois(Number(e.net_bas)))} – {formatMad0(parMois(Number(e.net_haut)))}
                    </span>
                    <span className="block text-[0.75rem] text-ink-3">MAD/mois net</span>
                  </span>
                </Link>
                {u.admin ? <SupprimerEstimation id={e.id} prenom={e.prenom} /> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="enter flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">
            <Calculator className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">Aucune estimation pour l&apos;instant</h2>
          <p className="mt-1 max-w-md text-ink-2 text-pretty">Renseignez le bien, ses photos et des annonces comparables : le PDF premium se prépare tout seul.</p>
          {modifiable ? (
            <Link href="/estimateur/nouvelle" className={buttonClass("primary", "md", "mt-5")}>
              <Plus className="h-4 w-4" /> Nouvelle estimation
            </Link>
          ) : null}
        </Card>
      )}
    </>
  );
}
