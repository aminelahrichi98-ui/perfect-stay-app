import { Card } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { formatDateHeure } from "@/lib/format";
import { libelleType } from "@/lib/creative";
import { createClient } from "@/lib/supabase/server";
import { charger, ScriptAFaire } from "../commun";
import { LectureSeule } from "../elements";
import { chargerCreatives, chargerPerformances, chargerReglages, totauxParAnnonce } from "../donnees";
import { ImportMeta } from "./import-meta";

const jour = (d: string | null) => (d ? d.split("-").reverse().join("/") : "");

export default async function PageImport() {
  const u = await exigerAcces("marketing");
  const donnees = await charger(async () => {
    const supabase = await createClient();
    const [creatives, perf, reglages, imports] = await Promise.all([
      chargerCreatives({ avecImages: false }),
      chargerPerformances(),
      chargerReglages(),
      supabase.from("ci_imports").select("id, nom_fichier, devise, periode_debut, periode_fin, lignes_creees, lignes_mises_a_jour, lignes_refusees, erreurs, created_at").order("created_at", { ascending: false }).limit(30),
    ]);
    return { creatives, perf, reglages, imports: imports.data ?? [] };
  });
  if (!donnees) return <ScriptAFaire />;
  const modifiable = peutModifier(u, "marketing");
  const associes = new Set(donnees.creatives.map((c) => c.metaAdId).filter(Boolean));
  const nonAssociees = [...totauxParAnnonce(donnees.perf.lignes)].filter(([id]) => !associes.has(id)).map(([metaAdId, t]) => ({ metaAdId, nom: t.nom, depenses: t.depenses, leads: t.leads, debut: t.debut, fin: t.fin }));
  const libres = donnees.creatives.filter((c) => !c.metaAdId && c.statut !== "archivee").map((c) => ({ id: c.id, code: c.code, libelle: `${c.code} · ${libelleType(c.type)}` }));

  return (
    <div className="space-y-6">
      {modifiable ? null : <LectureSeule />}
      <ImportMeta devise={donnees.reglages.devise} creativesLibres={libres} nonAssociees={nonAssociees} modifiable={modifiable} />
      <Card className="p-5 md:p-6">
        <h2 className="font-display text-lg font-semibold tracking-tight">Historique des imports</h2>
        {donnees.imports.length ? (
          <ul className="mt-3 divide-y divide-line">
            {donnees.imports.map((i) => {
              const erreurs = (Array.isArray(i.erreurs) ? i.erreurs : []) as { ligne: number; message: string }[];
              return (
                <li key={i.id} className="py-3">
                  <p className="font-medium">{i.nom_fichier || "Fichier sans nom"}</p>
                  <p className="num text-[0.82rem] text-ink-3">
                    {formatDateHeure(i.created_at)} · période du {jour(i.periode_debut)} au {jour(i.periode_fin)} · {i.devise}
                  </p>
                  <p className="mt-1 text-sm text-ink-2">
                    <span className="num">{i.lignes_creees}</span> ajoutée(s), <span className="num">{i.lignes_mises_a_jour}</span> mise(s) à jour, <span className="num">{i.lignes_refusees}</span> refusée(s)
                  </p>
                  {erreurs.length ? (
                    <details className="mt-1 text-sm text-danger">
                      <summary className="cursor-pointer">Voir les lignes refusées</summary>
                      <ul className="mt-1 space-y-0.5">
                        {erreurs.slice(0, 50).map((e, k) => (
                          <li key={k}>{e.ligne ? `Ligne ${e.ligne} : ` : ""}{e.message}</li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-2">Aucun import pour l&apos;instant.</p>
        )}
      </Card>
    </div>
  );
}
