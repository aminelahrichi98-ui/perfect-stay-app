import Link from "next/link";
import { Paperclip, Plus, Receipt } from "lucide-react";
import { NavMois } from "@/components/nav-mois";
import { Badge, buttonClass, Card, Notice } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { aujourdhui, formatJour, libelleMois, moisDe, moisSuivant, moisValide, premierDuMois } from "@/lib/dates";
import { formatMontant } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES_DEPENSE, libelleCategorie, lireLogementsCompta } from "../donnees";
import { FiltreLogement } from "../filtre-logement";

export const metadata = { title: "Dépenses" };

export default async function PageDepenses({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string; logement?: string; categorie?: string; cree?: string; modifie?: string; supprime?: string }>;
}) {
  const u = await exigerAcces("comptabilite");
  const sp = await searchParams;
  const courant = moisDe(aujourdhui());
  const mois = moisValide(sp.mois) ? sp.mois : courant;
  const modifiable = peutModifier(u, "comptabilite");
  const supabase = await createClient();
  const logements = await lireLogementsCompta();
  const nomDe = new Map(logements.map((l) => [l.id, l.nom]));
  const filtreLogement = logements.some((l) => l.id === sp.logement) ? (sp.logement as string) : "";
  const filtreCategorie = CATEGORIES_DEPENSE.some((c) => c.value === sp.categorie) ? (sp.categorie as string) : "";

  const { data } = await supabase
    .from("depenses")
    .select("id, date_depense, logement_id, categorie, description, montant, justificatif")
    .gte("date_depense", premierDuMois(mois))
    .lt("date_depense", premierDuMois(moisSuivant(mois)))
    .order("date_depense", { ascending: false });
  const toutes = (data ?? []).filter((d) => !filtreLogement || d.logement_id === filtreLogement);
  const affichees = toutes.filter((d) => !filtreCategorie || d.categorie === filtreCategorie);

  const parCategorie = new Map<string, number>();
  for (const d of toutes) parCategorie.set(d.categorie, Math.round(((parCategorie.get(d.categorie) ?? 0) + Number(d.montant)) * 100) / 100);
  const total = toutes.reduce((s, d) => s + Math.round(Number(d.montant) * 100), 0) / 100;

  const base = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ mois, ...(filtreLogement ? { logement: filtreLogement } : {}), ...extra });
    return `/comptabilite/depenses?${p}`;
  };

  return (
    <div className="space-y-5">
      {sp.cree || sp.modifie || sp.supprime ? <Notice ton="ok">{sp.cree ? "Dépense enregistrée." : sp.modifie ? "Dépense modifiée." : "Dépense supprimée."}</Notice> : null}

      <div className="enter flex flex-wrap items-center gap-3">
        <NavMois mois={mois} moisCourant={courant} lien={(m) => `/comptabilite/depenses?${new URLSearchParams({ mois: m, ...(filtreLogement ? { logement: filtreLogement } : {}) })}`} />
        <FiltreLogement chemin="/comptabilite/depenses" logements={logements} valeur={filtreLogement} autres={{ mois, ...(filtreCategorie ? { categorie: filtreCategorie } : {}) }} />
        {modifiable ? (
          <Link href="/comptabilite/depenses/nouveau" className={buttonClass("primary", "md", "ml-auto")}>
            <Plus className="h-4 w-4" /> Nouvelle dépense
          </Link>
        ) : null}
      </div>

      <div className="enter flex flex-wrap gap-2" style={{ "--i": 1 } as React.CSSProperties}>
        <Link
          href={base({})}
          aria-current={!filtreCategorie ? "true" : undefined}
          className={cn("press inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium", !filtreCategorie ? "border-wine-500 bg-wine-50 text-wine-800" : "border-line-strong bg-surface text-ink-2 hover:bg-sunken")}
        >
          Toutes <span className="num text-ink-3">{formatMontant(total)}</span>
        </Link>
        {CATEGORIES_DEPENSE.filter((c) => parCategorie.has(c.value)).map((c) => (
          <Link
            key={c.value}
            href={base({ categorie: c.value })}
            aria-current={filtreCategorie === c.value ? "true" : undefined}
            className={cn("press inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium", filtreCategorie === c.value ? "border-wine-500 bg-wine-50 text-wine-800" : "border-line-strong bg-surface text-ink-2 hover:bg-sunken")}
          >
            {c.label} <span className="num text-ink-3">{formatMontant(parCategorie.get(c.value) ?? 0)}</span>
          </Link>
        ))}
      </div>

      {affichees.length ? (
        <Card className="enter overflow-hidden" style={{ "--i": 2 } as React.CSSProperties}>
          <ul className="divide-y divide-line">
            {affichees.map((d) => {
              const contenu = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="num font-medium">{formatJour(d.date_depense)}</span>
                      <Badge>{libelleCategorie(d.categorie)}</Badge>
                      {d.justificatif ? (
                        <span title="Justificatif joint" className="text-ink-3">
                          <Paperclip className="h-3.5 w-3.5" />
                          <span className="sr-only">Justificatif joint</span>
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block truncate text-sm text-ink-2">
                      {d.description || "Sans description"}
                      <span className="text-ink-3"> · {d.logement_id ? (nomDe.get(d.logement_id) ?? "Logement") : "Général"}</span>
                    </span>
                  </span>
                  <span className="num shrink-0 font-display text-lg font-semibold tracking-tight">
                    {formatMontant(Number(d.montant))} <span className="text-xs font-medium text-ink-3">MAD</span>
                  </span>
                </>
              );
              return (
                <li key={d.id}>
                  {modifiable ? (
                    <Link href={`/comptabilite/depenses/${d.id}`} className="press flex min-h-[4.25rem] items-center gap-4 px-5 py-3 hover:bg-sunken/60">
                      {contenu}
                    </Link>
                  ) : (
                    <div className="flex min-h-[4.25rem] items-center gap-4 px-5 py-3">{contenu}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <Card className="enter flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">
            <Receipt className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-xl font-semibold tracking-tight capitalize">Aucune dépense en {libelleMois(mois)}</h2>
          <p className="mt-1 max-w-md text-ink-2 text-pretty">Linge, ménage, maintenance, prestataires, salaires, déplacements, marketing : saisissez vos dépenses avec leur justificatif.</p>
          {modifiable ? (
            <Link href="/comptabilite/depenses/nouveau" className={buttonClass("primary", "md", "mt-5")}>
              <Plus className="h-4 w-4" /> Saisir une dépense
            </Link>
          ) : null}
        </Card>
      )}
    </div>
  );
}
