import Link from "next/link";
import { ArrowLeft, Repeat } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { aujourdhui, ajouterJours, formatJour } from "@/lib/dates";
import { libelleRegle, occurrences, type Regle } from "@/lib/recurrence";
import { createClient } from "@/lib/supabase/server";
import { lireLogementsOps, lireResponsables } from "../../operations/donnees";
import { ListeRecurrences } from "./liste-recurrences";

export const metadata = { title: "Tâches récurrentes" };

export default async function PageRecurrentes() {
  const u = await exigerAcces("taches");
  const supabase = await createClient();
  const [{ data }, logements, responsables] = await Promise.all([
    supabase.from("tache_recurrences").select("*").order("titre"),
    lireLogementsOps(),
    lireResponsables(),
  ]);
  const aujourd = aujourdhui();
  const regles = (data ?? []).map((r) => ({
    id: r.id,
    titre: r.titre,
    pole: r.pole,
    priorite: r.priorite,
    responsable: r.responsable_id ?? "",
    logement: r.logement_id ?? "",
    notes: r.notes,
    frequence: r.frequence,
    jourSemaine: r.jour_semaine === null ? "0" : String(r.jour_semaine),
    jourMois: r.jour_mois === null ? "1" : String(r.jour_mois),
    actif: r.actif,
    libelle: libelleRegle(r as Regle),
    prochaine: occurrences(r as Regle, aujourd, ajouterJours(aujourd, 400))[0] ?? null,
  }));
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/taches" className="press inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Tâches
      </Link>
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight">Tâches récurrentes</h2>
        <p className="mt-1 text-ink-2 text-pretty">Une règle crée automatiquement une tâche à chaque échéance, 14 jours à l&apos;avance. Modifier ou arrêter une règle ne touche pas aux tâches déjà créées.</p>
      </div>
      <ListeRecurrences
        regles={regles.map((r) => ({ ...r, prochaine: r.prochaine ? formatJour(r.prochaine) : null }))}
        logements={logements.map((l) => ({ id: l.id, nom: l.nom }))}
        responsables={responsables}
        modifiable={peutModifier(u, "taches")}
      />
      {!regles.length ? (
        <Card className="flex flex-col items-center px-6 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-wine-50 text-wine-600">
            <Repeat className="h-6 w-6" />
          </span>
          <Badge ton="marque" className="mt-4">
            Aucune règle
          </Badge>
        </Card>
      ) : null}
    </div>
  );
}
