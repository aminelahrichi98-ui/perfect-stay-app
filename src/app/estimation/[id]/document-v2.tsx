import QRCode from "qrcode";
import {
  BadgeCheck,
  CalendarCheck,
  Camera,
  Headset,
  KeyRound,
  LineChart,
  MessageCircle,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "@/components/logo";
import {
  arrondir,
  LIBELLES_SOURCE_LOYER,
  mensuel,
} from "@/lib/estimation/calcul";
import { entier, jour, pourcent } from "@/lib/estimation/format";
import { lienWhatsapp } from "@/lib/estimation/parametres";
import type { Snapshot } from "@/lib/estimation/snapshot";

/*
  Document client v2 : 3 pages A4 au maximum, rendu à partir de l'instantané figé de l'estimation.
  Les sections sans données fiables disparaissent (jamais de chiffre ni d'image de remplacement).
*/

const ICONES_SERVICES: LucideIcon[] = [
  LineChart,
  Camera,
  KeyRound,
  Sparkles,
  Headset,
  BadgeCheck,
];
const MOIS = [
  "Janv.",
  "Févr.",
  "Mars",
  "Avr.",
  "Mai",
  "Juin",
  "Juil.",
  "Août",
  "Sept.",
  "Oct.",
  "Nov.",
  "Déc.",
];

const dateLongue = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Casablanca",
  }).format(new Date(iso));

function motLogement(type: string | null): string {
  if (type === "studio") return "studio";
  if (type === "villa") return "villa";
  if (type === "riad") return "riad";
  if (type === "appartement" || type === "duplex" || type === "penthouse")
    return "appartement";
  return "logement";
}

function Pied({ page, total }: { page: number; total: number }) {
  return (
    <footer className="absolute inset-x-[16mm] bottom-[9mm] flex items-center justify-between border-t border-line pt-[2.5mm] text-[7.5pt] text-ink-3">
      <span>
        Perfect Stay Conciergerie · Estimation indicative, non contractuelle
      </span>
      <span className="num">
        {page} / {total}
      </span>
    </footer>
  );
}

function Entete({ prenom, date }: { prenom: string; date: string }) {
  return (
    <div className="flex items-center justify-between px-[16mm] pt-[12mm]">
      <span className="flex items-center gap-[2.5mm] text-aub-900">
        <LogoMark className="h-[9mm] w-auto" />
        <span className="font-display text-[13pt] leading-none font-semibold tracking-tight">
          Perfect Stay
          <span className="mt-[1.2mm] block text-[6pt] font-medium tracking-[0.28em] uppercase opacity-60">
            Conciergerie
          </span>
        </span>
      </span>
      <span className="text-right text-[8pt] text-ink-3">
        Préparée pour <span className="font-medium text-ink">{prenom}</span>
        <span className="block">{date}</span>
      </span>
    </div>
  );
}

