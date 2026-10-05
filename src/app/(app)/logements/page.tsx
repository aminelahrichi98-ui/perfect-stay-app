import Link from "next/link";
import { Home, Plus, Search } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { Badge, buttonClass, Card, Notice, PageHeader } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { formatMad } from "@/lib/format";
import { elementsACompleter, libelleStatut, libelleType, STATUTS_LOGEMENT } from "@/lib/logements";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_PHOTOS, urlsLecture } from "@/lib/stockage";

export const metadata = { title: "Logements" };

export default async function PageLogements({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; q?: string; supprime?: string }>;
}) {
  const u = await exigerAcces("logements");
  const { statut, q, supprime } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("logements")
    .select(
      "id, nom, type, ville, adresse, proprietaire_nom, statut, frais_menage, taux_commission, capacite, logement_photos(chemin_vignette, ordre), logement_ical(id), logement_proprietaires(user_id)",
    )
    .order("nom");

  const tous = data ?? [];
  const recherche = (q ?? "").trim().toLowerCase();
  const filtres = tous.filter(
    (l) =>
      (!statut || l.statut === statut) &&
      (!recherche || `${l.nom} ${l.ville}`.toLowerCase().includes(recherche)),
  );

  const couvertures = filtres.map((l) => [...(l.logement_photos ?? [])].sort((a, b) => a.ordre - b.ordre)[0]?.chemin_vignette).filter(Boolean) as string[];
  const urls = await urlsLecture(BUCKET_PHOTOS, couvertures);
  const modifiable = peutModifier(u, "logements");
  const compte = (s: string) => tous.filter((l) => l.statut === s).length;

  const chip = (valeur: string | undefined, label: string, nombre: number) => {
    const actif = (statut ?? "") === (valeur ?? "");
    const params = new URLSearchParams();
    if (valeur) params.set("statut", valeur);
    if (q) params.set("q", q);
    return (
      <Link
        key={label}
        href={`/logements${params.size ? `?${params}` : ""}`}
        aria-current={actif ? "true" : undefined}
        className={cn(
          "press inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium",
          actif ? "border-wine-500 bg-wine-50 text-wine-800" : "border-line-strong bg-surface text-ink-2 hover:bg-sunken",
        )}
      >
        {label}
        <span className="num text-ink-3">{nombre}</span>
      </Link>
    );
  };

  return (
    <>
      <PageHeader
        titre="Logements"
        description={`${tous.length} logement${tous.length > 1 ? "s" : ""} · fiches, accès, documents et tarifs.`}
        action={
          modifiable ? (
            <Link href="/logements/nouveau" className={buttonClass("primary")}>
              <Plus className="h-4 w-4" /> Nouveau logement
            </Link>
          ) : null
        }
      />

      {supprime ? (
        <div className="mb-4">
          <Notice ton="ok">Le logement a été supprimé.</Notice>
        </div>
      ) : null}

      {tous.length > 0 ? (
        <div className="enter mb-6 space-y-3" style={{ "--i": 1 } as React.CSSProperties}>
          <form action="/logements" className="relative">
            {statut ? <input type="hidden" name="statut" value={statut} /> : null}
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              name="q"
              defaultValue={q}
              type="search"
              placeholder="Rechercher un logement ou une ville"
              aria-label="Rechercher un logement"
              className="block h-11 w-full rounded-xl border border-line-strong bg-surface pr-4 pl-10 shadow-card focus:border-wine-500 focus:ring-4 focus:ring-wine-500/15 focus:outline-none"
            />
          </form>
          <div className="flex flex-wrap gap-2">
            {chip(undefined, "Tous", tous.length)}
            {STATUTS_LOGEMENT.map((s) => chip(s.value, s.label, compte(s.value)))}
          </div>
        </div>
      ) : null}

      {filtres.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtres.map((l, i) => {
            const cover = [...(l.logement_photos ?? [])].sort((a, b) => a.ordre - b.ordre)[0]?.chemin_vignette;
            const url = cover ? urls.get(cover) : undefined;
            const st = libelleStatut(l.statut);
            const manque = elementsACompleter({
              ville: l.ville,
              adresse: l.adresse,
              proprietaires: l.logement_proprietaires?.length ?? 0,
              proprietaire_nom: l.proprietaire_nom,
              nbIcal: l.logement_ical?.length ?? 0,
              nbPhotos: l.logement_photos?.length ?? 0,
            });
            return (
              <li key={l.id} className="enter" style={{ "--i": Math.min(i + 1, 8) } as React.CSSProperties}>
                <Link href={`/logements/${l.id}`} className="press group block h-full">
                  <Card className="h-full overflow-hidden transition-[border-color,box-shadow] duration-150 group-hover:border-line-strong group-hover:shadow-pop">
                    <div className="relative aspect-[16/9] bg-aub-900">
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-[1.03]" />
                      ) : (
                        <div className="grid h-full place-items-center">
                          <LogoMark className="h-14 w-auto text-aub-800" />
                        </div>
                      )}
                      {st ? (
                        <Badge ton={st.ton} className="absolute top-3 left-3 shadow-card">
                          {st.label}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="space-y-1 p-4">
                      <h2 className="truncate font-display text-lg font-semibold tracking-tight">{l.nom}</h2>
                      <p className="truncate text-sm text-ink-2">
                        {libelleType(l.type)}
                        {l.ville ? ` · ${l.ville}` : ""}
                        {l.capacite ? ` · ${l.capacite} voyageur${l.capacite > 1 ? "s" : ""}` : ""}
                      </p>
                      <p className="num pt-1 text-[0.82rem] text-ink-3">
                        Ménage {formatMad(Number(l.frais_menage))} · Commission {String(Number(l.taux_commission)).replace(".", ",")} %
                      </p>
                      {manque.length ? (
                        <p className="pt-1">
                          <Badge ton="attention">À compléter : {manque.length} information{manque.length > 1 ? "s" : ""}</Badge>
                        </p>
                      ) : null}
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card className="enter flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">
            <Home className="h-7 w-7" />
          </span>
          {tous.length ? (
            <>
              <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">Aucun résultat</h2>
              <p className="mt-1 max-w-sm text-ink-2 text-pretty">Aucun logement ne correspond à cette recherche.</p>
              <Link href="/logements" className={buttonClass("secondary", "md", "mt-5")}>
                Voir tous les logements
              </Link>
            </>
          ) : (
            <>
              <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">Aucun logement pour le moment</h2>
              <p className="mt-1 max-w-md text-ink-2 text-pretty">
                Créez votre premier logement, ou reprenez d&apos;un coup ceux de l&apos;ancienne application depuis Paramètres, onglet « Import ».
              </p>
              {modifiable ? (
                <Link href="/logements/nouveau" className={buttonClass("primary", "md", "mt-5")}>
                  <Plus className="h-4 w-4" /> Créer un logement
                </Link>
              ) : null}
            </>
          )}
        </Card>
      )}
    </>
  );
}
