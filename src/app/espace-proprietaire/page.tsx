import { redirect } from "next/navigation";
import { Building2, LogOut } from "lucide-react";
import { seDeconnecter } from "@/app/connexion/actions";
import { VueMois } from "@/app/(app)/calendrier/vue-mois";
import { LogoMark } from "@/components/logo";
import { NavMois } from "@/components/nav-mois";
import { Badge, Card } from "@/components/ui";
import { getUtilisateur } from "@/lib/auth";
import { aujourdhui, libelleMois, moisDe, moisSuivant, moisValide, premierDuMois } from "@/lib/dates";
import { formatMontant } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { nuitsReservees, etatsDuMois, tauxOccupation } from "@/lib/calendrier";
import { calculerLigne, dansLeMois, totaliser } from "@/lib/synthese";
import { Telecharger } from "./boutons-telechargement";

export const metadata = { title: "Espace propriétaire" };

export default async function EspaceProprietaire({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const u = await getUtilisateur();
  if (!u || !u.actif) redirect("/connexion");
  if (u.type !== "proprietaire") redirect("/");

  const sp = await searchParams;
  const courant = moisDe(aujourdhui());
  const mois = moisValide(sp.mois) ? sp.mois : courant;
  const debut = premierDuMois(mois);
  const fin = premierDuMois(moisSuivant(mois));
  const supabase = await createClient();

  // Tout ce qui est lu ici passe par des vues qui ne montrent que les logements de ce propriétaire
  const [{ data: logements }, { data: versements }, { data: reservations }, { data: maintenance }, { data: rapports }, { data: factures }] = await Promise.all([
    supabase.from("proprietaire_logements").select("id, nom, ville, type").order("nom"),
    supabase.from("proprietaire_versements").select("id, logement_id, date_versement, montant_recu, frais_menage, taux_commission").gte("date_versement", debut).lt("date_versement", fin),
    supabase.from("proprietaire_reservations").select("id, logement_id, type, arrivee, depart").lt("arrivee", fin).gt("depart", debut),
    supabase.from("proprietaire_maintenance").select("logement_id, montant, date_depense").gte("date_depense", debut).lt("date_depense", fin),
    supabase.from("rapports_mensuels").select("id, logement_id, mois, chemin_pdf").not("chemin_pdf", "is", null).order("mois", { ascending: false }).limit(60),
    supabase.from("factures").select("id, numero, logement_id, mois, chemin_pdf").eq("statut", "emise").not("chemin_pdf", "is", null).order("mois", { ascending: false }).limit(60),
  ]);

  const liste = logements ?? [];
  const nomDe = new Map(liste.map((l) => [l.id, l.nom]));

  const cartes = liste.map((l) => {
    const lignes = (versements ?? [])
      .filter((v) => v.logement_id === l.id && dansLeMois(v.date_versement, mois))
      .map((v) => calculerLigne({ id: v.id, logement_id: v.logement_id, date_versement: v.date_versement, montant_recu: Number(v.montant_recu), frais_menage: Number(v.frais_menage), taux_commission: Number(v.taux_commission) }));
    const totaux = totaliser(lignes);
    const resas = (reservations ?? []).filter((r) => r.logement_id === l.id).map((r) => ({ id: r.id, arrivee: r.arrivee, depart: r.depart, type: r.type as "reservation" | "blocage" }));
    const etats = etatsDuMois(mois, resas);
    const sejours = resas.filter((r) => r.type === "reservation").length;
    const frais = Math.round((maintenance ?? []).filter((d) => d.logement_id === l.id).reduce((s, d) => s + Math.round(Number(d.montant) * 100), 0)) / 100;
    return { l, totaux, resas, nuits: nuitsReservees(etats), occupation: tauxOccupation(etats), sejours, frais, aDesVersements: lignes.length > 0 };
  });

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

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 md:py-12">
        <div className="enter">
          <h1 className="font-display text-3xl font-semibold tracking-tight">Bonjour {u.prenom}</h1>
          <p className="mt-1 text-ink-2 text-pretty">Voici l&apos;activité de {liste.length > 1 ? "vos logements" : "votre logement"}, mois par mois.</p>
        </div>

        {liste.length === 0 ? (
          <Card className="enter flex flex-col items-center px-6 py-14 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">
              <Building2 className="h-7 w-7" />
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">Aucun logement relié à votre compte</h2>
            <p className="mt-1 max-w-md text-ink-2 text-pretty">Votre conciergerie va associer vos logements à votre espace. Vous les retrouverez ici dès que ce sera fait.</p>
          </Card>
        ) : (
          <>
            <NavMois mois={mois} moisCourant={courant} lien={(m) => `/espace-proprietaire?mois=${m}`} />

            {cartes.map(({ l, totaux, resas, nuits, occupation, sejours, frais, aDesVersements }, i) => (
              <section key={l.id} className="enter space-y-4" style={{ "--i": i } as React.CSSProperties} aria-labelledby={`l-${l.id}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h2 id={`l-${l.id}`} className="font-display text-xl font-semibold tracking-tight">
                    {l.nom}
                  </h2>
                  <span className="text-sm text-ink-3 capitalize">{libelleMois(mois)}</span>
                </div>

                <Card className="p-5">
                  <p className="text-sm text-ink-2">Votre revenu net du mois</p>
                  <p className="num mt-1 font-display text-4xl font-semibold tracking-tight">
                    {aDesVersements ? formatMontant(totaux.revenuProprietaire) : "—"} <span className="text-base font-medium text-ink-3">MAD</span>
                  </p>
                  <p className="mt-1 text-sm text-ink-3 text-pretty">
                    {aDesVersements ? `Après ménage et commission Perfect Stay (${formatMontant(totaux.commissionTTC)} MAD TTC).` : "Les versements de ce mois ne sont pas encore enregistrés."}
                  </p>
                  <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ["Nuits réservées", String(nuits)],
                      ["Occupation", `${Math.round(occupation * 100)} %`],
                      ["Séjours", String(sejours)],
                      ["Maintenance", `${formatMontant(frais)} MAD`],
                    ].map(([t, v]) => (
                      <div key={t} className="rounded-xl bg-sunken/60 px-3 py-2.5">
                        <dt className="text-xs text-ink-3">{t}</dt>
                        <dd className="num mt-0.5 font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>

                <VueMois mois={mois} aujourdhui={aujourdhui()} nomLogement={l.nom} reservations={resas} lectureSeule />
              </section>
            ))}

            <section className="enter space-y-3" aria-labelledby="docs">
              <h2 id="docs" className="font-display text-xl font-semibold tracking-tight">
                Vos documents
              </h2>
              {(rapports ?? []).length + (factures ?? []).length ? (
                <Card className="divide-y divide-line overflow-hidden">
                  {(rapports ?? []).map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                      <span>
                        <span className="font-medium capitalize">Rapport · {libelleMois(String(r.mois).slice(0, 7))}</span>
                        <span className="block text-sm text-ink-3">{nomDe.get(r.logement_id) ?? "Logement"}</span>
                      </span>
                      <Telecharger type="rapport" id={r.id} libelle="Télécharger" />
                    </div>
                  ))}
                  {(factures ?? []).map((f) => (
                    <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                      <span>
                        <span className="flex items-center gap-2 font-medium capitalize">
                          Facture · {libelleMois(String(f.mois).slice(0, 7))} <Badge ton="marque">{f.numero}</Badge>
                        </span>
                        <span className="block text-sm text-ink-3">{f.logement_id ? (nomDe.get(f.logement_id) ?? "Logement") : "Logement"}</span>
                      </span>
                      <Telecharger type="facture" id={f.id} libelle="Télécharger" />
                    </div>
                  ))}
                </Card>
              ) : (
                <Card className="p-5 text-ink-2 text-pretty">Vos rapports mensuels et vos factures apparaîtront ici dès le 1<sup>er</sup> du mois suivant.</Card>
              )}
            </section>
          </>
        )}
        <p className="text-center text-xs text-ink-3">
          Une question ? Contactez directement Perfect Stay.
        </p>
      </main>
    </div>
  );
}