export async function DocumentV2({
  s,
  statut,
  photoUrl,
  comparablesUrls,
}: {
  s: Snapshot;
  statut: string;
  photoUrl: string | null;
  comparablesUrls: Map<string, string>;
}) {
  const r = s.resultat;
  const m = s.marche;
  const devise = m?.devise ?? s.params.devise;
  const pas = s.params.arrondiMensuel;
  const prudent = r.scenarios.find((x) => x.cle === "prudent");
  const haut = r.scenarios.find((x) => x.cle === "haut");
  const central = r.central;
  const mois = (n: number) => entier(arrondir(mensuel(n), pas));
  const dh = (n: number) => entier(arrondir(n));
  const brouillon = statut === "brouillon" || statut === "a_valider";
  const date = dateLongue(s.creeLe);
  const typeTexte =
    s.bien.type_logement === "studio"
      ? "Studio"
      : `${s.bien.type_logement ? s.bien.type_logement.charAt(0).toUpperCase() + s.bien.type_logement.slice(1) : "Logement"}${s.bien.chambres ? ` ${s.bien.chambres} chambre${s.bien.chambres > 1 ? "s" : ""}` : ""}`;
  const message = s.commercialParams.messageWhatsapp;
  const lienCta =
    lienWhatsapp(s.commercialParams.whatsapp, message) ||
    s.commercialParams.lienRdv;
  const qr =
    s.sections.qrCode && lienCta
      ? await QRCode.toString(lienCta, {
          type: "svg",
          margin: 0,
          errorCorrectionLevel: "M",
          color: { dark: "#2a1424", light: "#ffffff" },
        })
      : "";

  // Page 2 : preuves de marché (affichée seulement si elle a du contenu fiable)
  const comparables = s.comparables
    .filter((c) => c.photo && comparablesUrls.get(c.photo))
    .slice(0, 4);
  const nuits = m?.nuitsReservees ?? null;
  const nuitsApprox =
    nuits === null && m?.occupation !== null && m?.occupation !== undefined
      ? Math.round((m.occupation / 100) * 365)
      : null;
  const saison =
    s.sections.saisonnalite && m
      ? (() => {
          const nature =
            new Set(
              m.mensuels
                .filter((x) => x.nature === "historique")
                .map((x) => x.mois),
            ).size === 12
              ? "historique"
              : "prevision";
          const parMois = new Map<number, number>();
          for (const x of m.mensuels.filter((y) => y.nature === nature))
            if (!parMois.has(x.mois)) parMois.set(x.mois, x.valeur);
          return parMois.size === 12
            ? {
                nature,
                valeurs: Array.from(
                  { length: 12 },
                  (_, i) => parMois.get(i + 1)!,
                ),
              }
            : null;
        })()
      : null;
  const indicateurs = m
    ? [
        m.adr !== null,
        m.occupation !== null,
        nuits !== null || nuitsApprox !== null,
      ].filter(Boolean).length
    : 0;
  // Page des preuves seulement si elle est bien remplie ; sinon indicateurs et méthodologie passent en dernière page
  const pagePreuves =
    Boolean(m) &&
    s.sections.preuve &&
    (comparables.length >= 2 || Boolean(saison));
  const preuvesCompactes =
    Boolean(m) && s.sections.preuve && !pagePreuves && indicateurs > 0;
  const total = pagePreuves ? 3 : 2;

  const methodologie = m ? (
    <div className="rounded-[3mm] bg-sunken px-[5mm] py-[3mm] text-[7pt] leading-snug text-ink-2">
      <p className="font-semibold text-ink">Source et méthodologie</p>
      <p>
        Données {m.source} du segment « {m.quartier} · {m.typologie} », période{" "}
        {m.periodeDebut ? jour(m.periodeDebut) : "?"} →{" "}
        {m.periodeFin ? jour(m.periodeFin) : "?"}
        {m.typePeriode ? ` (${m.typePeriode})` : ""}, importées le{" "}
        {jour(m.dateImport)}
        {m.echantillon !== null
          ? `, ${entier(m.echantillon)} logements analysés`
          : ""}
        . Scénarios :{" "}
        {r.scenarios
          .map(
            (x) =>
              `${x.libelle.toLowerCase()} = ${x.derive && x.formule ? `${x.formule}, calculé par Perfect Stay (non fourni par la source)` : x.source}`,
          )
          .join(" ; ")}
        .
        {m.correspondance === "approximation"
          ? ` Données d'un segment proche (${m.ecarts.join(", ")}) : l'estimation est indicative.`
          : ""}
        {m.correspondance === "regroupement"
          ? " Segment regroupé par la source (plusieurs nombres de chambres)."
          : ""}
        {m.base.plateformeIncluse === null
          ? " La source ne précise pas si ses revenus incluent les frais de plateforme : ils ont été considérés comme inclus."
          : ""}
      </p>
    </div>
  ) : null;
  const blocIndicateurs = m ? (
    <div className="grid grid-cols-3 gap-[3mm]">
      {m.adr !== null ? (
        <Indicateur
          titre="Prix moyen par nuit"
          valeur={`${entier(m.adr)} ${devise}`}
        />
      ) : null}
      {m.occupation !== null ? (
        <Indicateur titre="Taux d'occupation" valeur={pourcent(m.occupation)} />
      ) : null}
      {nuits !== null ? (
        <Indicateur titre="Nuits réservées par an" valeur={entier(nuits)} />
      ) : nuitsApprox !== null ? (
        <Indicateur
          titre="Nuits réservées par an"
          valeur={`≈ ${entier(nuitsApprox)}`}
          note="approximation : occupation × 365"
        />
      ) : null}
    </div>
  ) : null;

  const comparaison = s.sections.comparaisonLongueDuree ? r.comparaison : null;
  const maxBarre = comparaison
    ? Math.max(comparaison.loyerMensuel, comparaison.courteMensuelle, 1)
    : 1;

  return (
    <>
      {/* ------------------------------ Page 1 : l'opportunité ------------------------------ */}
      <section className="feuille">
        {brouillon ? (
          <div className="absolute top-0 inset-x-0 bg-warn py-[1.2mm] text-center text-[8pt] font-semibold tracking-[0.2em] text-white uppercase">
            Brouillon — non validé, ne pas envoyer
          </div>
        ) : null}
        <Entete prenom={s.proprietaire.prenom} date={date} />
        <div className="px-[16mm] pt-[7mm]">
          <div
            className={photoUrl ? "grid grid-cols-[1fr_62mm] gap-[6mm]" : ""}
          >
            <div>
              <p className="text-[8pt] font-medium tracking-[0.22em] text-wine-700 uppercase">
                {typeTexte} · {s.bien.quartier}, {s.bien.ville}
              </p>
              <h1 className="mt-[3mm] font-display text-[25pt] leading-[1.08] font-semibold tracking-tight text-aub-900">
                Ce que votre {motLogement(s.bien.type_logement)} peut vous
                rapporter
              </h1>
            </div>
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                className="h-[42mm] w-full rounded-[3mm] object-cover"
              />
            ) : null}
          </div>

          {central ? (
            <div className="mt-[6mm] rounded-[4mm] bg-aub-900 px-[10mm] py-[8mm] text-white">
              <p className="text-[8pt] tracking-[0.18em] text-aub-200 uppercase">
                Revenu propriétaire après commissions
              </p>
              {prudent && haut ? (
                <p className="num mt-[2.5mm] font-display text-[34pt] leading-none font-semibold tracking-tight">
                  {mois(prudent.apresCommissions)} –{" "}
                  {mois(haut.apresCommissions)}
                  <span className="ml-[2.5mm] text-[13pt] font-medium text-aub-200">
                    {devise} / mois
                  </span>
                </p>
              ) : (
                <p className="num mt-[2.5mm] font-display text-[34pt] leading-none font-semibold tracking-tight">
                  {mois(central.apresCommissions)}
                  <span className="ml-[2.5mm] text-[13pt] font-medium text-aub-200">
                    {devise} / mois
                  </span>
                </p>
              )}
              <div className="mt-[4mm] flex flex-wrap gap-x-[8mm] gap-y-[1.5mm] text-[10pt] text-aub-200">
                {prudent && haut ? (
                  <span>
                    Scénario central :{" "}
                    <span className="num font-semibold text-white">
                      {mois(central.apresCommissions)} {devise}/mois
                    </span>
                    {central.derive ? (
                      <span className="text-[8pt]">
                        {" "}
                        (moyenne des scénarios prudent et haut)
                      </span>
                    ) : null}
                  </span>
                ) : null}
                <span>
                  Par an :{" "}
                  <span className="num font-semibold text-white">
                    {prudent && haut
                      ? `${dh(prudent.apresCommissions)} – ${dh(haut.apresCommissions)}`
                      : dh(central.apresCommissions)}{" "}
                    {devise}
                  </span>
                </span>
              </div>
            </div>
          ) : null}
          <p className="mt-[2.5mm] text-[7.5pt] leading-snug text-ink-3">
            Estimation fondée sur des données de marché de logements
            comparables. Les revenus ne sont pas garantis : ils varient selon la
            saison, les prix, l&apos;état du logement et la demande.
          </p>

          {comparaison ? (
            <div className="mt-[6mm]">
              <h2 className="text-[8pt] font-medium tracking-[0.2em] text-ink-3 uppercase">
                Longue durée ou Perfect Stay ? (par mois
                {comparaison.base === "resultat" ? ", après charges" : ""})
              </h2>
              <div className="mt-[3mm] space-y-[2.5mm]">
                {[
                  {
                    libelle: "Location longue durée",
                    valeur: comparaison.loyerMensuel,
                    couleur: "bg-ink-3/40",
                  },
                  {
                    libelle: "Avec Perfect Stay (scénario central)",
                    valeur: comparaison.courteMensuelle,
                    couleur: "bg-wine-600",
                  },
                ].map((b) => (
                  <div
                    key={b.libelle}
                    className="grid grid-cols-[52mm_1fr] items-center gap-[3mm] text-[9pt]"
                  >
                    <span className="text-ink-2">{b.libelle}</span>
                    <span className="flex items-center gap-[2mm]">
                      <span
                        className={`h-[5mm] rounded-full ${b.couleur}`}
                        style={{
                          width: `${Math.max(4, (b.valeur / maxBarre) * 100) * 0.78}%`,
                        }}
                      />
                      <span className="num shrink-0 font-semibold text-ink">
                        {entier(arrondir(b.valeur, pas))} {devise}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-[2mm] text-[8.5pt] text-ink-2">
                {comparaison.differenceMensuelle >= 0 ? (
                  <>
                    Soit{" "}
                    <span className="num font-semibold text-wine-700">
                      +{entier(arrondir(comparaison.differenceMensuelle, pas))}{" "}
                      {devise} par mois
                    </span>
                    {comparaison.pourcentage !== null
                      ? ` (+${pourcent(comparaison.pourcentage)})`
                      : ""}{" "}
                    dans le scénario central.
                  </>
                ) : (
                  <>
                    Dans ce scénario, la location longue durée rapporte
                    davantage (
                    {entier(arrondir(-comparaison.differenceMensuelle, pas))}{" "}
                    {devise} de plus par mois).
                  </>
                )}{" "}
                <span className="text-ink-3">
                  Loyer :{" "}
                  {comparaison.source
                    ? LIBELLES_SOURCE_LOYER[comparaison.source].toLowerCase()
                    : "renseigné"}
                  {comparaison.loyerDerive ? " (milieu de la fourchette)" : ""}
                  {s.longueDuree.date
                    ? `, information du ${jour(s.longueDuree.date)}`
                    : ""}
                  . {comparaison.note}
                </span>
              </p>
            </div>
          ) : null}

          {prudent && haut && central ? (
            <div className="mt-[6mm]">
              <h2 className="text-[8pt] font-medium tracking-[0.2em] text-ink-3 uppercase">
                Le calcul, en toute transparence (par an)
              </h2>
              <table className="num mt-[2mm] w-full text-[9pt]">
                <tbody>
                  <tr className="border-b border-line">
                    <td className="py-[2mm] text-ink-2">
                      Revenus bruts estimés (marché)
                    </td>
                    <td className="py-[2mm] text-right">
                      {dh(prudent.brut)} – {dh(haut.brut)} {devise}
                    </td>
                  </tr>
                  {r.deductionPlateforme ? (
                    <tr className="border-b border-line">
                      <td className="py-[2mm] text-ink-2">
                        Frais de plateforme (
                        {pourcent(r.tauxEffectifPlateforme * 100, 1)})
                      </td>
                      <td className="py-[2mm] text-right">
                        − {dh(prudent.fraisPlateforme)} –{" "}
                        {dh(haut.fraisPlateforme)} {devise}
                      </td>
                    </tr>
                  ) : null}
                  {prudent.menage > 0 ? (
                    <tr className="border-b border-line">
                      <td className="py-[2mm] text-ink-2">Part ménage</td>
                      <td className="py-[2mm] text-right">
                        − {dh(prudent.menage)} – {dh(haut.menage)} {devise}
                      </td>
                    </tr>
                  ) : null}
                  <tr className="border-b border-line">
                    <td className="py-[2mm] text-ink-2">
                      Commission Perfect Stay (
                      {pourcent(r.tauxEffectifCommission * 100, 1)})
                    </td>
                    <td className="py-[2mm] text-right">
                      − {dh(prudent.commission)} – {dh(haut.commission)}{" "}
                      {devise}
                    </td>
                  </tr>
                  <tr>
                    <td className="pt-[2.5mm] font-display text-[10.5pt] font-semibold text-aub-900">
                      Revenu propriétaire après commissions
                    </td>
                    <td className="pt-[2.5mm] text-right font-display text-[10.5pt] font-semibold text-wine-700">
                      {dh(prudent.apresCommissions)} –{" "}
                      {dh(haut.apresCommissions)} {devise}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-[2mm] text-[7.5pt] leading-snug text-ink-3">
                {r.chargesMensuelles !== null && central.resultat !== null
                  ? `Après les charges indiquées (${r.chargesIncluses.join(", ")} : ${entier(r.chargesMensuelles)} ${devise}/mois), résultat central avant fiscalité : ${mois(central.resultat)} ${devise}/mois.${r.chargesNonIncluses.length ? ` Non incluses : ${r.chargesNonIncluses.join(", ").toLowerCase()}.` : ""}`
                  : "Charges d'exploitation (eau, électricité, internet, syndic, entretien) et fiscalité non déduites."}
                {r.mentionMenageSansImpact
                  ? " Les frais de ménage sont payés par les voyageurs : ils n'ont pas d'impact sur votre revenu."
                  : ""}
              </p>
            </div>
          ) : null}
        </div>
        {lienCta ? (
          <div className="absolute inset-x-[16mm] bottom-[17mm] flex items-center justify-between rounded-[3mm] border border-line px-[5mm] py-[3mm]">
            <span className="text-[9pt] text-ink-2">
              Une question sur ces chiffres ? Visitons votre logement ensemble,
              gratuitement.
            </span>
            <a
              href={lienCta}
              className="rounded-full bg-wine-600 px-[4mm] py-[1.6mm] text-[9pt] font-semibold text-white no-underline"
            >
              {s.commercialParams.ctaTexte}
            </a>
          </div>
        ) : null}
        <Pied page={1} total={total} />
      </section>

      {/* ------------------------------ Page 2 : les preuves de marché ------------------------------ */}
      {pagePreuves && m ? (
        <section className="feuille">
          <Entete prenom={s.proprietaire.prenom} date={date} />
          <div className="px-[16mm] pt-[7mm]">
            <p className="text-[8pt] font-medium tracking-[0.22em] text-wine-700 uppercase">
              Le marché de {m.quartier}
            </p>
            <h2 className="mt-[2.5mm] font-display text-[20pt] leading-tight font-semibold tracking-tight text-aub-900">
              Des appartements similaires au vôtre génèrent déjà des revenus
            </h2>

            {indicateurs ? (
              <div className="mt-[4mm]">{blocIndicateurs}</div>
            ) : null}

            {comparables.length >= 2 ? (
              <div className="mt-[4mm] grid grid-cols-2 gap-[3mm]">
                {comparables.map((c, i) => {
                  const bas = c.revenuBas ?? c.revenuAnnuel;
                  const haut2 = c.revenuHaut ?? c.revenuAnnuel;
                  return (
                    <article
                      key={i}
                      className="overflow-hidden rounded-[3mm] border border-line"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={comparablesUrls.get(c.photo)}
                        alt=""
                        className={
                          comparables.length > 2
                            ? saison
                              ? "h-[22mm] w-full object-cover"
                              : "h-[30mm] w-full object-cover"
                            : "h-[44mm] w-full object-cover"
                        }
                      />
                      <div className="px-[3.5mm] py-[2.5mm]">
                        <h3 className="line-clamp-1 text-[9.5pt] font-semibold text-aub-900">
                          {c.nom || "Annonce comparable"}
                        </h3>
                        <p className="text-[8pt] text-ink-3">
                          {c.quartier} · {c.typologie}
                        </p>
                        <p className="num mt-[1.5mm] text-[10pt] font-semibold text-wine-700">
                          {bas !== null && haut2 !== null && bas !== haut2
                            ? `${mois(bas)} – ${mois(haut2)}`
                            : bas !== null
                              ? mois(bas)
                              : "—"}{" "}
                          {devise}/mois
                          <span className="ml-[1.5mm] text-[7.5pt] font-normal text-ink-3">
                            bruts estimés
                          </span>
                        </p>
                        {c.url ? (
                          <a
                            href={c.url}
                            className="text-[7.5pt] text-wine-700 underline"
                          >
                            Voir l&apos;annonce
                          </a>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
            {comparables.length >= 2 ? (
              <p className="mt-[2mm] text-[7.5pt] text-ink-3">
                Annonces publiques comparables, non gérées par Perfect Stay.
                Revenus bruts estimés par la source de marché : simulation, pas
                des résultats garantis.
              </p>
            ) : null}

            {saison ? (
              <div className="mt-[4mm]">
                <h3 className="text-[8pt] font-medium tracking-[0.2em] text-ink-3 uppercase">
                  Saisonnalité : revenus mensuels bruts du marché (
                  {saison.nature === "historique" ? "historique" : "prévision"})
                </h3>
                <div className="mt-[2mm] flex h-[26mm] items-end gap-[1.5mm]">
                  {saison.valeurs.map((v, i) => (
                    <div
                      key={i}
                      className="flex flex-1 flex-col items-center justify-end gap-[1mm]"
                    >
                      <span className="num text-[6pt] text-ink-3">
                        {entier(arrondir(v, 100) / 1000)}k
                      </span>
                      <span
                        className="w-full rounded-t-[1mm] bg-wine-600/80"
                        style={{
                          height: `${Math.max(3, (v / Math.max(...saison.valeurs)) * 18)}mm`,
                        }}
                      />
                      <span className="text-[6pt] text-ink-3">{MOIS[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-[4mm]">{methodologie}</div>
          </div>
          <Pied page={2} total={total} />
        </section>
      ) : null}

      {/* ------------------------------ Page 3 : la solution ------------------------------ */}
      <section className="feuille">
        <Entete prenom={s.proprietaire.prenom} date={date} />
        <div className="px-[16mm] pt-[7mm]">
          <p className="text-[8pt] font-medium tracking-[0.22em] text-wine-700 uppercase">
            Gestion complète
          </p>
          <h2 className="mt-[2.5mm] font-display text-[20pt] leading-tight font-semibold tracking-tight text-aub-900">
            Optimisez vos revenus. Nous nous occupons du reste.
          </h2>
          {preuvesCompactes && m ? (
            <div className="mt-[4mm] space-y-[2.5mm]">
              <h3 className="text-[8pt] font-medium tracking-[0.2em] text-ink-3 uppercase">
                Le marché de {m.quartier}
              </h3>
              {blocIndicateurs}
              {methodologie}
            </div>
          ) : null}

          {s.commercialParams.services.length ? (
            <ul className="mt-[5mm] grid grid-cols-3 gap-[3mm]">
              {s.commercialParams.services.slice(0, 6).map((sv, i) => {
                const Icone = ICONES_SERVICES[i % ICONES_SERVICES.length];
                return (
                  <li
                    key={sv}
                    className="rounded-[3mm] border border-line p-[3.5mm]"
                  >
                    <Icone
                      className="h-[5mm] w-[5mm] text-wine-700"
                      strokeWidth={1.6}
                    />
                    <p className="mt-[2mm] text-[8.5pt] leading-snug text-ink">
                      {sv}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {s.recommandations.length ? (
            <div className="mt-[5mm]">
              <h3 className="text-[8pt] font-medium tracking-[0.2em] text-ink-3 uppercase">
                Nos recommandations pour votre logement
              </h3>
              <ul className="mt-[2mm] space-y-[1.8mm]">
                {s.recommandations.map((x) => (
                  <li key={x} className="flex gap-[2.5mm] text-[9pt] text-ink">
                    <Sparkles
                      className="mt-[0.6mm] h-[3.8mm] w-[3.8mm] shrink-0 text-wine-700"
                      strokeWidth={1.6}
                    />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {s.temoignages.length ? (
            <div className="mt-[5mm] grid grid-cols-2 gap-[3mm]">
              {s.temoignages.slice(0, 2).map((t) => (
                <blockquote
                  key={t.auteur + t.texte.slice(0, 20)}
                  className="rounded-[3mm] bg-sunken p-[3.5mm] text-[8.5pt] leading-snug text-ink-2"
                >
                  <p className="line-clamp-4">« {t.texte} »</p>
                  <footer className="mt-[1.5mm] text-[7.5pt] font-medium text-ink">
                    {t.auteur}
                    {t.contexte ? `, ${t.contexte}` : ""}
                  </footer>
                </blockquote>
              ))}
            </div>
          ) : null}

          {s.offre ? (
            <div className="mt-[5mm] rounded-[3mm] border-2 border-wine-600 px-[5mm] py-[3.5mm]">
              <p className="font-display text-[12pt] font-semibold text-wine-700">
                {s.offre.titre}
              </p>
              {s.offre.description ? (
                <p className="mt-[1mm] text-[8.5pt] text-ink-2">
                  {s.offre.description}
                </p>
              ) : null}
              {s.offre.conditions ? (
                <p className="mt-[1mm] text-[7.5pt] text-ink-3">
                  Conditions : {s.offre.conditions}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-[5mm] rounded-[4mm] bg-aub-900 px-[8mm] py-[6mm] text-white">
            <div className="flex items-center gap-[6mm]">
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-[15pt] leading-tight font-semibold">
                  Parlons de votre logement
                </h3>
                <ol className="mt-[3mm] grid grid-cols-3 gap-[2.5mm] text-[8pt]">
                  {[
                    "Visite gratuite de votre logement",
                    "Proposition et mise en place",
                    "Mise en ligne et premiers voyageurs",
                  ].map((e, i) => (
                    <li
                      key={e}
                      className="rounded-[2mm] border border-white/15 p-[2.5mm] leading-snug"
                    >
                      <span className="num block font-display text-[12pt] font-semibold text-wine-500">
                        {i + 1}
                      </span>
                      {e}
                    </li>
                  ))}
                </ol>
                {lienCta ? (
                  <a
                    href={lienCta}
                    className="mt-[4mm] inline-flex items-center gap-[2mm] rounded-full bg-wine-600 px-[5mm] py-[2mm] text-[10pt] font-semibold text-white no-underline"
                  >
                    <MessageCircle className="h-[4mm] w-[4mm]" />{" "}
                    {s.commercialParams.ctaTexte}
                  </a>
                ) : null}
              </div>
              {qr ? (
                <div className="shrink-0 rounded-[2mm] bg-white p-[2.5mm] text-center">
                  <div
                    className="h-[26mm] w-[26mm] [&>svg]:h-full [&>svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: qr }}
                  />
                  <p className="mt-[1mm] text-[6pt] text-ink-3">
                    Scannez pour nous écrire
                  </p>
                </div>
              ) : null}
            </div>
            <p className="mt-[4mm] flex flex-wrap gap-x-[5mm] text-[8pt] text-aub-200">
              {s.commercialParams.telephone ? (
                <span>Tél. {s.commercialParams.telephone}</span>
              ) : null}
              {s.commercialParams.email ? (
                <span>{s.commercialParams.email}</span>
              ) : null}
              {s.commercial ? (
                <span>Votre contact : {s.commercial.nom}</span>
              ) : null}
              <span className="flex items-center gap-[1mm]">
                <CalendarCheck className="h-[3mm] w-[3mm]" /> Estimation valable{" "}
                {s.commercialParams.validiteJours} jours
              </span>
            </p>
          </div>
          {s.commercialParams.mentionsLegales ? (
            <p className="mt-[3mm] text-[6.5pt] leading-snug text-ink-3">
              {s.commercialParams.mentionsLegales}
            </p>
          ) : null}
        </div>
        <Pied page={total} total={total} />
      </section>
    </>
  );
}

function Indicateur({
  titre,
  valeur,
  note,
}: {
  titre: string;
  valeur: string;
  note?: string;
}) {
  return (
    <div className="rounded-[3mm] border border-line px-[4mm] py-[3mm]">
      <p className="text-[7.5pt] tracking-[0.12em] text-ink-3 uppercase">
        {titre}
      </p>
      <p className="num mt-[1mm] font-display text-[15pt] font-semibold text-aub-900">
        {valeur}
      </p>
      {note ? <p className="text-[6.5pt] text-ink-3">{note}</p> : null}
    </div>
  );
}
