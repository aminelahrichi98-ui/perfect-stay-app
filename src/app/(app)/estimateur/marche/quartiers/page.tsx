import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AjoutAlias, AjoutQuartier, BasculeQuartier, RetraitAlias } from "./formulaires";

export const metadata = { title: "Quartiers et alias" };

export default async function PageQuartiers() {
  const u = await exigerAcces("estimateur");
  const modifiable = peutModifier(u, "estimateur");
  const supabase = await createClient();
  const [{ data: quartiers }, { data: alias }, { data: segments }] = await Promise.all([
    supabase.from("marche_quartiers").select("id, ville, nom, actif").order("ville").order("nom"),
    supabase.from("marche_alias").select("id, quartier_id, alias").order("alias"),
    supabase.from("marche_segments").select("quartier_id"),
  ]);
  const nbSegments = new Map<string, number>();
  for (const s of segments ?? []) nbSegments.set(s.quartier_id, (nbSegments.get(s.quartier_id) ?? 0) + 1);
  const villes = [...new Set((quartiers ?? []).map((q) => q.ville))];

  return (
    <div className="max-w-4xl space-y-5">
      <Link href="/estimateur/marche" className="press inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Base marché
      </Link>
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight">Quartiers et alias</h2>
        <p className="mt-1 text-sm text-ink-2">
          Un alias relie une autre écriture au quartier officiel (ex. « CFC », « Casa Finance City » → Casablanca Finance City). La recherche ignore les majuscules, les accents et la ponctuation, mais ne rapproche jamais deux noms différents sans alias.
        </p>
      </div>
      {modifiable ? <AjoutQuartier villes={villes} /> : null}
      {villes.length ? (
        villes.map((ville) => (
          <Card key={ville} className="overflow-hidden">
            <h3 className="border-b border-line px-5 py-3 font-display font-semibold">{ville}</h3>
            <ul className="divide-y divide-line">
              {(quartiers ?? [])
                .filter((q) => q.ville === ville)
                .map((q) => (
                  <li key={q.id} className="space-y-2 px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{q.nom}</span>
                      <Badge>{nbSegments.get(q.id) ?? 0} segment(s)</Badge>
                      {!q.actif ? <Badge ton="attention">masqué</Badge> : null}
                      {modifiable ? <BasculeQuartier quartierId={q.id} actif={q.actif} /> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(alias ?? [])
                        .filter((a) => a.quartier_id === q.id)
                        .map((a) => (
                          <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-sunken px-2.5 py-0.5 text-xs">
                            {a.alias}
                            {u.admin ? <RetraitAlias aliasId={a.id} /> : null}
                          </span>
                        ))}
                      {modifiable ? <AjoutAlias quartierId={q.id} /> : null}
                    </div>
                  </li>
                ))}
            </ul>
          </Card>
        ))
      ) : (
        <Card className="p-6 text-sm text-ink-2">Aucun quartier. Ils sont créés ici ou lors de la validation du premier import.</Card>
      )}
    </div>
  );
}
