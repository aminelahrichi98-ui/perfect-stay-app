import { NavMois } from "@/components/nav-mois";
import { Card } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { aujourdhui, moisDe, moisPrecedent, moisSuivant, moisValide, premierDuMois } from "@/lib/dates";
import { formatMontant } from "@/lib/format";
import { coutParLead } from "@/lib/marketing";
import { sommeMad } from "@/lib/operations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DepensesPub } from "./depenses-pub";

export const metadata = { title: "Marketing" };

export default async function PageMarketing({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const u = await exigerAcces("marketing");
  const sp = await searchParams;
  const courant = moisDe(aujourdhui());
  const mois = moisValide(sp.mois) ? sp.mois : courant;
  const precedent = moisPrecedent(mois);
  const supabase = await createClient();
  const debut = premierDuMois(mois);
  const fin = premierDuMois(moisSuivant(mois));

  // Le coût par lead s'appuie sur le nombre de leads du CRM : seul ce total est lu, jamais les fiches
  const admin = createAdminClient();
  const [{ data: depenses }, { data: precedentes }, leads, leadsMeta] = await Promise.all([
    supabase.from("marketing_depenses").select("id, date_depense, canal, campagne, montant, note").gte("date_depense", debut).lt("date_depense", fin).order("date_depense", { ascending: false }),
    supabase.from("marketing_depenses").select("montant").gte("date_depense", premierDuMois(precedent)).lt("date_depense", debut),
    admin.from("crm_leads").select("id", { count: "exact", head: true }).gte("created_at", `${debut}T00:00:00Z`).lt("created_at", `${fin}T00:00:00Z`),
    admin.from("crm_leads").select("id", { count: "exact", head: true }).eq("source", "meta").gte("created_at", `${debut}T00:00:00Z`).lt("created_at", `${fin}T00:00:00Z`),
  ]);
  const liste = (depenses ?? []).map((d) => ({ id: d.id, date: d.date_depense, canal: d.canal, campagne: d.campagne, montant: Number(d.montant), note: d.note }));
  const total = sommeMad(liste.map((d) => d.montant));
  const totalMeta = sommeMad(liste.filter((d) => d.canal === "meta").map((d) => d.montant));
  const totalPrecedent = sommeMad((precedentes ?? []).map((d) => Number(d.montant)));
  const cpl = coutParLead(total, leads.count ?? 0);
  const cplMeta = coutParLead(totalMeta, leadsMeta.count ?? 0);

  const cartes = [
    { titre: "Budget dépensé", valeur: `${formatMontant(total)} MAD`, note: totalPrecedent ? `mois précédent : ${formatMontant(totalPrecedent)} MAD` : "ce mois" },
    { titre: "Leads reçus", valeur: String(leads.count ?? 0), note: `dont ${leadsMeta.count ?? 0} via Meta` },
    { titre: "Coût par lead", valeur: cpl === null ? "—" : `${formatMontant(cpl)} MAD`, note: "toutes dépenses ÷ tous les leads" },
    { titre: "Coût par lead Meta", valeur: cplMeta === null ? "—" : `${formatMontant(cplMeta)} MAD`, note: "dépenses Meta ÷ leads Meta" },
  ];

  return (
    <div className="space-y-5">
      <NavMois mois={mois} moisCourant={courant} lien={(m) => `/marketing?mois=${m}`} />
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cartes.map((c, i) => (
          <li key={c.titre} className="enter" style={{ "--i": i } as React.CSSProperties}>
            <Card className="h-full p-4">
              <p className="text-sm text-ink-2">{c.titre}</p>
              <p className="num mt-1 font-display text-2xl leading-tight font-semibold tracking-tight">{c.valeur}</p>
              <p className="mt-1 text-[0.78rem] text-ink-3 text-pretty">{c.note}</p>
            </Card>
          </li>
        ))}
      </ul>
      <DepensesPub depenses={liste} modifiable={peutModifier(u, "marketing")} aujourdhui={aujourdhui()} mois={mois} />
    </div>
  );
}
