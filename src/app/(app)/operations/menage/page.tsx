import Link from "next/link";
import { ClipboardCheck, Plus, Sparkles } from "lucide-react";
import { FiltreLogement } from "@/app/(app)/comptabilite/filtre-logement";
import { Badge, buttonClass, Card } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { aujourdhui, ajouterJours, formatJour, libelleJourCourt } from "@/lib/dates";
import { etatMenage } from "@/lib/operations";
import { createClient } from "@/lib/supabase/server";
import { lireLogementsOps, lireResponsables } from "../donnees";

export const metadata = { title: "Ménage" };

const VUES = [
  { cle: "a-traiter", libelle: "À traiter" },
  { cle: "a-controler", libelle: "À contrôler" },
  { cle: "termines", libelle: "Validés" },
] as const;

export default async function PageMenage({ searchParams }: { searchParams: Promise<{ vue?: string; logement?: string }> }) {
  const u = await exigerAcces("menage");
  const sp = await searchParams;
  const vue = VUES.some((v) => v.cle === sp.vue) ? (sp.vue as (typeof VUES)[number]["cle"]) : "a-traiter";
  const modifiable = peutModifier(u, "menage") && u.type !== "prestataire";
  const estPrestataire = u.type === "prestataire";
  const aujourd = aujourdhui();
  const supabase = await createClient();

  const [logements, responsables, { data }] = await Promise.all([
    lireLogementsOps(),
    estPrestataire ? Promise.resolve([]) : lireResponsables(),
    supabase
      .from("taches")
      .select("id, logement_id, statut, controle, echeance, responsable_id, termine_le")
      .eq("type", "menage")
      .neq("statut", "annule")
      .or(`statut.in.(a_faire,en_cours,bloque),and(statut.eq.termine,or(controle.eq.en_attente,termine_le.gte.${ajouterJours(aujourd, -60)}T00:00:00Z))`)
      .order("echeance", { ascending: true })
      .limit(400),
  ]);
  const nomLogement = new Map(logements.map((l) => [l.id, l.nom]));
  const nomResp = new Map(responsables.map((r) => [r.id, r.nom]));
  const filtre = logements.some((l) => l.id === sp.logement) ? (sp.logement as string) : "";

  const lignes = (data ?? [])
    .filter((t) => !filtre || t.logement_id === filtre)
    .map((t) => ({ ...t, etat: etatMenage(t) }));
  const classe = {
    "a-traiter": lignes.filter((t) => ["a_faire", "en_cours", "bloque", "a_refaire"].includes(t.etat.cle)),
    "a-controler": lignes.filter((t) => t.etat.cle === "a_controler"),
    termines: lignes.filter((t) => t.etat.cle === "valide").sort((a, b) => (b.echeance ?? "").localeCompare(a.echeance ?? "")),
  };
  const affichees = classe[vue];
  const lien = (v: string) => `/operations/menage?${new URLSearchParams({ vue: v, ...(filtre ? { logement: filtre } : {}) })}`;

  return (
    <div className="space-y-5">
      <div className="enter flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Vue des ménages" className="flex gap-2 overflow-x-auto">
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
              {v.libelle}
              <span className={cn("num rounded-full px-1.5 text-xs", v.cle === "a-controler" && classe["a-controler"].length ? "bg-wine-600 text-white" : "text-ink-3")}>{classe[v.cle].length}</span>
            </Link>
          ))}
        </div>
        {!estPrestataire ? (
          <FiltreLogement chemin="/operations/menage" logements={logements.map((l) => ({ id: l.id, nom: l.nom }))} valeur={filtre} autres={{ vue }} />
        ) : null}
        {modifiable ? (
          <Link href="/operations/menage/nouveau" className={buttonClass("primary", "md", "ml-auto")}>
            <Plus className="h-4 w-4" /> Nouveau ménage
          </Link>
        ) : null}
      </div>

      {affichees.length ? (
        <Card className="enter overflow-hidden" style={{ "--i": 1 } as React.CSSProperties}>
          <ul className="divide-y divide-line">
            {affichees.map((t) => {
              const enRetard = t.echeance && t.echeance < aujourd && !["valide", "a_controler"].includes(t.etat.cle);
              return (
                <li key={t.id}>
                  <Link href={`/operations/menage/${t.id}`} className="press flex min-h-[4.5rem] items-center gap-4 px-5 py-3 hover:bg-sunken/60">
                    <span className="w-14 shrink-0 text-center">
                      <span className="num block text-[0.7rem] font-medium tracking-wide text-ink-3 uppercase">{t.echeance ? libelleJourCourt(t.echeance).split(" ")[0] : ""}</span>
                      <span className={cn("num block font-display text-xl leading-none font-semibold", enRetard && "text-danger")}>{t.echeance ? Number(t.echeance.slice(8)) : "—"}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{nomLogement.get(t.logement_id ?? "") ?? "Logement"}</span>
                      <span className="mt-0.5 block truncate text-sm text-ink-2">
                        {t.echeance ? formatJour(t.echeance) : "Sans date"}
                        {enRetard ? <span className="text-danger"> · en retard</span> : null}
                        {!estPrestataire ? <span className="text-ink-3"> · {t.responsable_id ? (nomResp.get(t.responsable_id) ?? "Attribué") : "Non attribué"}</span> : null}
                      </span>
                    </span>
                    <Badge ton={t.etat.ton}>{t.etat.libelle}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <Card className="enter flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">{vue === "a-controler" ? <ClipboardCheck className="h-7 w-7" /> : <Sparkles className="h-7 w-7" />}</span>
          <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">
            {vue === "a-traiter" ? "Aucun ménage à traiter" : vue === "a-controler" ? "Aucun ménage à contrôler" : "Aucun ménage validé récemment"}
          </h2>
          <p className="mt-1 max-w-md text-ink-2 text-pretty">
            {vue === "a-traiter"
              ? "Les ménages sont créés automatiquement le jour de chaque départ du calendrier. Vous pouvez aussi en ajouter un à la main."
              : vue === "a-controler"
                ? "Quand un prestataire termine un ménage, il apparaît ici pour que vous le contrôliez."
                : "Les ménages contrôlés et validés des 60 derniers jours apparaîtront ici."}
          </p>
        </Card>
      )}
    </div>
  );
}
