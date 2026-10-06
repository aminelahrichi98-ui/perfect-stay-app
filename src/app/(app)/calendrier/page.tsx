import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Home, TriangleAlert } from "lucide-react";
import { Badge, buttonClass, Card, PageHeader } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { cn } from "@/lib/cn";
import {
  aujourdhui as jourDuJour,
  ajouterJours,
  formatJour,
  libelleMois,
  moisDe,
  moisPrecedent,
  moisSuivant,
  moisValide,
  nbNuits,
  premierDuMois,
} from "@/lib/dates";
import { formatDateHeure } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { BoutonSynchro } from "./bouton-synchro";
import { DetailsReservations, type DetailReservation } from "./details-reservations";
import { SelecteurLogement } from "./selecteur-logement";
import { VueLogements } from "./vue-logements";
import { VueMois } from "./vue-mois";

export const metadata = { title: "Calendrier" };

type Responsable = { prenom: string; nom?: string } | null;
const nomResponsable = (r: unknown) => {
  const x = (Array.isArray(r) ? r[0] : r) as Responsable;
  return x ? `${x.prenom}${x.nom ? ` ${x.nom}` : ""}`.trim() : "";
};

export default async function PageCalendrier({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; mois?: string; logement?: string }>;
}) {
  const u = await exigerAcces("calendrier");
  const sp = await searchParams;
  const aujourdhui = jourDuJour();
  const mois = moisValide(sp.mois) ? sp.mois : moisDe(aujourdhui);
  const vue = sp.vue === "mois" ? "mois" : "logements";
  const modifiable = peutModifier(u, "calendrier");
  const supabase = await createClient();

  const { data: tous } = await supabase
    .from("logements")
    .select("id, nom, ville, statut, logement_ical(id, plateforme, derniere_sync, derniere_erreur)")
    .order("nom");
  const logements = tous ?? [];
  const suivis = logements.filter((l) => l.statut !== "en_pause");
  const choisi = logements.find((l) => l.id === sp.logement) ?? suivis[0] ?? logements[0];

  const debutMois = premierDuMois(mois);
  const debutSuivant = premierDuMois(moisSuivant(mois));
  let requete = supabase
    .from("reservations")
    .select("id, logement_id, type, plateforme, code, arrivee, depart")
    .eq("statut", "confirmee")
    .lt("arrivee", debutSuivant)
    .gt("depart", debutMois)
    .order("arrivee");
  if (vue === "mois" && choisi) requete = requete.eq("logement_id", choisi.id);
  const { data: resas } = await requete;
  const reservations = resas ?? [];

  const idsResas = reservations.map((r) => r.id);
  const [{ data: menages }, { data: prochains }, { data: entreprise }] = await Promise.all([
    idsResas.length
      ? supabase.from("taches").select("reservation_id, echeance, statut, responsable:profiles!responsable_id(prenom, nom)").in("reservation_id", idsResas)
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("taches")
      .select("id, echeance, statut, logements(nom), responsable:profiles!responsable_id(prenom)")
      .eq("type", "menage")
      .in("statut", ["a_faire", "en_cours", "bloque"])
      .gte("echeance", aujourdhui)
      .order("echeance")
      .limit(8),
    supabase.from("entreprise").select("responsable_menage").eq("id", 1).maybeSingle(),
  ]);

  const menageDe = new Map((menages ?? []).map((m: { reservation_id: string; echeance: string | null; statut: string; responsable: unknown }) => [m.reservation_id, m]));
  const nomLogement = new Map(logements.map((l) => [l.id, l.nom]));

  const details: Record<string, DetailReservation> = {};
  for (const r of reservations) {
    const m = menageDe.get(r.id);
    details[r.id] = {
      logementId: r.logement_id,
      logement: nomLogement.get(r.logement_id) ?? "",
      plateforme: r.plateforme,
      type: r.type,
      arrivee: r.arrivee,
      depart: r.depart,
      code: r.code,
      menage: m ? { echeance: m.echeance, statut: m.statut, responsable: nomResponsable(m.responsable) } : undefined,
    };
  }

  const liens = logements.flatMap((l) => (l.logement_ical ?? []).map((i) => ({ ...i, logement: l.nom })));
  const dernieres = liens.map((i) => i.derniere_sync).filter(Boolean) as string[];
  const derniereSync = dernieres.length ? formatDateHeure([...dernieres].sort().at(-1)!) : null;
  const enErreur = liens.filter((i) => i.derniere_erreur);
  const sansCalendrier = suivis.filter((l) => !(l.logement_ical ?? []).length);

  const lien = (surcharge: { vue?: string; mois?: string }) => {
    const v = surcharge.vue ?? vue;
    const m = surcharge.mois ?? mois;
    const p = new URLSearchParams({ vue: v, mois: m });
    if (v === "mois" && choisi) p.set("logement", choisi.id);
    return `/calendrier?${p}`;
  };

  const lignes = suivis.map((l) => ({
    id: l.id,
    nom: l.nom,
    ville: l.ville,
    reservations: reservations.filter((r) => r.logement_id === l.id).map((r) => ({ id: r.id, arrivee: r.arrivee, depart: r.depart, type: r.type })),
  }));

  const vide = !logements.length;

  return (
    <>
      <PageHeader
        titre="Calendrier"
        description="Les réservations de tous vos logements, synchronisées depuis les calendriers des plateformes."
        action={modifiable && !vide ? <BoutonSynchro derniereSync={derniereSync} /> : null}
      />

      {vide ? (
        <Card className="enter flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">
            <CalendarDays className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">Aucun logement pour le moment</h2>
          <p className="mt-1 max-w-md text-ink-2 text-pretty">Créez vos logements et ajoutez leur lien iCal : leurs réservations apparaîtront ici toutes seules.</p>
          <Link href="/logements" className={buttonClass("primary", "md", "mt-5")}>
            <Home className="h-4 w-4" /> Aller aux logements
          </Link>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {enErreur.length ? (
              <Card className="enter flex items-start gap-3 border-warn/25 bg-warn-bg p-4">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-warn">Certains calendriers n&apos;ont pas pu être synchronisés</p>
                  <ul className="mt-1 space-y-0.5 text-ink-2">
                    {enErreur.map((i) => (
                      <li key={i.id}>
                        <strong className="text-ink">{i.logement}</strong> ({i.plateforme}) : {i.derniere_erreur}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            ) : null}
            {sansCalendrier.length && modifiable ? (
              <Card className="enter flex items-start gap-3 p-4">
                <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-ink-3" />
                <p className="text-sm text-ink-2 text-pretty">
                  <strong className="text-ink">{sansCalendrier.length} logement{sansCalendrier.length > 1 ? "s" : ""} sans lien iCal :</strong>{" "}
                  {sansCalendrier.map((l, i) => (
                    <span key={l.id}>
                      {i ? ", " : ""}
                      <Link href={`/logements/${l.id}/modifier`} className="underline decoration-line-strong underline-offset-4 hover:text-wine-700">
                        {l.nom}
                      </Link>
                    </span>
                  ))}
                  . Ajoutez-le depuis la fiche pour voir ses réservations ici.
                </p>
              </Card>
            ) : null}
            {modifiable && !entreprise?.responsable_menage ? (
              <Card className="enter flex items-start gap-3 p-4">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-ink-3" />
                <p className="text-sm text-ink-2 text-pretty">
                  Aucun <strong className="text-ink">responsable des ménages</strong> n&apos;est défini : les ménages créés automatiquement ne seront attribués à personne. Choisissez-le dans{" "}
                  <Link href="/parametres/entreprise" className="underline decoration-line-strong underline-offset-4 hover:text-wine-700">
                    Paramètres, Entreprise
                  </Link>
                  .
                </p>
              </Card>
            ) : null}
          </div>

          <div className="enter my-5 flex flex-wrap items-center gap-3" style={{ "--i": 1 } as React.CSSProperties}>
            <div role="tablist" aria-label="Type de vue" className="inline-flex rounded-xl border border-line-strong bg-sunken/60 p-1">
              {[
                { v: "logements", label: "Tous les logements" },
                { v: "mois", label: "Un logement" },
              ].map((o) => (
                <Link
                  key={o.v}
                  href={lien({ vue: o.v })}
                  role="tab"
                  aria-selected={vue === o.v}
                  className={cn("press h-9 rounded-lg px-4 text-sm leading-9 font-medium", vue === o.v ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:text-ink")}
                >
                  {o.label}
                </Link>
              ))}
            </div>

            {vue === "mois" && choisi ? <SelecteurLogement logements={logements.map((l) => ({ id: l.id, nom: l.nom }))} valeur={choisi.id} mois={mois} /> : null}

            <div className="ml-auto flex items-center gap-1.5">
              <Link href={lien({ mois: moisPrecedent(mois) })} aria-label="Mois précédent" className="press grid h-11 w-11 place-items-center rounded-xl border border-line-strong bg-surface shadow-card hover:bg-sunken">
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <h2 className="min-w-[8.5rem] text-center font-display text-lg font-semibold tracking-tight capitalize" aria-live="polite">
                {libelleMois(mois)}
              </h2>
              <Link href={lien({ mois: moisSuivant(mois) })} aria-label="Mois suivant" className="press grid h-11 w-11 place-items-center rounded-xl border border-line-strong bg-surface shadow-card hover:bg-sunken">
                <ChevronRight className="h-5 w-5" />
              </Link>
              {mois !== moisDe(aujourdhui) ? (
                <Link href={lien({ mois: moisDe(aujourdhui) })} className={buttonClass("ghost", "sm", "ml-1")}>
                  Aujourd&apos;hui
                </Link>
              ) : null}
            </div>
          </div>

          <div className="enter" style={{ "--i": 2 } as React.CSSProperties}>
            <DetailsReservations details={details}>
              {vue === "logements" ? (
                suivis.length ? (
                  <VueLogements mois={mois} aujourdhui={aujourdhui} lignes={lignes} />
                ) : (
                  <Card className="p-6 text-center text-ink-2">Tous vos logements sont en pause.</Card>
                )
              ) : choisi ? (
                <VueMois
                  mois={mois}
                  aujourdhui={aujourdhui}
                  nomLogement={choisi.nom}
                  reservations={reservations.map((r) => ({ id: r.id, arrivee: r.arrivee, depart: r.depart, type: r.type }))}
                  plateformes={Object.fromEntries(reservations.map((r) => [r.id, r.plateforme]))}
                />
              ) : null}
            </DetailsReservations>

            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[0.82rem] text-ink-2" aria-label="Légende">
              <li className="flex items-center gap-2">
                <span className="h-3 w-5 rounded bg-nuit" /> Nuit réservée
              </li>
              <li className="flex items-center gap-2">
                <span className="hachures h-3 w-5 rounded border border-line" /> Nuits bloquées
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-wine-600" /> Départ (jour de ménage)
              </li>
            </ul>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <Card className="enter p-5 lg:col-span-2" style={{ "--i": 3 } as React.CSSProperties}>
              <h2 className="mb-3 font-display text-base font-semibold tracking-tight capitalize">
                {vue === "mois" && choisi ? `${choisi.nom} · ` : ""}Séjours de {libelleMois(mois)}
              </h2>
              {reservations.length ? (
                <ul className="divide-y divide-line">
                  {reservations.map((r) => {
                    const n = nbNuits(r.arrivee, r.depart);
                    const m = menageDe.get(r.id);
                    return (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                        <span className="min-w-0">
                          <span className="num block font-medium">
                            {formatJour(r.arrivee)} → {formatJour(r.depart)}
                          </span>
                          <span className="block text-sm text-ink-2">
                            {vue === "logements" ? `${nomLogement.get(r.logement_id) ?? ""} · ` : ""}
                            {n} nuit{n > 1 ? "s" : ""} · {r.plateforme}
                            {r.code ? ` · ${r.code}` : ""}
                          </span>
                        </span>
                        {r.type === "blocage" ? (
                          <Badge>Bloqué</Badge>
                        ) : m?.echeance ? (
                          <Badge ton="marque">Ménage le {formatJour(m.echeance).slice(0, 5)}</Badge>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-ink-3">Aucun séjour ce mois-ci{liens.length ? "." : " : ajoutez un lien iCal pour importer les réservations."}</p>
              )}
            </Card>

            <Card className="enter p-5" style={{ "--i": 4 } as React.CSSProperties}>
              <h2 className="mb-3 font-display text-base font-semibold tracking-tight">Prochains ménages</h2>
              {prochains?.length ? (
                <ul className="divide-y divide-line">
                  {prochains.map((t: { id: string; echeance: string | null; statut: string; logements: unknown; responsable: unknown }) => {
                    const lg = (Array.isArray(t.logements) ? t.logements[0] : t.logements) as { nom: string } | null;
                    const resp = nomResponsable(t.responsable);
                    const demain = ajouterJours(aujourdhui, 1);
                    const quand = t.echeance === aujourdhui ? "Aujourd'hui" : t.echeance === demain ? "Demain" : t.echeance ? formatJour(t.echeance).slice(0, 5) : "—";
                    return (
                      <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{lg?.nom ?? "Logement"}</span>
                          <span className="block text-[0.8rem] text-ink-3">{resp || "Non assigné"}</span>
                        </span>
                        <Badge ton={t.echeance === aujourdhui ? "attention" : "neutre"} className="num shrink-0">
                          {quand}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-ink-3">Aucun ménage à venir.</p>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
