import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MapPin, Pencil, Phone } from "lucide-react";
import { SecretCopiable } from "@/components/secret-copiable";
import { Badge, buttonClass, Card, Notice } from "@/components/ui";
import { exigerAcces, peutModifier, peutVoir } from "@/lib/auth";
import { calculerVersement } from "@/lib/compta";
import { formatDateHeure, formatMad } from "@/lib/format";
import { libelleStatut, libelleType, PLATEFORMES, ROLES_CONTACT } from "@/lib/logements";
import { lienMaps, urlCarte } from "@/lib/maps";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_PHOTOS, urlsLecture } from "@/lib/stockage";
import { DocumentsLogement } from "../documents-logement";
import { PhotosLogement } from "../photos-logement";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("logements").select("nom").eq("id", id).maybeSingle();
  return { title: data?.nom ?? "Logement" };
}

function Bloc({ titre, children, className = "", delai = 0 }: { titre: string; children: React.ReactNode; className?: string; delai?: number }) {
  return (
    <Card className={`enter p-5 ${className}`} style={{ "--i": delai } as React.CSSProperties}>
      <h2 className="mb-3 font-display text-base font-semibold tracking-tight">{titre}</h2>
      {children}
    </Card>
  );
}

function Ligne({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

export default async function PageLogement({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cree?: string; modifie?: string }>;
}) {
  const u = await exigerAcces("logements");
  const { id } = await params;
  const { cree, modifie } = await searchParams;
  const supabase = await createClient();

  const [{ data: l }, { data: ical }, { data: contacts }, { data: liens }, { data: photos }, { data: docs }] = await Promise.all([
    supabase.from("logements").select("*").eq("id", id).maybeSingle(),
    supabase.from("logement_ical").select("plateforme, url, derniere_sync, derniere_erreur").eq("logement_id", id),
    supabase.from("logement_contacts").select("id, role, nom, telephone").eq("logement_id", id),
    supabase.from("logement_proprietaires").select("user_id").eq("logement_id", id),
    supabase.from("logement_photos").select("id, chemin, chemin_vignette, ordre").eq("logement_id", id).order("ordre"),
    supabase.from("documents").select("id, type, nom, taille, horodatage, reference, televerse_par").eq("logement_id", id).order("horodatage", { ascending: false }),
  ]);
  if (!l) notFound();

  const idsProfils = [...new Set([...(liens ?? []).map((x) => x.user_id), ...(docs ?? []).map((d) => d.televerse_par).filter(Boolean)])] as string[];
  const { data: profils } = idsProfils.length ? await supabase.from("profiles").select("id, prenom, nom").in("id", idsProfils) : { data: [] };
  const nomDe = new Map((profils ?? []).map((p) => [p.id, `${p.prenom} ${p.nom}`.trim()]));
  const proprietaires = (liens ?? []).map((x) => nomDe.get(x.user_id)).filter(Boolean) as string[];

  const chemins = (photos ?? []).flatMap((p) => [p.chemin, p.chemin_vignette]);
  const urls = await urlsLecture(BUCKET_PHOTOS, chemins);
  const photosVue = (photos ?? []).map((p) => ({ id: p.id, url: urls.get(p.chemin) ?? "", vignette: urls.get(p.chemin_vignette) ?? "" })).filter((p) => p.url);

  const modifiable = peutModifier(u, "logements");
  const st = libelleStatut(l.statut);
  const carte = urlCarte({ mapsUrl: l.maps_url, adresse: l.adresse, ville: l.ville });
  const lien = lienMaps({ mapsUrl: l.maps_url, adresse: l.adresse, ville: l.ville });
  const exemple = calculerVersement({ montantRecu: 5000, fraisMenage: Number(l.frais_menage), tauxCommission: Number(l.taux_commission) });
  const tauxTexte = String(Number(l.taux_commission)).replace(".", ",");
  const aAcces = l.code_acces || l.wifi_nom || l.wifi_mot_de_passe || l.equipements || l.notes;

  return (
    <>
      <Link href="/logements" className="press mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Logements
      </Link>

      {cree || modifie ? (
        <div className="mb-4">
          <Notice ton="ok">{cree ? "Logement créé. Ajoutez maintenant ses photos et ses documents." : "Modifications enregistrées."}</Notice>
        </div>
      ) : null}

      <header className="enter mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {st ? <Badge ton={st.ton}>{st.label}</Badge> : null}
            <Badge>{libelleType(l.type)}</Badge>
            {l.capacite ? <Badge>{l.capacite} voyageur{l.capacite > 1 ? "s" : ""}</Badge> : null}
          </div>
          <h1 className="font-display text-[1.9rem] leading-tight font-semibold tracking-tight text-balance md:text-4xl">{l.nom}</h1>
          {l.ville || l.adresse ? (
            <p className="mt-1 flex items-start gap-1.5 text-ink-2">
              <MapPin className="mt-1 h-4 w-4 shrink-0" />
              <span>{[l.adresse, l.ville].filter(Boolean).join(", ")}</span>
            </p>
          ) : null}
        </div>
        {modifiable ? (
          <Link href={`/logements/${id}/modifier`} className={buttonClass("secondary")}>
            <Pencil className="h-4 w-4" /> Modifier
          </Link>
        ) : null}
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Bloc titre="Photos" delai={1}>
            <PhotosLogement logementId={id} photos={photosVue} modifiable={modifiable} />
          </Bloc>

          <Bloc titre="Documents" delai={2}>
            <DocumentsLogement
              logementId={id}
              modifiable={modifiable}
              voitSensibles={peutVoir(u, "documents_sensibles")}
              modifieSensibles={peutModifier(u, "documents_sensibles")}
              admin={u.admin}
              documents={(docs ?? []).map((d) => ({
                id: d.id,
                type: d.type,
                nom: d.nom,
                taille: Number(d.taille),
                horodatage: d.horodatage,
                reference: d.reference,
                par: d.televerse_par ? (nomDe.get(d.televerse_par) ?? "") : "",
              }))}
            />
          </Bloc>

          {aAcces ? (
            <Bloc titre="Accès et équipements" delai={3}>
              <dl className="divide-y divide-line">
                {l.code_acces ? (
                  <Ligne label="Code d'accès">
                    <SecretCopiable valeur={l.code_acces} libelle="le code d'accès" />
                  </Ligne>
                ) : null}
                {l.wifi_nom ? <Ligne label="Wifi">{l.wifi_nom}</Ligne> : null}
                {l.wifi_mot_de_passe ? (
                  <Ligne label="Mot de passe wifi">
                    <SecretCopiable valeur={l.wifi_mot_de_passe} libelle="le mot de passe du wifi" />
                  </Ligne>
                ) : null}
              </dl>
              {l.equipements ? (
                <div className="mt-3">
                  <p className="text-sm text-ink-2">Équipements</p>
                  <p className="mt-0.5 whitespace-pre-line text-pretty">{l.equipements}</p>
                </div>
              ) : null}
              {l.notes ? (
                <div className="mt-3">
                  <p className="text-sm text-ink-2">Notes internes</p>
                  <p className="mt-0.5 whitespace-pre-line text-pretty">{l.notes}</p>
                </div>
              ) : null}
            </Bloc>
          ) : null}
        </div>

        <div className="space-y-4">
          <Bloc titre="Tarifs et commission" delai={1}>
            <dl className="divide-y divide-line">
              <Ligne label="Frais de ménage">
                <span className="num font-medium">{formatMad(Number(l.frais_menage))}</span>
              </Ligne>
              <Ligne label="Commission Perfect Stay">
                <span className="num font-medium">{tauxTexte} %</span>
              </Ligne>
            </dl>
            <div className="mt-3 rounded-xl bg-sunken/70 p-3 text-[0.82rem] leading-relaxed text-ink-2">
              <p className="font-medium text-ink">Pour {formatMad(5000)} reçus :</p>
              <p className="num">Propriétaire : {formatMad(exemple.revenuProprietaire)}</p>
              <p className="num">Perfect Stay : {formatMad(exemple.encaisseParPerfectStay)} (ménage + commission)</p>
            </div>
          </Bloc>

          {carte ? (
            <Bloc titre="Localisation" delai={2} className="overflow-hidden">
              <div className="-mx-5 mb-3 aspect-[4/3] bg-sunken">
                <iframe src={carte} title={`Carte de ${l.nom}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-full w-full border-0" />
              </div>
              {lien ? (
                <a href={lien} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm", "w-full")}>
                  <ExternalLink className="h-4 w-4" /> Ouvrir dans Google Maps
                </a>
              ) : null}
            </Bloc>
          ) : null}

          <Bloc titre="Propriétaire" delai={3}>
            {proprietaires.length || l.proprietaire_nom ? (
              <ul className="space-y-1">
                {proprietaires.map((n) => (
                  <li key={n} className="flex items-center gap-2">
                    {n} <Badge ton="ok">Compte actif</Badge>
                  </li>
                ))}
                {l.proprietaire_nom ? <li className="text-ink-2">{l.proprietaire_nom} <span className="text-ink-3">(sans compte)</span></li> : null}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Aucun propriétaire renseigné.</p>
            )}
          </Bloc>

          <Bloc titre="Contacts sur place" delai={4}>
            {contacts?.length ? (
              <ul className="divide-y divide-line">
                {contacts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{c.nom || "—"}</span>
                      <span className="block text-[0.8rem] text-ink-3">{ROLES_CONTACT.find((r) => r.value === c.role)?.label}</span>
                    </span>
                    {c.telephone ? (
                      <a href={`tel:${c.telephone.replace(/\s/g, "")}`} className="press inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-wine-700 hover:bg-wine-50">
                        <Phone className="h-4 w-4" />
                        <span className="num">{c.telephone}</span>
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Aucun contact renseigné.</p>
            )}
          </Bloc>

          <Bloc titre="Calendriers iCal" delai={5}>
            {ical?.length ? (
              <ul className="space-y-2">
                {ical.map((c) => (
                  <li key={c.url} className="flex items-center justify-between gap-2">
                    <span className="font-medium">{(PLATEFORMES as readonly string[]).includes(c.plateforme) ? c.plateforme : "Autre"}</span>
                    <span className="num text-[0.8rem] text-ink-3">
                      {c.derniere_sync ? `Synchronisé le ${formatDateHeure(c.derniere_sync)}` : "Pas encore synchronisé"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Aucun lien de calendrier. Ajoutez-le pour préparer la synchronisation (phase 3).</p>
            )}
          </Bloc>
        </div>
      </div>
    </>
  );
}
