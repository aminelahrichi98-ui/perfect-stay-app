import { NavMois } from "@/components/nav-mois";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { aujourdhui, moisDe, moisSuivant, moisValide, premierDuMois } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { lireResponsables } from "../../operations/donnees";
import { Publications } from "./publications";

export const metadata = { title: "Publications" };

export default async function PagePublications({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const u = await exigerAcces("marketing");
  const sp = await searchParams;
  const courant = moisDe(aujourdhui());
  const mois = moisValide(sp.mois) ? sp.mois : courant;
  const supabase = await createClient();
  const [{ data }, equipe] = await Promise.all([
    supabase
      .from("marketing_publications")
      .select("id, date_publication, reseau, sujet, statut, notes, responsable_id")
      .gte("date_publication", premierDuMois(mois))
      .lt("date_publication", premierDuMois(moisSuivant(mois)))
      .order("date_publication"),
    lireResponsables(),
  ]);
  const noms = new Map(equipe.map((r) => [r.id, r.nom]));
  return (
    <div className="space-y-5">
      <NavMois mois={mois} moisCourant={courant} lien={(m) => `/marketing/publications?mois=${m}`} />
      <Publications
        publications={(data ?? []).map((p) => ({ id: p.id, date: p.date_publication, reseau: p.reseau, sujet: p.sujet, statut: p.statut, notes: p.notes, responsable: p.responsable_id ?? "", responsableNom: p.responsable_id ? (noms.get(p.responsable_id) ?? "") : "" }))}
        responsables={equipe.filter((r) => !r.prestataire).map((r) => ({ id: r.id, nom: r.nom }))}
        modifiable={peutModifier(u, "marketing")}
        aujourdhui={aujourdhui()}
        mois={mois}
      />
    </div>
  );
}
