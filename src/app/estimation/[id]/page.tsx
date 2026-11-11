import { notFound } from "next/navigation";
import {
  BedDouble,
  Coffee,
  Flower2,
  Frame,
  Lamp,
  type LucideIcon,
  Camera,
  Sofa,
  Sparkles,
  Tv,
  Armchair,
} from "lucide-react";
import { LogoMark } from "@/components/logo";
import { exigerAcces } from "@/lib/auth";
import { BUCKET_ESTIMATIONS, CONSEILS, detailCalcul, formatMad0, libelleStanding, libelleType, parMois } from "@/lib/estimateur";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { urlsLecture } from "@/lib/stockage";
import { BarreApercu } from "./barre";

type Comparable = { titre: string; quartier: string; chambres: number; brutBas: number; brutHaut: number; photo: string | null };

const ICONES: Record<string, LucideIcon> = {
  coussins: Sofa,
  deco: Frame,
  table: Armchair,
  linge: BedDouble,
  eclairage: Lamp,
  photos: Camera,
  plantes: Flower2,
  cafe: Coffee,
  tv: Tv,
};
const iconeDe = (texte: string) => ICONES[CONSEILS.find((c) => c.texte === texte)?.id ?? ""] ?? Sparkles;

const dateLongue = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Casablanca" }).format(new Date(iso));

function Pied({ page }: { page: number }) {
  return (
    <footer className="absolute inset-x-[18mm] bottom-[10mm] flex items-center justify-between border-t border-line pt-[3mm] text-[8pt] text-ink-3">
      <span>Perfect Stay Conciergerie · Casablanca</span>
      <span className="num">{page} / 4</span>
    </footer>
  );
}

async function charger(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("estimations").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const e = await charger((await params).id);
  return { title: { absolute: e ? `Estimation Perfect Stay - ${e.prenom} - ${e.quartier}` : "Estimation Perfect Stay" } };
}

