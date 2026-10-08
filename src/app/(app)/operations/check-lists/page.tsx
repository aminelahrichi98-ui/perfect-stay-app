import Link from "next/link";
import { ClipboardCheck, Plus } from "lucide-react";
import { Badge, buttonClass, Card } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { formatDateHeure } from "@/lib/format";
import { libelleType, progression, TYPES_MODELE } from "@/lib/operations";
import { createClient } from "@/lib/supabase/server";
import { lireLogementsOps } from "../donnees";
import { FormulaireLancer } from "./formulaire-lancer";

export const metadata = { title: "Check-lists" };

export default async function PageCheckLists() {
  const u = await exigerAcces("checklists");
  const gere = peutModifier(u, "checklists") && u.type !== "prestataire";
  const supabase = await createClient();
  const [{ data: recentes }, { data: modeles }, logements] = await Promise.all([
    supabase.from("checklists").select("id, nom, statut, logement_id, tache_id, created_at, termine_le, checklist_points(fait)").order("created_at", { ascending: false }).limit(30),
    gere ? supabase.from("checklist_modeles").select("id, nom, type, actif, checklist_modele_points(id)").order("nom") : Promise.resolve({ data: [] }),
    lireLogementsOps(),
  ]);
  const nomLogement = new Map(logements.map((l) => [l.id, l.nom]));
  const actifs = (modeles ?? []).filter((m) => m.actif);

  return (
    <div className="space-y-8">
      {gere ? (
        <section aria-labelledby="lancer" className="space-y-3">
          <h2 id="lancer" className="font-display text-lg font-semibold tracking-tight">
            Lancer une check-list
          </h2>
          <Card className="p-5">
            <FormulaireLancer modeles={actifs.map((m) => ({ id: m.id, nom: m.nom }))} logements={logements.map((l) => ({ id: l.id, nom: l.nom }))} />
          </Card>
        </section>
      ) : null}

      <section aria-labelledby="recentes" className="space-y-3">
        <h2 id="recentes" className="font-display text-lg font-semibold tracking-tight">
          Check-lists récentes
        </h2>
        {recentes?.length ? (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {recentes.map((c) => {
                const total = c.checklist_points?.length ?? 0;
                const faits = c.checklist_points?.filter((p) => p.fait).length ?? 0;
                return (
                  <li key={c.id}>
                    <Link href={c.tache_id ? `/operations/menage/${c.tache_id}` : `/operations/check-lists/${c.id}`} className="press flex min-h-[4.25rem] items-center gap-4 px-5 py-3 hover:bg-sunken/60">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {c.nom} <span className="text-ink-3">· {nomLogement.get(c.logement_id ?? "") ?? "Logement"}</span>
                        </span>
                        <span className="num mt-0.5 block text-sm text-ink-2">
                          {formatDateHeure(c.termine_le ?? c.created_at)} · {faits}/{total} points ({progression(faits, total)} %)
                        </span>
                      </span>
                      <Badge ton={c.statut === "terminee" ? "ok" : "attention"}>{c.statut === "terminee" ? "Terminée" : "En cours"}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : (
          <Card className="flex flex-col items-center px-6 py-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">
              <ClipboardCheck className="h-7 w-7" />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">Aucune check-list pour le moment</h3>
            <p className="mt-1 max-w-md text-ink-2 text-pretty">Celles des ménages se créent toutes seules. Vous pouvez aussi en lancer une pour un contrôle qualité ou un check-in.</p>
          </Card>
        )}
      </section>

      {gere ? (
        <section aria-labelledby="modeles" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="modeles" className="font-display text-lg font-semibold tracking-tight">
              Modèles
            </h2>
            <Link href="/operations/check-lists/modeles/nouveau" className={buttonClass("secondary", "sm")}>
              <Plus className="h-4 w-4" /> Nouveau modèle
            </Link>
          </div>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {(modeles ?? []).map((m) => (
                <li key={m.id}>
                  <Link href={`/operations/check-lists/modeles/${m.id}`} className="press flex min-h-[3.75rem] items-center gap-4 px-5 py-3 hover:bg-sunken/60">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{m.nom}</span>
                      <span className="mt-0.5 block text-sm text-ink-2">
                        {libelleType(TYPES_MODELE, m.type)} · {m.checklist_modele_points?.length ?? 0} points
                      </span>
                    </span>
                    {m.actif ? <Badge ton="ok">Actif</Badge> : <Badge>Désactivé</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
