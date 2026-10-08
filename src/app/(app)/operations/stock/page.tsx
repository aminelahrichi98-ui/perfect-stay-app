import Link from "next/link";
import { History, PackageOpen } from "lucide-react";
import { Card, buttonClass } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { aujourdhui } from "@/lib/dates";
import { alerteStock } from "@/lib/operations";
import { createClient } from "@/lib/supabase/server";
import { lireLogementsOps } from "../donnees";
import { TableauStock } from "./tableau-stock";

export const metadata = { title: "Stock" };

export default async function PageStock() {
  const u = await exigerAcces("stock");
  const supabase = await createClient();
  const [logements, { data: articles }, { data: niveaux }] = await Promise.all([
    lireLogementsOps(),
    supabase.from("stock_articles").select("id, nom, categorie, unite, seuil_alerte, actif").order("categorie").order("nom"),
    supabase.from("stock_niveaux").select("article_id, logement_id, quantite"),
  ]);
  const nomLogement = new Map(logements.map((l) => [l.id, l.nom]));
  const lignes = (articles ?? []).map((a) => {
    const siens = (niveaux ?? []).filter((n) => n.article_id === a.id && n.quantite !== 0);
    const reserve = siens.find((n) => n.logement_id === null)?.quantite ?? 0;
    const chezLesLogements = siens.filter((n) => n.logement_id !== null).map((n) => ({ logement: nomLogement.get(n.logement_id ?? "") ?? "Logement", quantite: n.quantite }));
    const total = reserve + chezLesLogements.reduce((s, n) => s + n.quantite, 0);
    return {
      id: a.id,
      nom: a.nom,
      categorie: a.categorie,
      unite: a.unite,
      seuil: a.seuil_alerte,
      actif: a.actif,
      reserve,
      chezLesLogements,
      total,
      alerte: alerteStock(total, a.seuil_alerte),
    };
  });
  const enAlerte = lignes.filter((l) => l.actif && l.alerte !== "ok");

  return (
    <div className="space-y-5">
      <div className="enter flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-2">{enAlerte.length ? <strong className="text-warn">{enAlerte.length} article{enAlerte.length > 1 ? "s" : ""} à réapprovisionner</strong> : "Tous les stocks sont au-dessus de leur seuil d'alerte."}</p>
        <Link href="/operations/stock/historique" className={buttonClass("secondary", "md")}>
          <History className="h-4 w-4" /> Historique
        </Link>
      </div>
      {lignes.length ? (
        <TableauStock lignes={lignes} logements={logements.map((l) => ({ id: l.id, nom: l.nom }))} modifiable={peutModifier(u, "stock")} aujourdhui={aujourdhui()} />
      ) : (
        <Card className="enter flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">
            <PackageOpen className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">Aucun article en stock</h2>
          <p className="mt-1 max-w-md text-ink-2 text-pretty">Ajoutez le linge, les produits d&apos;accueil et les consommables que vous suivez.</p>
        </Card>
      )}
    </div>
  );
}
