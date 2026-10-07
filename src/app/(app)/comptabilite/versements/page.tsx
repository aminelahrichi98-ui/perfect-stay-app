import Link from "next/link";
import { Link2, Plus, Wallet } from "lucide-react";
import { NavMois } from "@/components/nav-mois";
import { Badge, buttonClass, Card, Notice } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { aujourdhui, formatJour, libelleMois, moisDe, moisSuivant, moisValide, premierDuMois } from "@/lib/dates";
import { formatMontant } from "@/lib/format";
import { lireModeTva } from "@/lib/mode-tva-serveur";
import { createClient } from "@/lib/supabase/server";
import { calculerLigne, totaliser } from "@/lib/synthese";
import { lireLogementsCompta, lireTauxTva } from "../donnees";
import { FiltreLogement } from "../filtre-logement";

export const metadata = { title: "Versements" };

export default async function PageVersements({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string; logement?: string; cree?: string; modifie?: string; supprime?: string; facture?: string }>;
}) {
  const u = await exigerAcces("comptabilite");
  const sp = await searchParams;
  const courant = moisDe(aujourdhui());
  const mois = moisValide(sp.mois) ? sp.mois : courant;
  const mode = await lireModeTva();
  const modifiable = peutModifier(u, "comptabilite");
  const supabase = await createClient();

  const [logements, tauxTva] = await Promise.all([lireLogementsCompta(), lireTauxTva()]);
  const nomDe = new Map(logements.map((l) => [l.id, l.nom]));
  const filtre = logements.some((l) => l.id === sp.logement) ? (sp.logement as string) : "";

  let requete = supabase
    .from("versements")
    .select("id, logement_id, date_versement, montant_recu, frais_menage, taux_commission, note, reservation_id")
    .gte("date_versement", premierDuMois(mois))
    .lt("date_versement", premierDuMois(moisSuivant(mois)))
    .order("date_versement", { ascending: false });
  if (filtre) requete = requete.eq("logement_id", filtre);
  const { data } = await requete;

  const lignes = (data ?? []).map((v) =>
    calculerLigne(
      {
        id: v.id,
        logement_id: v.logement_id,
        date_versement: v.date_versement,
        montant_recu: Number(v.montant_recu),
        frais_menage: Number(v.frais_menage),
        taux_commission: Number(v.taux_commission),
        note: v.note,
        reservation_id: v.reservation_id,
      },
      tauxTva,
    ),
  );
  const t = totaliser(lignes, tauxTva);
  const libelleCommission = mode === "ht" ? "Commission HT" : "Commission TTC";
  const autres: Record<string, string> = { mois };

  return (
    <div className="space-y-5">
      {sp.cree || sp.modifie || sp.supprime ? <Notice ton="ok">{sp.cree ? "Versement enregistré." : sp.modifie ? "Versement modifié." : "Versement supprimé."}</Notice> : null}
      {sp.facture ? (
        <Notice ton="info">
          La facture <strong>{sp.facture}</strong> a déjà été émise pour ce logement et ce mois : ce changement n&apos;y figure pas. Les factures émises ne sont jamais modifiées.
        </Notice>
      ) : null}

      <div className="enter flex flex-wrap items-center gap-3">
        <NavMois mois={mois} moisCourant={courant} lien={(m) => `/comptabilite/versements?${new URLSearchParams({ mois: m, ...(filtre ? { logement: filtre } : {}) })}`} />
        <FiltreLogement chemin="/comptabilite/versements" logements={logements} valeur={filtre} autres={autres} />
        {modifiable ? (
          <Link href="/comptabilite/versements/nouveau" className={buttonClass("primary", "md", "ml-auto")}>
            <Plus className="h-4 w-4" /> Nouveau versement
          </Link>
        ) : null}
      </div>

      {lignes.length ? (
        <>
          <Card className="enter overflow-hidden" style={{ "--i": 1 } as React.CSSProperties}>
            <ul className="divide-y divide-line">
              {lignes.map((l) => {
                const contenu = (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="num font-medium">{formatJour(l.date_versement)}</span>
                        <span className="truncate text-ink-2">{nomDe.get(l.logement_id) ?? "Logement"}</span>
                        {l.reservation_id ? (
                          <Badge ton="ok">
                            <Link2 className="h-3 w-3" /> Réservation liée
                          </Badge>
                        ) : null}
                      </span>
                      <span className="num mt-1 block text-[0.82rem] text-ink-3">
                        Loyer net {formatMontant(l.calcul.loyerNetHorsMenage)} · {libelleCommission} {formatMontant(mode === "ht" ? l.calcul.commissionHT : l.calcul.commission)} · Propriétaire {formatMontant(l.calcul.revenuProprietaire)}
                        {l.note ? ` · ${l.note}` : ""}
                      </span>
                    </span>
                    <span className="num shrink-0 text-right">
                      <span className="block font-display text-lg font-semibold tracking-tight">{formatMontant(l.calcul.montantRecu)}</span>
                      <span className="block text-[0.75rem] text-ink-3">MAD reçus</span>
                    </span>
                  </>
                );
                return (
                  <li key={l.id}>
                    {modifiable ? (
                      <Link href={`/comptabilite/versements/${l.id}`} className="press flex min-h-[4.5rem] items-center gap-4 px-5 py-3.5 hover:bg-sunken/60">
                        {contenu}
                      </Link>
                    ) : (
                      <div className="flex min-h-[4.5rem] items-center gap-4 px-5 py-3.5">{contenu}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card className="enter p-5" style={{ "--i": 2 } as React.CSSProperties}>
            <h2 className="mb-3 font-display text-base font-semibold tracking-tight capitalize">Total · {libelleMois(mois)}</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              {[
                ["Montants reçus", t.montantsRecus],
                ["Loyers hors ménage", t.loyerNet],
                [libelleCommission, mode === "ht" ? t.commissionHT : t.commissionTTC],
                ["Revenu propriétaires", t.revenuProprietaire],
              ].map(([label, valeur]) => (
                <div key={String(label)}>
                  <dt className="text-[0.8rem] text-ink-3">{String(label)}</dt>
                  <dd className="num font-display text-lg font-semibold tracking-tight">{formatMontant(Number(valeur))}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </>
      ) : (
        <Card className="enter flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">
            <Wallet className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-xl font-semibold tracking-tight capitalize">Aucun versement en {libelleMois(mois)}</h2>
          <p className="mt-1 max-w-md text-ink-2 text-pretty">Saisissez le montant reçu pour chaque réservation : le ménage, la commission, la TVA et le revenu du propriétaire se calculent tout seuls.</p>
          {modifiable ? (
            <Link href="/comptabilite/versements/nouveau" className={buttonClass("primary", "md", "mt-5")}>
              <Plus className="h-4 w-4" /> Saisir un versement
            </Link>
          ) : null}
        </Card>
      )}
    </div>
  );
}
