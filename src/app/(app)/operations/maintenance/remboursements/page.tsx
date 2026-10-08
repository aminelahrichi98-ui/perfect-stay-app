import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { aujourdhui, formatJour } from "@/lib/dates";
import { formatMontant } from "@/lib/format";
import { soldesParLogement, sommeMad } from "@/lib/operations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { lireLogementsOps } from "../../donnees";
import { BoutonRembourse } from "./bouton-rembourse";

export const metadata = { title: "Remboursements" };

export default async function PageRemboursements() {
  const u = await exigerAcces("maintenance");
  const modifiable = peutModifier(u, "maintenance");
  const supabase = await createClient();
  const [logements, { data }] = await Promise.all([
    lireLogementsOps(),
    supabase
      .from("incidents")
      .select("id, logement_id, titre, date_incident, remboursement, rembourse_le, incident_frais(montant)")
      .neq("remboursement", "sans_objet")
      .order("date_incident", { ascending: false })
      .limit(500),
  ]);
  const incidents = (data ?? []).map((i) => ({ ...i, total: sommeMad((i.incident_frais ?? []).map((f) => Number(f.montant))) })).filter((i) => i.total > 0);
  const soldes = soldesParLogement(incidents.map((i) => ({ logement_id: i.logement_id, remboursement: i.remboursement, frais: i.total })));
  const dus = soldes.filter((s) => s.aRembourser > 0).sort((a, b) => b.aRembourser - a.aRembourser);
  const totalDu = sommeMad(dus.map((s) => s.aRembourser));

  // Qui rembourse : comptes propriétaires rattachés + nom saisi dans la fiche (lecture réduite, hors droit Logements)
  const admin = createAdminClient();
  const ids = dus.map((s) => s.logementId);
  const [{ data: liens }, { data: fiches }] = ids.length
    ? await Promise.all([
        admin.from("logement_proprietaires").select("logement_id, profiles(prenom, nom)").in("logement_id", ids),
        admin.from("logements").select("id, proprietaire_nom").in("id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const proprietaires = (logementId: string) => {
    const comptes = (liens ?? [])
      .filter((l) => l.logement_id === logementId)
      .map((l) => {
        const p = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles;
        return p ? `${p.prenom} ${p.nom}`.trim() : "";
      })
      .filter(Boolean);
    const saisi = fiches?.find((f) => f.id === logementId)?.proprietaire_nom;
    return comptes.length ? comptes.join(", ") : saisi || "Propriétaire non renseigné";
  };
  const nomLogement = new Map(logements.map((l) => [l.id, l.nom]));
  const rembourses = incidents.filter((i) => i.remboursement === "rembourse").slice(0, 15);

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/operations/maintenance" className="press inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Maintenance
      </Link>

      <Card className="enter p-5">
        <p className="text-sm text-ink-2">Frais de maintenance avancés par Perfect Stay, à récupérer auprès des propriétaires</p>
        <p className="num mt-1 font-display text-4xl font-semibold tracking-tight">
          {formatMontant(totalDu)} <span className="text-base font-medium text-ink-3">MAD</span>
        </p>
        <p className="mt-1 text-sm text-ink-3">
          {dus.length ? `${dus.length} logement${dus.length > 1 ? "s" : ""} concerné${dus.length > 1 ? "s" : ""}` : "Rien à récupérer pour le moment."}
        </p>
      </Card>

      {dus.map((s, i) => {
        const siens = incidents.filter((x) => x.logement_id === s.logementId && x.remboursement === "a_rembourser");
        return (
          <Card key={s.logementId} className="enter overflow-hidden" style={{ "--i": i + 1 } as React.CSSProperties}>
            <div className="flex flex-wrap items-start justify-between gap-3 p-5">
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight">{nomLogement.get(s.logementId) ?? "Logement"}</h2>
                <p className="text-sm text-ink-2">À rembourser par : {proprietaires(s.logementId)}</p>
              </div>
              <p className="num text-right font-display text-2xl font-semibold tracking-tight">
                {formatMontant(s.aRembourser)} <span className="text-sm font-medium text-ink-3">MAD</span>
              </p>
            </div>
            <ul className="divide-y divide-line border-t border-line">
              {siens.map((x) => (
                <li key={x.id}>
                  <Link href={`/operations/maintenance/${x.id}`} className="press flex items-center gap-3 px-5 py-3 hover:bg-sunken/60">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{x.titre}</span>
                      <span className="num block text-sm text-ink-3">{formatJour(x.date_incident)}</span>
                    </span>
                    <span className="num font-medium">{formatMontant(x.total)} MAD</span>
                  </Link>
                </li>
              ))}
            </ul>
            {modifiable ? (
              <div className="border-t border-line bg-sunken/40 p-4">
                <BoutonRembourse logementId={s.logementId} aujourdhui={aujourdhui()} total={s.aRembourser} />
              </div>
            ) : null}
          </Card>
        );
      })}

      {rembourses.length ? (
        <section aria-labelledby="deja" className="space-y-3">
          <h2 id="deja" className="font-display text-lg font-semibold tracking-tight">
            Déjà remboursés
          </h2>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {rembourses.map((x) => (
                <li key={x.id}>
                  <Link href={`/operations/maintenance/${x.id}`} className="press flex items-center gap-3 px-5 py-3 hover:bg-sunken/60">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{x.titre}</span>
                      <span className="block truncate text-sm text-ink-3">
                        {nomLogement.get(x.logement_id) ?? "Logement"}
                        {x.rembourse_le ? <span className="num"> · remboursé le {formatJour(x.rembourse_le)}</span> : null}
                      </span>
                    </span>
                    <span className="num text-ink-2">{formatMontant(x.total)} MAD</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Badge>Les frais remboursés sont conservés pour la comptabilité.</Badge>
        </section>
      ) : null}
    </div>
  );
}
