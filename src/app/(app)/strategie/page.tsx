import { Card, PageHeader } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { aujourdhui, moisDe, moisSuivant, premierDuMois } from "@/lib/dates";
import { POLES } from "@/lib/modules";
import { progression } from "@/lib/operations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { lireResponsables } from "../operations/donnees";
import { Journal } from "./journal";

export const metadata = { title: "Stratégie entreprise" };

export default async function PageStrategie() {
  const u = await exigerAcces("strategie");
  const auj = aujourdhui();
  const debutMois = `${premierDuMois(moisDe(auj))}T00:00:00Z`;
  const finMois = `${premierDuMois(moisSuivant(moisDe(auj)))}T00:00:00Z`;
  const supabase = await createClient();

  // Avancement par pôle : seuls des totaux sont lus (le droit Stratégie suffit, sans ouvrir le module Tâches)
  const admin = createAdminClient();
  const [{ data: ouvertes }, { data: terminees }, { data: notes }, equipe] = await Promise.all([
    admin.from("taches").select("pole, echeance").not("statut", "in", "(termine,annule)"),
    admin.from("taches").select("pole").eq("statut", "termine").gte("termine_le", debutMois).lt("termine_le", finMois),
    supabase.from("strategie_notes").select("id, type, titre, date_note, contenu, pole, auteur_id").order("date_note", { ascending: false }).order("created_at", { ascending: false }).limit(200),
    lireResponsables(),
  ]);
  const noms = new Map(equipe.map((r) => [r.id, r.nom]));
  const poles = POLES.map((p) => {
    const o = (ouvertes ?? []).filter((t) => t.pole === p);
    return { pole: p, ouvertes: o.length, retard: o.filter((t) => t.echeance && t.echeance < auj).length, terminees: (terminees ?? []).filter((t) => t.pole === p).length };
  }).filter((p) => p.ouvertes || p.terminees);

  return (
    <>
      <PageHeader titre="Stratégie entreprise" description="L'avancement des tâches par pôle et le journal des décisions." />

      <section aria-labelledby="avancement" className="mb-8 space-y-3">
        <h2 id="avancement" className="font-display text-lg font-semibold tracking-tight">
          Avancement par pôle
        </h2>
        {poles.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {poles.map((p, i) => {
              const total = p.ouvertes + p.terminees;
              return (
                <li key={p.pole} className="enter" style={{ "--i": i } as React.CSSProperties}>
                  <Card className="h-full p-4">
                    <h3 className="font-medium">{p.pole}</h3>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunken" role="img" aria-label={`${progression(p.terminees, total)} % des tâches de ${p.pole} sont terminées ce mois`}>
                      <div className="h-full rounded-full bg-ok" style={{ width: `${progression(p.terminees, total)}%` }} />
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <dd className="num font-display text-xl font-semibold">{p.ouvertes}</dd>
                        <dt className="text-xs text-ink-3">ouvertes</dt>
                      </div>
                      <div>
                        <dd className={`num font-display text-xl font-semibold ${p.retard ? "text-danger" : ""}`}>{p.retard}</dd>
                        <dt className="text-xs text-ink-3">en retard</dt>
                      </div>
                      <div>
                        <dd className="num font-display text-xl font-semibold text-ok">{p.terminees}</dd>
                        <dt className="text-xs text-ink-3">terminées ce mois</dt>
                      </div>
                    </dl>
                  </Card>
                </li>
              );
            })}
          </ul>
        ) : (
          <Card className="p-5 text-ink-2">Aucune tâche pour le moment : l&apos;avancement apparaîtra ici dès que des tâches seront créées dans le module Tâches.</Card>
        )}
      </section>

      <section aria-labelledby="journal" className="space-y-3">
        <h2 id="journal" className="font-display text-lg font-semibold tracking-tight">
          Journal des décisions
        </h2>
        <Journal
          notes={(notes ?? []).map((n) => ({ id: n.id, type: n.type, titre: n.titre, date: n.date_note, contenu: n.contenu, pole: n.pole, auteur: n.auteur_id ? (noms.get(n.auteur_id) ?? "") : "" }))}
          modifiable={peutModifier(u, "strategie")}
          aujourdhui={auj}
        />
      </section>
    </>
  );
}
