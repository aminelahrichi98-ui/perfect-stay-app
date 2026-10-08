import { cookies } from "next/headers";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ClipboardPaste, ListChecks, Plus, Repeat } from "lucide-react";
import { buttonClass, Card, Notice, PageHeader } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { aujourdhui, ajouterJours, formatJour } from "@/lib/dates";
import { POLES } from "@/lib/modules";
import { COOKIE_VUE_TACHES, lundiDe, type VueTaches } from "@/lib/taches";
import { lireLogementsOps, lireResponsables } from "../operations/donnees";
import { BarreTaches } from "./barre-taches";
import type { CarteData } from "./carte-tache";
import { lireTachesFiltrees } from "./donnees";
import { genererRecurrences } from "./generation";
import { Kanban } from "./kanban";
import { VueSemaine } from "./vue-semaine";

export const metadata = { title: "Tâches" };

type Params = { vue?: string; pole?: string; responsable?: string; logement?: string; semaine?: string; supprime?: string };

export default async function PageTaches({ searchParams }: { searchParams: Promise<Params> }) {
  const u = await exigerAcces("taches");
  const sp = await searchParams;
  const memorisee = (await cookies()).get(COOKIE_VUE_TACHES)?.value;
  const vue: VueTaches = sp.vue === "kanban" || sp.vue === "semaine" ? sp.vue : memorisee === "kanban" ? "kanban" : "semaine";
  const modifiable = peutModifier(u, "taches");
  const aujourd = aujourdhui();
  const lundi = lundiDe(sp.semaine && /^\d{4}-\d{2}-\d{2}$/.test(sp.semaine) ? sp.semaine : aujourd);

  // Les tâches récurrentes des 14 prochains jours sont créées à l'ouverture (sans doublon)
  if (modifiable) await genererRecurrences(aujourd).catch(() => 0);

  const [logements, responsables] = await Promise.all([lireLogementsOps(), lireResponsables()]);
  const filtres = {
    pole: (POLES as readonly string[]).includes(sp.pole ?? "") ? (sp.pole as string) : "",
    responsable: sp.responsable === "moi" || sp.responsable === "aucun" || responsables.some((r) => r.id === sp.responsable) ? (sp.responsable as string) : "",
    logement: logements.some((l) => l.id === sp.logement) ? (sp.logement as string) : "",
  };
  const taches = await lireTachesFiltrees(filtres, u.id);
  const nomLogement = new Map(logements.map((l) => [l.id, l.nom]));
  const nomResp = new Map(responsables.map((r) => [r.id, r.nom]));
  const cartes: CarteData[] = taches.map((t) => ({
    id: t.id,
    titre: t.titre,
    type: t.type,
    pole: t.pole,
    priorite: t.priorite,
    statut: t.statut,
    echeance: t.echeance,
    logementNom: t.logement_id ? (nomLogement.get(t.logement_id) ?? null) : null,
    responsableNom: t.responsable_id ? (nomResp.get(t.responsable_id) ?? null) : null,
    recurrente: Boolean(t.recurrence_id),
    sousFaites: t.sousFaites,
    sousTotal: t.sousTotal,
    nbPieces: t.nbPieces,
  }));
  const ouvertes = cartes.filter((t) => t.statut !== "termine").length;
  const filtresUrl = [filtres.pole && `&pole=${encodeURIComponent(filtres.pole)}`, filtres.logement && `&logement=${filtres.logement}`].filter(Boolean).join("");
  const semaineUrl = (l: string) => `/taches?${new URLSearchParams({ vue: "semaine", semaine: l, ...Object.fromEntries(Object.entries(filtres).filter(([, v]) => v)) })}`;

  return (
    <>
      <PageHeader
        titre="Tâches"
        description={`${ouvertes} tâche${ouvertes > 1 ? "s" : ""} ouverte${ouvertes > 1 ? "s" : ""}${filtres.pole || filtres.responsable || filtres.logement ? " avec ces filtres" : ""}.`}
        action={
          modifiable ? (
            <div className="flex flex-wrap gap-2">
              <Link href="/taches/recurrentes" className={buttonClass("secondary", "md")}>
                <Repeat className="h-4 w-4" /> Récurrentes
              </Link>
              <Link href="/taches/importer" className={buttonClass("secondary", "md")}>
                <ClipboardPaste className="h-4 w-4" /> Coller une liste
              </Link>
              <Link href={`/taches/nouvelle?${filtresUrl.replace(/^&/, "")}`} className={buttonClass("primary", "md")}>
                <Plus className="h-4 w-4" /> Nouvelle tâche
              </Link>
            </div>
          ) : undefined
        }
      />
      {sp.supprime ? (
        <div className="mb-4">
          <Notice ton="ok">Tâche supprimée.</Notice>
        </div>
      ) : null}

      <div className="mb-5 space-y-3">
        <BarreTaches vue={vue} pole={filtres.pole} responsable={filtres.responsable} logement={filtres.logement} poles={POLES} responsables={responsables.map((r) => ({ id: r.id, nom: r.nom }))} logements={logements.map((l) => ({ id: l.id, nom: l.nom }))} semaine={sp.semaine ? lundi : ""} />
        {vue === "semaine" ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={semaineUrl(ajouterJours(lundi, -7))} aria-label="Semaine précédente" className="press grid h-11 w-11 place-items-center rounded-xl border border-line-strong bg-surface shadow-card hover:bg-sunken">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <h2 className="min-w-[13rem] text-center font-display text-lg font-semibold tracking-tight" aria-live="polite">
              <span className="num">{formatJour(lundi).slice(0, 5)}</span> – <span className="num">{formatJour(ajouterJours(lundi, 6)).slice(0, 5)}</span>
            </h2>
            <Link href={semaineUrl(ajouterJours(lundi, 7))} aria-label="Semaine suivante" className="press grid h-11 w-11 place-items-center rounded-xl border border-line-strong bg-surface shadow-card hover:bg-sunken">
              <ChevronRight className="h-5 w-5" />
            </Link>
            {lundi !== lundiDe(aujourd) ? (
              <Link href={semaineUrl(lundiDe(aujourd))} className="press ml-1 inline-flex h-9 items-center rounded-xl px-3.5 text-sm font-medium text-ink-2 hover:bg-sunken hover:text-ink">
                Cette semaine
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {!cartes.length && !(vue === "semaine") ? (
        <Card className="enter flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">
            <ListChecks className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">Aucune tâche</h2>
          <p className="mt-1 max-w-md text-ink-2 text-pretty">Créez une tâche, ou collez une liste d&apos;actions : l&apos;app crée une tâche par ligne.</p>
        </Card>
      ) : vue === "kanban" ? (
        <Kanban taches={cartes} aujourdhui={aujourd} peutModifier={modifiable} filtresUrl={filtresUrl} />
      ) : (
        <VueSemaine taches={cartes} lundi={lundi} aujourdhui={aujourd} peutModifier={modifiable} filtresUrl={filtresUrl} />
      )}
    </>
  );
}