export default async function PageApercuEstimation({ params }: { params: Promise<{ id: string }> }) {
  await exigerAcces("estimateur");
  const e = await charger((await params).id);
  if (!e) notFound();

  const photos = e.photos as string[];
  const comparables = e.comparables as Comparable[];
  const conseils = e.conseils as string[];
  const urls = await urlsLecture(BUCKET_ESTIMATIONS, [...photos, ...comparables.flatMap((c) => (c.photo ? [c.photo] : []))]);
  const { data: entreprise } = await createAdminClient().from("entreprise").select("telephone").eq("id", 1).maybeSingle();
  const whatsapp = entreprise?.telephone?.trim() ?? "";

  const netBas = Number(e.net_bas);
  const netHaut = Number(e.net_haut);
  const bas = detailCalcul(Number(e.brut_bas));
  const haut = detailCalcul(Number(e.brut_haut));
  // Le net affiché vient de la fourchette retenue (éventuellement ajustée) : on aligne le détail dessus
  bas.net = netBas;
  haut.net = netHaut;

  const type = libelleType(e.type_bien) + (e.type_bien === "villa" && e.piscine ? " avec piscine" : "");
  const couverture = urls.get(photos[0]);
  const autresPhotos = photos.slice(1).map((p) => urls.get(p)).filter(Boolean) as string[];
  const caracteristiques = [
    libelleType(e.type_bien),
    e.capacite ? `${e.capacite} voyageurs` : "",
    `Standing ${libelleStanding(e.standing).toLowerCase()}`,
    e.type_bien === "villa" ? (e.piscine ? "Piscine" : "Sans piscine") : "",
  ].filter(Boolean);

  return (
    <div className="apercu-estimation min-h-dvh bg-sunken print:bg-white">
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        .feuille { width: 210mm; height: 297mm; position: relative; overflow: hidden; background: white; break-after: page; page-break-after: always; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .feuille:last-child { break-after: auto; page-break-after: auto; }
        @media screen { .feuille { margin: 0 auto 24px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.08), 0 12px 32px rgb(0 0 0 / 0.08); border-radius: 4px; zoom: var(--zoom-feuille, 1); } }
        @media print { html, body { background: white !important; } .feuille { margin: 0; box-shadow: none; border-radius: 0; zoom: 1 !important; } }
      `}</style>

      <BarreApercu prenom={e.prenom} telephone={e.telephone} />

      <main className="px-4 pt-4 pb-10 print:p-0">
        {/* Page 1 — Couverture */}
        <section className="feuille">
          <div className="flex items-center justify-between px-[18mm] pt-[16mm]">
            <span className="flex items-center gap-[3mm] text-aub-900">
              <LogoMark className="h-[11mm] w-auto" />
              <span className="font-display text-[15pt] leading-none font-semibold tracking-tight">
                Perfect Stay
                <span className="mt-[1.5mm] block text-[6.5pt] font-medium tracking-[0.28em] uppercase opacity-60">Conciergerie</span>
              </span>
            </span>
            <span className="text-[8.5pt] tracking-[0.18em] text-ink-3 uppercase">Casablanca</span>
          </div>

          <div className="mx-[18mm] mt-[12mm] h-[138mm] overflow-hidden rounded-[4mm] bg-sunken">
            {couverture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={couverture} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>

          <div className="px-[18mm] pt-[13mm]">
            <p className="text-[8.5pt] font-medium tracking-[0.24em] text-wine-700 uppercase">Document confidentiel</p>
            <h1 className="mt-[4mm] font-display text-[32pt] leading-[1.05] font-semibold tracking-tight text-aub-900">Estimation de revenus locatifs</h1>
            <p className="mt-[4mm] text-[14pt] text-ink-2">
              {type} · {e.quartier}, {e.ville}
            </p>
            <div className="mt-[11mm] flex items-end justify-between border-t border-line pt-[6mm]">
              <div>
                <p className="text-[8pt] tracking-[0.18em] text-ink-3 uppercase">Préparée pour</p>
                <p className="mt-[1.5mm] font-display text-[17pt] font-semibold text-aub-900">{e.prenom}</p>
              </div>
              <div className="text-right">
                <p className="text-[10pt] text-ink-2">{dateLongue(e.created_at)}</p>
                <p className="mt-[1mm] text-[8.5pt] text-ink-3">Estimation valable 30 jours</p>
              </div>
            </div>
          </div>
        </section>

        {/* Page 2 — L'estimation */}
        <section className="feuille">
          <div className="px-[18mm] pt-[20mm]">
            <p className="text-[8.5pt] font-medium tracking-[0.24em] text-wine-700 uppercase">Votre estimation</p>
            <h2 className="mt-[3mm] font-display text-[20pt] font-semibold tracking-tight text-aub-900">Ce que votre bien peut vous rapporter, net</h2>

            <div className="mt-[10mm] rounded-[4mm] bg-aub-900 px-[12mm] py-[11mm] text-white">
              <p className="text-[9pt] tracking-[0.18em] text-aub-200 uppercase">Revenu net propriétaire</p>
              <p className="num mt-[3mm] font-display text-[40pt] leading-none font-semibold tracking-tight">
                {formatMad0(parMois(netBas))} – {formatMad0(parMois(netHaut))}
                <span className="ml-[3mm] text-[15pt] font-medium text-aub-200">MAD / mois</span>
              </p>
              <p className="num mt-[5mm] text-[13pt] text-aub-200">
                soit <span className="font-semibold text-white">{formatMad0(netBas)} – {formatMad0(netHaut)} MAD</span> par an
              </p>
            </div>

            <h3 className="mt-[13mm] text-[8.5pt] font-medium tracking-[0.2em] text-ink-3 uppercase">Le calcul, en toute transparence (par an)</h3>
            <table className="num mt-[4mm] w-full text-[10.5pt]">
              <tbody>
                {[
                  ["Revenus bruts estimés", bas.brut, haut.brut, ""],
                  ["Frais plateforme et TVA", -bas.fraisPlateforme, -haut.fraisPlateforme, "−18 %"],
                  ["Commission Perfect Stay", -bas.commission, -haut.commission, "−20 %"],
                ].map(([label, b, h, pct]) => (
                  <tr key={String(label)} className="border-b border-line">
                    <td className="py-[3.2mm] text-ink-2">
                      {label}
                      {pct ? <span className="ml-[2mm] rounded-full bg-wine-50 px-[2mm] py-[0.5mm] text-[8pt] font-medium text-wine-700">{pct}</span> : null}
                    </td>
                    <td className="py-[3.2mm] text-right text-ink">
                      {Number(b) < 0 ? "− " : ""}
                      {formatMad0(Math.abs(Number(b)))} – {formatMad0(Math.abs(Number(h)))} MAD
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="pt-[4mm] font-display text-[12pt] font-semibold text-aub-900">Net propriétaire</td>
                  <td className="pt-[4mm] text-right font-display text-[12pt] font-semibold text-wine-700">
                    {formatMad0(netBas)} – {formatMad0(netHaut)} MAD
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-[5mm] text-[9pt] text-ink-3">Les frais de ménage sont refacturés aux voyageurs : ils ne sont pas déduits de votre revenu.</p>
            <p className="mt-[1.5mm] text-[9pt] text-ink-3">
              Fourchette indicative basée sur des biens comparables réellement loués dans votre quartier.
            </p>

            <div className="mt-[10mm] flex flex-wrap gap-[2mm]">
              {caracteristiques.map((c) => (
                <span key={c} className="rounded-full border border-line px-[3.5mm] py-[1.2mm] text-[8.5pt] text-ink-2">
                  {c}
                </span>
              ))}
            </div>
            {autresPhotos.length ? (
              <div className="mt-[6mm] grid grid-cols-3 gap-[3mm]">
                {autresPhotos.slice(0, 3).map((u) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={u} src={u} alt="" className="h-[34mm] w-full rounded-[2.5mm] object-cover" />
                ))}
              </div>
            ) : null}
          </div>
          <Pied page={2} />
        </section>

        {/* Page 3 — Biens comparables */}
        <section className="feuille">
          <div className="px-[18mm] pt-[20mm]">
            <p className="text-[8.5pt] font-medium tracking-[0.24em] text-wine-700 uppercase">Le marché</p>
            <h2 className="mt-[3mm] font-display text-[20pt] font-semibold tracking-tight text-aub-900">Biens comparables</h2>
            <p className="mt-[2mm] text-[10pt] text-ink-2">Annonces similaires à la vôtre, et leurs revenus annuels bruts observés.</p>

            <div className="mt-[9mm] space-y-[5mm]">
              {comparables.map((c, i) => {
                const photo = c.photo ? urls.get(c.photo) : undefined;
                return (
                  <article key={i} className="flex h-[48mm] overflow-hidden rounded-[4mm] border border-line">
                    <div className="h-full w-[62mm] shrink-0 bg-sunken">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center bg-aub-900 text-aub-700">
                          <LogoMark className="h-[16mm] w-auto" />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between p-[6mm]">
                      <div>
                        <h3 className="line-clamp-2 font-display text-[12.5pt] leading-snug font-semibold text-aub-900">{c.titre}</h3>
                        <p className="mt-[1.5mm] text-[9.5pt] text-ink-2">
                          {[c.quartier || e.quartier, c.chambres ? `${c.chambres} chambre${c.chambres > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div>
                        <p className="text-[7.5pt] tracking-[0.16em] text-ink-3 uppercase">Revenu annuel brut</p>
                        <span className="num mt-[1.5mm] inline-block rounded-full bg-wine-700 px-[4mm] py-[1.5mm] text-[10.5pt] font-semibold text-white">
                          {formatMad0(c.brutBas)} – {formatMad0(c.brutHaut)} MAD
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
          <Pied page={3} />
        </section>

        {/* Page 4 — Conseils et contact */}
        <section className="feuille">
          <div className="px-[18mm] pt-[20mm]">
            <p className="text-[8.5pt] font-medium tracking-[0.24em] text-wine-700 uppercase">Nos recommandations</p>
            <h2 className="mt-[3mm] font-display text-[20pt] font-semibold tracking-tight text-aub-900">Comment atteindre le haut de la fourchette</h2>

            {conseils.length ? (
              <ul className="mt-[9mm] space-y-[4.5mm]">
                {conseils.map((c) => {
                  const Icone = iconeDe(c);
                  return (
                    <li key={c} className="flex items-center gap-[5mm]">
                      <span className="grid h-[11mm] w-[11mm] shrink-0 place-items-center rounded-full bg-wine-50 text-wine-700">
                        <Icone className="h-[5.5mm] w-[5.5mm]" strokeWidth={1.6} />
                      </span>
                      <span className="text-[11.5pt] text-ink">{c}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-[6mm] text-[11pt] text-ink-2">Une présentation soignée et des photos professionnelles font toute la différence sur Airbnb.</p>
            )}

            <div className="mt-[14mm] rounded-[4mm] bg-aub-900 px-[12mm] py-[11mm] text-white">
              <LogoMark className="h-[9mm] w-auto text-wine-500" />
              <h3 className="mt-[5mm] font-display text-[19pt] leading-tight font-semibold tracking-tight">Affinez cette estimation avec Amine</h3>
              {whatsapp ? (
                <p className="mt-[3mm] text-[11pt] text-aub-200">
                  WhatsApp : <span className="num font-semibold text-white">{whatsapp}</span>
                </p>
              ) : null}
              <ol className="mt-[8mm] grid grid-cols-3 gap-[4mm]">
                {["Appel de 15 minutes", "Visite de votre bien", "Mise en ligne"].map((etape, i) => (
                  <li key={etape} className="rounded-[3mm] border border-white/15 p-[4.5mm]">
                    <span className="num font-display text-[16pt] font-semibold text-wine-500">{i + 1}</span>
                    <span className="mt-[1.5mm] block text-[10pt] leading-snug">{etape}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <Pied page={4} />
        </section>
      </main>
    </div>
  );
}
