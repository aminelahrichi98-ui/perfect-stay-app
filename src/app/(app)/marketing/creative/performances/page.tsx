import Link from "next/link";
import { Badge, Card, Field, Input, Notice, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import { exigerAcces } from "@/lib/auth";
import { formatDevise, indicateurs, libelleSegment, libelleType, SEGMENTS, statutAngle, statutCreative, STATUTS_ANGLE, STATUTS_CREATIVE, totaliser, TYPES_IMAGE, ZERO, type Totaux } from "@/lib/creative";
import { ajouterJours, aujourdhui } from "@/lib/dates";
import { charger, ScriptAFaire } from "../commun";
import { lienAngle, Vide } from "../elements";
import { chargerAngles, chargerCreatives, chargerPerformances, chargerReglages, totauxParAnnonce } from "../donnees";
import { Filtres } from "../filtres";
import { TableauPerformances, type LigneTableau } from "../tableau";

const VUES = [
  { value: "angles", label: "Angles" },
  { value: "creatives", label: "Images" },
  { value: "types", label: "Types d'image" },
] as const;
const JOUR = /^\d{4}-\d{2}-\d{2}$/;

export default async function PagePerformances({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await exigerAcces("marketing");
  const sp = await searchParams;
  const vue = VUES.some((v) => v.value === sp.vue) ? sp.vue! : "angles";
  const periode = sp.periode ?? "tout";
  const fin = aujourdhui();
  const du = periode === "perso" ? (JOUR.test(sp.du ?? "") ? sp.du : undefined) : periode === "tout" ? undefined : ajouterJours(fin, -(Number(periode) - 1));
  const au = periode === "perso" ? (JOUR.test(sp.au ?? "") ? sp.au : undefined) : undefined;

  const donnees = await charger(async () => {
    const [angles, creatives, perf, reglages] = await Promise.all([chargerAngles(), chargerCreatives(), chargerPerformances(du, au), chargerReglages()]);
    return { angles, creatives, perf, reglages };
  });
  if (!donnees) return <ScriptAFaire />;
  const d = donnees.reglages.devise;
  const parAnnonce = totauxParAnnonce(donnees.perf.lignes);
  const de = (id: string | null): Totaux => (id && parAnnonce.get(id)) || ZERO;
  const autresDevises = [...new Set(donnees.perf.lignes.map((l) => l.devise))].filter((x) => x !== d);

  const statutDefaut = vue === "creatives" ? "actives" : "en_cours";
  const statut = sp.statut ?? statutDefaut;
  const creatives = donnees.creatives.filter((c) => (!sp.segment || c.segment === sp.segment) && (!sp.angle || c.angleId === sp.angle));
  const associes = new Set(donnees.creatives.map((c) => c.metaAdId).filter(Boolean));
  const nonAssociees = totaliser([...parAnnonce].filter(([id]) => !associes.has(id)).map(([, t]) => t));

  let lignes: LigneTableau[] = [];
  let entete = "Angle";
  let avertissement: string | null = null;

  if (vue === "angles") {
    lignes = donnees.angles
      .filter((a) => (!sp.segment || a.segment === sp.segment) && (!sp.angle || a.id === sp.angle) && (statut === "tous" || (statut === "en_cours" ? a.statut !== "archived" : a.statut === statut)))
      .map((a) => {
        const siennes = donnees.creatives.filter((c) => c.angleId === a.id);
        const s = statutAngle(a.statut);
        return {
          cle: a.id,
          titre: (
            <Link href={lienAngle(a.id)} className="font-medium underline-offset-4 hover:underline">
              <span className="num text-ink-3">{a.code}</span> {a.nom}
            </Link>
          ),
          sous: `${libelleSegment(a.segment)} · ${siennes.length} image${siennes.length > 1 ? "s" : ""}`,
          i: indicateurs(totaliser(siennes.map((c) => de(c.metaAdId)))),
          apres: <Badge ton={s.ton}>{s.label}</Badge>,
        };
      });
  } else if (vue === "creatives") {
    entete = "Image";
    lignes = creatives
      .filter((c) => statut === "toutes" || (statut === "actives" ? c.statut !== "archivee" : c.statut === statut))
      .map((c) => {
        const s = statutCreative(c.statut);
        return {
          cle: c.id,
          titre: (
            <span className="flex items-center gap-3">
              {c.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- adresse temporaire du stockage privé
                <img src={c.imageUrl} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="h-11 w-11 shrink-0 rounded-lg bg-sunken" />
              )}
              <span className="min-w-0">
                <span className="num block truncate font-medium">{c.code}</span>
                <span className="block truncate text-[0.8rem] text-ink-3">{libelleType(c.type)}</span>
              </span>
            </span>
          ),
          sous: c.metaAdId ? null : "Pas d'annonce Meta associée",
          i: indicateurs(de(c.metaAdId)),
          apres: <Badge ton={s.ton}>{s.label}</Badge>,
        };
      });
  } else {
    entete = "Type d'image";
    const angle = donnees.angles.find((a) => a.id === sp.angle);
    if (!angle) avertissement = "Choisissez un angle : les types d'image se comparent au sein d'un même angle.";
    else {
      lignes = TYPES_IMAGE.map((t) => {
        const siennes = donnees.creatives.filter((c) => c.angleId === angle.id && c.type === t.value && (statut === "toutes" || (statut === "actives" ? c.statut !== "archivee" : c.statut === statut)));
        return { cle: t.value, titre: <span className="font-medium">{t.label}</span>, sous: `${siennes.length} image${siennes.length > 1 ? "s" : ""}`, i: indicateurs(totaliser(siennes.map((c) => de(c.metaAdId)))), n: siennes.length };
      }).filter((l) => l.n > 0);
      if (!lignes.length) avertissement = `L'angle ${angle.code} n'a pas encore d'image.`;
    }
  }
  const total = indicateurs(totaliser(lignes.map((l) => l.i)));
  const param = (v: string) => `?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([k, x]) => x && k !== "statut")), vue: v } as Record<string, string>).toString()}`;
  const statuts = vue === "angles" ? [{ value: "en_cours", label: "Non archivés" }, { value: "tous", label: "Tous" }, ...STATUTS_ANGLE] : [{ value: "actives", label: "Non archivées" }, { value: "toutes", label: "Toutes" }, ...STATUTS_CREATIVE];

  return (
    <div className="space-y-5">
      <div className="flex gap-1 overflow-x-auto border-b border-line" role="tablist" aria-label="Vue des performances">
        {VUES.map((v) => (
          <Link key={v.value} href={param(v.value)} role="tab" aria-selected={vue === v.value} className={cn("press -mb-px h-11 border-b-2 px-4 text-[0.95rem] leading-[2.6rem] font-medium whitespace-nowrap", vue === v.value ? "border-wine-600 text-wine-700" : "border-transparent text-ink-3 hover:text-ink")}>
            {v.label}
          </Link>
        ))}
      </div>

      <Filtres className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input type="hidden" name="vue" value={vue} />
        <Field label="Période" htmlFor="p-periode">
          <Select id="p-periode" name="periode" defaultValue={periode}>
            <option value="tout">Toute la période</option>
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
            <option value="perso">Dates au choix</option>
          </Select>
        </Field>
        <Field label="Segment" htmlFor="p-segment">
          <Select id="p-segment" name="segment" defaultValue={sp.segment ?? ""}>
            <option value="">Tous les segments</option>
            {SEGMENTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Angle" htmlFor="p-angle">
          <Select id="p-angle" name="angle" defaultValue={sp.angle ?? ""}>
            <option value="">{vue === "types" ? "Choisir un angle" : "Tous les angles"}</option>
            {donnees.angles.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} · {a.nom}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Statut" htmlFor="p-statut">
          <Select id="p-statut" name="statut" defaultValue={statut}>
            {statuts.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        {periode === "perso" ? (
          <>
            <Field label="Du" htmlFor="p-du">
              <Input id="p-du" name="du" type="date" defaultValue={sp.du} className="num" />
            </Field>
            <Field label="Au" htmlFor="p-au">
              <Input id="p-au" name="au" type="date" defaultValue={sp.au} className="num" />
            </Field>
          </>
        ) : null}
      </Filtres>

      {autresDevises.length ? <Notice ton="danger">Certaines performances sont enregistrées en {autresDevises.join(", ")} et non en {d} : les totaux ci-dessous les additionnent telles quelles. Vérifiez la devise dans les réglages.</Notice> : null}
      {donnees.perf.horsPeriode ? <Notice ton="info">{donnees.perf.horsPeriode} ligne(s) couvrent une période plus large que le filtre et ne sont pas comptées ici. Importez des exports « par jour » pour filtrer finement.</Notice> : null}
      {avertissement ? <Notice ton="info">{avertissement}</Notice> : null}

      {lignes.length ? (
        <TableauPerformances lignes={lignes} total={total} devise={d} entete={entete} />
      ) : avertissement ? null : (
        <Vide titre="Rien à afficher">Créez des angles et des images, publiez-les dans Meta Ads Manager, puis importez les performances.</Vide>
      )}

      {nonAssociees.depenses > 0 || nonAssociees.impressions > 0 ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-ink-2 text-pretty">
            <strong className="text-ink">{formatDevise(nonAssociees.depenses, d)}</strong> de dépenses et <strong className="text-ink">{nonAssociees.leads}</strong> lead(s) viennent d&apos;annonces associées à aucune image. Ils ne sont comptés dans aucun angle.
          </p>
          <Link href="/marketing/creative/import" className="text-sm font-medium text-wine-700 underline underline-offset-4">
            Associer ces annonces
          </Link>
        </Card>
      ) : null}
      <p className="text-[0.82rem] text-ink-3">CTR, CPC et CPL sont calculés sur les totaux de chaque ligne (dépenses ÷ leads), jamais comme une moyenne de plusieurs CPL.</p>
    </div>
  );
}
