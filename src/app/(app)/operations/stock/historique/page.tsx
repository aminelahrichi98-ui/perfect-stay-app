import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { formatJour } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { lireLogementsOps } from "../../donnees";

export const metadata = { title: "Historique du stock" };

const TYPES: Record<string, string> = { entree: "Entrée", sortie: "Sortie", transfert: "Transfert", inventaire: "Inventaire" };

export default async function PageHistoriqueStock() {
  await exigerAcces("stock");
  const supabase = await createClient();
  const [logements, { data }] = await Promise.all([
    lireLogementsOps(),
    supabase.from("stock_mouvements").select("id, type, quantite, note, date_mouvement, logement_id, created_at, stock_articles(nom, unite)").order("created_at", { ascending: false }).limit(200),
  ]);
  const nomLogement = new Map(logements.map((l) => [l.id, l.nom]));
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/operations/stock" className="press inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Stock
      </Link>
      <Card className="overflow-hidden">
        {data?.length ? (
          <ul className="divide-y divide-line">
            {data.map((m) => {
              const a = Array.isArray(m.stock_articles) ? m.stock_articles[0] : m.stock_articles;
              return (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a?.nom ?? "Article"}</span>
                    <span className="block truncate text-sm text-ink-2">
                      <span className="num">{formatJour(m.date_mouvement)}</span> · {m.logement_id ? (nomLogement.get(m.logement_id) ?? "Logement") : "Réserve"}
                      {m.note ? ` · ${m.note}` : ""}
                    </span>
                  </span>
                  <Badge>{TYPES[m.type] ?? m.type}</Badge>
                  <span className={`num w-16 shrink-0 text-right font-medium ${m.quantite < 0 ? "text-danger" : "text-ok"}`}>{m.quantite > 0 ? `+${m.quantite}` : m.quantite}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-6 py-12 text-center text-ink-2">Aucun mouvement enregistré pour le moment.</p>
        )}
      </Card>
      <p className="text-sm text-ink-3 text-pretty">L&apos;historique ne peut être ni modifié ni effacé. Pour corriger une erreur, faites un inventaire.</p>
    </div>
  );
}
