import Link from "next/link";
import { Plus, Wallet, Wrench } from "lucide-react";
import { FiltreLogement } from "@/app/(app)/comptabilite/filtre-logement";
import { Badge, buttonClass, Card, Notice } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatJour } from "@/lib/dates";
import { formatMontant } from "@/lib/format";
import { libelleType, REMBOURSEMENTS, STATUTS_INCIDENT, sommeMad, TYPES_INCIDENT } from "@/lib/operations";
import { createClient } from "@/lib/supabase/server";
import { lireLogementsOps } from "../donnees";

export const metadata = { title: "Maintenance" };

const VUES = [
  { cle: "ouverts", libelle: "En cours" },
  { cle: "resolus", libelle: "Résolus" },
  { cle: "tous", libelle: "Tous" },
] as const;

export default async function PageMaintenance({ searchParams }: { searchParams: Promise<{ vue?: string; logement?: string; supprime?: string }> }) {
  const u = await exigerAcces("maintenance");
  const sp = await searchParams;
  const vue = VUES.some((v) => v.cle === sp.vue) ? (sp.vue as (typeof VUES)[number]["cle"]) : "ouverts";
  const modifiable = peutModifier(u, "maintenance");
  const supabase = await createClient();
  const logements = await lireLogementsOps();
  const nomLogement = new Map(logements.map((l) => [l.id, l.nom]));
  const filtre = logements.some((l) => l.id === sp.logement) ? (sp.logement as string) : "";

  const { data } = await supabase
    .from("incidents")
    .select("id, logement_id, type, titre, statut, date_incident, remboursement, incident_frais(montant)")
    .order("date_incident", { ascending: false })
    .limit(300);
  const tous = (data ?? []).filter((i) => !filtre || i.logement_id === filtre);
  const ouverts = tous.filter((i) => i.statut !== "resolu");
  const resolus = tous.filter((i) => i.statut === "resolu");
  const affiches = vue === "ouverts" ? ouverts : vue === "resolus" ? resolus : tous;
  const nb = { ouverts: ouverts.length, resolus: resolus.length, tous: tous.length };
  const lien = (v: string) => `/operations/maintenance?${new URLSearchParams({ vue: v, ...(filtre ? { logement: filtre } : {}) })}`;

  return (
    <div className="space-y-5">
      {sp.supprime ? <Notice ton="ok">Incident supprimé.</Notice> : null}
      <div className="enter flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Vue des incidents" className="flex gap-2 overflow-x-auto">
          {VUES.map((v) => (
            <Link
              key={v.cle}
              href={lien(v.cle)}
              role="tab"
              aria-selected={vue === v.cle}
              className={cn(
                "press inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap",
                vue === v.cle ? "border-wine-500 bg-wine-50 text-wine-800" : "border-line-strong bg-surface text-ink-2 hover:bg-sunken",
              )}
            >
              {v.libelle} <span className="num text-xs text-ink-3">{nb[v.cle]}</span>
            </Link>
          ))}
        </div>
        <FiltreLogement chemin="/operations/maintenance" logements={logements.map((l) => ({ id: l.id, nom: l.nom }))} valeur={filtre} autres={{ vue }} />
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href="/operations/maintenance/remboursements" className={buttonClass("secondary", "md")}>
            <Wallet className="h-4 w-4" /> Remboursements
          </Link>
          {modifiable ? (
            <Link href="/operations/maintenance/nouveau" className={buttonClass("primary", "md")}>
              <Plus className="h-4 w-4" /> Nouvel incident
            </Link>
          ) : null}
        </div>
      </div>

      {affiches.length ? (
        <Card className="enter overflow-hidden" style={{ "--i": 1 } as React.CSSProperties}>
          <ul className="divide-y divide-line">
            {affiches.map((i) => {
              const statut = STATUTS_INCIDENT.find((s) => s.value === i.statut);
              const remb = REMBOURSEMENTS.find((r) => r.value === i.remboursement);
              const total = sommeMad((i.incident_frais ?? []).map((f) => Number(f.montant)));
              return (
                <li key={i.id}>
                  <Link href={`/operations/maintenance/${i.id}`} className="press flex min-h-[4.5rem] items-center gap-4 px-5 py-3 hover:bg-sunken/60">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{i.titre}</span>
                      <span className="mt-0.5 block truncate text-sm text-ink-2">
                        {nomLogement.get(i.logement_id) ?? "Logement"} · {libelleType(TYPES_INCIDENT, i.type)} · <span className="num">{formatJour(i.date_incident)}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge ton={statut?.ton}>{statut?.label}</Badge>
                      {total > 0 ? (
                        <span className="num text-sm text-ink-2">
                          {formatMontant(total)} MAD {remb && i.remboursement !== "sans_objet" ? <span className={i.remboursement === "rembourse" ? "text-ok" : "text-warn"}>· {remb.label.toLowerCase()}</span> : null}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <Card className="enter flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">
            <Wrench className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">{vue === "resolus" ? "Aucun incident résolu" : "Aucun incident en cours"}</h2>
          <p className="mt-1 max-w-md text-ink-2 text-pretty">Panne, dégât ou plainte : déclarez l&apos;incident, ajoutez photos et factures, et suivez ce que le propriétaire doit vous rembourser.</p>
          {modifiable ? (
            <Link href="/operations/maintenance/nouveau" className={buttonClass("primary", "md", "mt-5")}>
              <Plus className="h-4 w-4" /> Déclarer un incident
            </Link>
          ) : null}
        </Card>
      )}
    </div>
  );
}
