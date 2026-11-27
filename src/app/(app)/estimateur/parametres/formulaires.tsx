"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Badge, buttonClass, Card, Input, Notice, Select, Spinner, Textarea } from "@/components/ui";
import type { FormulaireParametres } from "@/lib/estimation/parametres";
import { ChampNombre } from "../marche/import/[id]/champs";
import { enregistrerOffre, enregistrerParametres, enregistrerTemoignage, supprimerTemoignage, type Offre, type Temoignage } from "./actions";

const CLES = [
  "taux_plateforme", "tva_plateforme", "taux_commission", "tva_commission", "base_commission", "menage_mode", "menage_plateforme_preleve", "menage_part_revenu", "methode_scenarios", "arrondi_mensuel", "devise",
  "cta_texte", "whatsapp", "message_whatsapp", "lien_rdv", "email_contact", "telephone_contact", "services", "mentions_legales", "validite_jours", "max_comparables", "section_saisonnalite", "section_preuve", "qr_code",
  "fraicheur_recente_jours", "fraicheur_alerte_jours", "standing_obligatoire", "tolerance_capacite", "ia_active", "ia_modele",
] as const;

const pct = (v: number | null) => (v === null ? null : Math.round(v * 10000) / 100);
const frac = (v: number | null) => (v === null ? null : Math.min(0.99, v / 100));

export function FormulaireParametresEstimateur({ initial, modifiable }: { initial: Record<string, unknown>; modifiable: boolean }) {
  const router = useRouter();
  const [p, setP] = useState<FormulaireParametres>(() => {
    const o = Object.fromEntries(CLES.map((k) => [k, initial[k]])) as Record<string, unknown>;
    for (const k of ["taux_plateforme", "tva_plateforme", "taux_commission", "tva_commission"]) o[k] = Number(o[k]);
    o.menage_part_revenu = o.menage_part_revenu === null ? null : Number(o.menage_part_revenu);
    return o as FormulaireParametres;
  });
  const [message, setMessage] = useState<{ ton: "ok" | "danger"; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const maj = <K extends keyof FormulaireParametres>(k: K, v: FormulaireParametres[K]) => setP((x) => ({ ...x, [k]: v }));
  const dis = !modifiable;
  const part = (1 - p.taux_plateforme * (1 + p.tva_plateforme)) * (1 - p.taux_commission * (1 + p.tva_commission));

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        demarrer(async () => {
          const r = await enregistrerParametres(p);
          setMessage(r.erreur ? { ton: "danger", texte: r.erreur } : { ton: "ok", texte: "Paramètres enregistrés. Ils s'appliquent aux nouvelles estimations (les estimations existantes gardent les leurs)." });
          if (!r.erreur) router.refresh();
        });
      }}
    >
      <Card className="space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Paramètres financiers</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <ChampNombre id="p-plat" label="Frais de plateforme" unite="%" valeur={pct(p.taux_plateforme)} disabled={dis} onChange={(v) => maj("taux_plateforme", frac(v) ?? 0)} />
          <ChampNombre id="p-tvap" label="TVA sur ces frais" unite="%" valeur={pct(p.tva_plateforme)} disabled={dis} onChange={(v) => maj("tva_plateforme", frac(v) ?? 0)} />
          <ChampNombre id="p-com" label="Commission Perfect Stay" unite="%" valeur={pct(p.taux_commission)} disabled={dis} onChange={(v) => maj("taux_commission", frac(v) ?? 0)} />
          <ChampNombre id="p-tvac" label="TVA sur la commission" unite="%" valeur={pct(p.tva_commission)} disabled={dis} onChange={(v) => maj("tva_commission", frac(v) ?? 0)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Liste id="p-base" label="Base de la commission" valeur={p.base_commission} disabled={dis} onChange={(v) => maj("base_commission", v as FormulaireParametres["base_commission"])} options={[["apres_plateforme", "Après frais de plateforme"], ["brut", "Sur les revenus bruts"]]} />
          <Liste id="p-meth" label="Scénarios" valeur={p.methode_scenarios} disabled={dis} onChange={(v) => maj("methode_scenarios", v as FormulaireParametres["methode_scenarios"])} options={[["fourchette", "Fourchette bas / haut"], ["percentiles", "Percentiles PriceLabs"]]} />
          <Liste id="p-arr" label="Arrondi des montants mensuels" valeur={String(p.arrondi_mensuel)} disabled={dis} onChange={(v) => maj("arrondi_mensuel", Number(v) as 1 | 10 | 100)} options={[["1", "Au dirham"], ["10", "À la dizaine"], ["100", "À la centaine"]]} />
          <Liste id="p-men" label="Frais de ménage" valeur={p.menage_mode} disabled={dis} onChange={(v) => maj("menage_mode", v as FormulaireParametres["menage_mode"])} options={[["refacture_voyageur", "Payés par les voyageurs"], ["a_charge_proprietaire", "À la charge du propriétaire"], ["inconnu", "Non défini"]]} />
          <ChampNombre id="p-menp" label="Part du ménage dans les revenus (si incluse)" unite="%" valeur={pct(p.menage_part_revenu)} disabled={dis} onChange={(v) => maj("menage_part_revenu", frac(v))} />
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" disabled={dis} checked={p.menage_plateforme_preleve} onChange={(e) => maj("menage_plateforme_preleve", e.target.checked)} /> La plateforme prélève des frais sur le ménage
          </label>
        </div>
        <p className="text-xs text-ink-3">Avec ces valeurs, le propriétaire conserve {(part * 100).toFixed(1).replace(".", ",")} % des revenus bruts (avant charges). La mention « ménage sans impact » n&apos;apparaît que si le ménage est payé par les voyageurs, exclu des revenus et sans prélèvement de la plateforme.</p>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Paramètres commerciaux</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Texte id="p-cta" label="Texte du bouton d'action" valeur={p.cta_texte} disabled={dis} onChange={(v) => maj("cta_texte", v)} />
          <Texte id="p-wa" label="Numéro WhatsApp de l'entreprise" valeur={p.whatsapp} disabled={dis} onChange={(v) => maj("whatsapp", v)} placeholder="+212 6 …" />
          <Texte id="p-rdv" label="Lien de prise de rendez-vous (https, facultatif)" valeur={p.lien_rdv} disabled={dis} onChange={(v) => maj("lien_rdv", v)} />
          <Texte id="p-tel" label="Téléphone affiché" valeur={p.telephone_contact} disabled={dis} onChange={(v) => maj("telephone_contact", v)} />
          <Texte id="p-mail" label="E-mail affiché" valeur={p.email_contact} disabled={dis} onChange={(v) => maj("email_contact", v)} />
        </div>
        <div className="space-y-1">
          <label htmlFor="p-msg" className="block text-[0.82rem] font-medium">Message WhatsApp prérempli</label>
          <Textarea id="p-msg" className="min-h-16 text-sm" disabled={dis} value={p.message_whatsapp} onChange={(e) => maj("message_whatsapp", e.target.value)} />
        </div>
        <div className="space-y-1">
          <label htmlFor="p-serv" className="block text-[0.82rem] font-medium">Services présentés (un par ligne, 6 au maximum)</label>
          <Textarea id="p-serv" className="min-h-28 text-sm" disabled={dis} value={p.services.join("\n")} onChange={(e) => maj("services", e.target.value.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 8))} />
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Document</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <ChampNombre id="p-val" label="Validité (jours)" mode="entier" valeur={p.validite_jours} disabled={dis} onChange={(v) => maj("validite_jours", v ?? 30)} />
          <ChampNombre id="p-max" label="Annonces comparables (2 à 4)" mode="entier" valeur={p.max_comparables} disabled={dis} onChange={(v) => maj("max_comparables", Math.min(4, Math.max(2, v ?? 4)))} />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <Case label="Page « preuves de marché »" valeur={p.section_preuve} disabled={dis} onChange={(v) => maj("section_preuve", v)} />
          <Case label="Saisonnalité (si 12 mois fiables)" valeur={p.section_saisonnalite} disabled={dis} onChange={(v) => maj("section_saisonnalite", v)} />
          <Case label="QR code vers WhatsApp" valeur={p.qr_code} disabled={dis} onChange={(v) => maj("qr_code", v)} />
        </div>
        <div className="space-y-1">
          <label htmlFor="p-leg" className="block text-[0.82rem] font-medium">Mentions légales</label>
          <Textarea id="p-leg" className="min-h-20 text-sm" disabled={dis} value={p.mentions_legales} onChange={(e) => maj("mentions_legales", e.target.value)} />
        </div>
        <p className="text-xs text-ink-3">Logo et couleurs : ceux de la marque Perfect Stay (identiques au reste de l&apos;application).</p>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Données et IA</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <ChampNombre id="p-fr" label="Données récentes jusqu'à (jours)" mode="entier" valeur={p.fraicheur_recente_jours} disabled={dis} onChange={(v) => maj("fraicheur_recente_jours", v ?? 30)} />
          <ChampNombre id="p-fa" label="À actualiser après (jours)" mode="entier" valeur={p.fraicheur_alerte_jours} disabled={dis} onChange={(v) => maj("fraicheur_alerte_jours", v ?? 90)} />
          <ChampNombre id="p-cap" label="Tolérance de capacité (voyageurs)" mode="entier" valeur={p.tolerance_capacite} disabled={dis} onChange={(v) => maj("tolerance_capacite", v ?? 1)} />
          <Texte id="p-mod" label="Modèle d'IA" valeur={p.ia_modele} disabled={dis} onChange={(v) => maj("ia_modele", v.trim())} />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <Case label="Standing obligatoire pour la correspondance" valeur={p.standing_obligatoire} disabled={dis} onChange={(v) => maj("standing_obligatoire", v)} />
          <Case label="Extraction automatique par IA" valeur={p.ia_active} disabled={dis} onChange={(v) => maj("ia_active", v)} />
        </div>
        <p className="text-xs text-ink-3">Quartiers et alias : Base marché → Quartiers et alias. Sources autorisées : PriceLabs (captures ou saisie manuelle).</p>
      </Card>

      {message ? <Notice ton={message.ton}>{message.texte}</Notice> : null}
      {modifiable ? (
        <button disabled={enCours} className={buttonClass("primary", "md")}>
          {enCours ? <Spinner /> : <Save className="h-4 w-4" />} Enregistrer les paramètres
        </button>
      ) : null}
    </form>
  );
}

function Liste({ id, label, valeur, onChange, options, disabled }: { id: string; label: string; valeur: string; onChange: (v: string) => void; options: [string, string][]; disabled?: boolean }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[0.82rem] font-medium">{label}</label>
      <Select id={id} className="h-10" value={valeur} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </Select>
    </div>
  );
}

function Texte({ id, label, valeur, onChange, disabled, placeholder }: { id: string; label: string; valeur: string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[0.82rem] font-medium">{label}</label>
      <Input id={id} className="h-10" value={valeur} disabled={disabled} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Case({ label, valeur, onChange, disabled }: { label: string; valeur: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" disabled={disabled} checked={valeur} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}

const offreVide = (): Offre => ({ id: null, titre: "", description: "", duree_mois: null, conditions: "", debut: null, fin: null, actif: false });

export function ListeOffres({ offres, modifiable }: { offres: Offre[]; modifiable: boolean }) {
  const [edition, setEdition] = useState<Offre | null>(null);
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Offres commerciales</h2>
        {modifiable ? (
          <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setEdition(offreVide())}>
            <Plus className="h-4 w-4" /> Nouvelle offre
          </button>
        ) : null}
      </div>
      <p className="text-xs text-ink-3">Une offre n&apos;apparaît dans un document que si elle est active, dans ses dates, et choisie pour l&apos;estimation. Aucune urgence artificielle n&apos;est ajoutée.</p>
      <ul className="divide-y divide-line">
        {offres.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{o.titre}</span>
              <span className="block text-xs text-ink-3">{[o.description, o.conditions && `Conditions : ${o.conditions}`, o.debut && `du ${o.debut}`, o.fin && `au ${o.fin}`].filter(Boolean).join(" · ")}</span>
            </span>
            {o.actif ? <Badge ton="ok">active</Badge> : <Badge>inactive</Badge>}
            {modifiable ? (
              <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setEdition({ ...o, duree_mois: o.duree_mois })}>
                Modifier
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {edition ? <EditionOffre offre={edition} fermer={() => setEdition(null)} /> : null}
    </Card>
  );
}

function EditionOffre({ offre, fermer }: { offre: Offre; fermer: () => void }) {
  const router = useRouter();
  const [o, setO] = useState(offre);
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();
  return (
    <form
      className="grid gap-2 rounded-xl border border-line p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        demarrer(async () => {
          const r = await enregistrerOffre(o);
          if (r.erreur) return setErreur(r.erreur);
          fermer();
          router.refresh();
        });
      }}
    >
      <Input aria-label="Titre" placeholder="Titre" value={o.titre} onChange={(e) => setO({ ...o, titre: e.target.value })} className="sm:col-span-2" />
      <Textarea aria-label="Description" placeholder="Description" className="min-h-14 text-sm sm:col-span-2" value={o.description} onChange={(e) => setO({ ...o, description: e.target.value })} />
      <Textarea aria-label="Conditions" placeholder="Conditions (obligatoires pour activer)" className="min-h-14 text-sm sm:col-span-2" value={o.conditions} onChange={(e) => setO({ ...o, conditions: e.target.value })} />
      <ChampNombre id="o-duree" label="Durée (mois)" mode="entier" valeur={o.duree_mois} onChange={(v) => setO({ ...o, duree_mois: v })} />
      <div className="grid grid-cols-2 gap-2">
        <Input aria-label="Début" type="date" className="h-10 self-end" value={o.debut ?? ""} onChange={(e) => setO({ ...o, debut: e.target.value || null })} />
        <Input aria-label="Fin" type="date" className="h-10 self-end" value={o.fin ?? ""} onChange={(e) => setO({ ...o, fin: e.target.value || null })} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={o.actif} onChange={(e) => setO({ ...o, actif: e.target.checked })} /> Offre active
      </label>
      {erreur ? <p role="alert" className="text-sm text-danger sm:col-span-2">{erreur}</p> : null}
      <div className="flex gap-2 sm:col-span-2">
        <button disabled={enCours} className={buttonClass("primary", "sm")}>Enregistrer</button>
        <button type="button" className={buttonClass("ghost", "sm")} onClick={fermer}>Annuler</button>
      </div>
    </form>
  );
}

const temoignageVide = (): Temoignage => ({ id: null, auteur: "", contexte: "", texte: "", verifie: false, actif: true });

export function ListeTemoignages({ temoignages, modifiable }: { temoignages: Temoignage[]; modifiable: boolean }) {
  const router = useRouter();
  const [edition, setEdition] = useState<Temoignage | null>(null);
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Témoignages</h2>
        {modifiable ? (
          <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setEdition(temoignageVide())}>
            <Plus className="h-4 w-4" /> Nouveau témoignage
          </button>
        ) : null}
      </div>
      <p className="text-xs text-ink-3">Uniquement de vrais propriétaires, avec leur accord. Seuls les témoignages cochés « vérifié » peuvent apparaître dans un document.</p>
      <ul className="divide-y divide-line">
        {temoignages.map((t) => (
          <li key={t.id} className="flex flex-wrap items-start gap-2 py-2.5 text-sm">
            <span className="min-w-0 flex-1">
              « {t.texte} » <span className="text-ink-3">— {t.auteur}{t.contexte ? `, ${t.contexte}` : ""}</span>
            </span>
            {t.verifie ? <Badge ton="ok">vérifié</Badge> : <Badge ton="attention">non vérifié</Badge>}
            {!t.actif ? <Badge>masqué</Badge> : null}
            {modifiable ? (
              <>
                <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setEdition(t)}>Modifier</button>
                <button type="button" aria-label="Supprimer" className={buttonClass("ghost", "sm")} onClick={() => window.confirm("Supprimer ce témoignage ?") && demarrer(async () => { const r = await supprimerTemoignage(t.id!); setErreur(r.erreur ?? ""); router.refresh(); })}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            ) : null}
          </li>
        ))}
      </ul>
      {!temoignages.length ? <p className="text-sm text-ink-3">Aucun témoignage.</p> : null}
      {edition ? (
        <form
          className="grid gap-2 rounded-xl border border-line p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            demarrer(async () => {
              const r = await enregistrerTemoignage(edition);
              if (r.erreur) return setErreur(r.erreur);
              setEdition(null);
              router.refresh();
            });
          }}
        >
          <Input aria-label="Auteur" placeholder="Prénom et initiale (ex. Karim B.)" value={edition.auteur} onChange={(e) => setEdition({ ...edition, auteur: e.target.value })} />
          <Input aria-label="Contexte" placeholder="Contexte (ex. propriétaire d'un 2 chambres à Gauthier)" value={edition.contexte} onChange={(e) => setEdition({ ...edition, contexte: e.target.value })} />
          <Textarea aria-label="Texte" placeholder="Témoignage exact" className="min-h-16 text-sm sm:col-span-2" value={edition.texte} onChange={(e) => setEdition({ ...edition, texte: e.target.value })} />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={edition.verifie} onChange={(e) => setEdition({ ...edition, verifie: e.target.checked })} /> Vérifié : propos réels, accord écrit du propriétaire, faits exacts
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={edition.actif} onChange={(e) => setEdition({ ...edition, actif: e.target.checked })} /> Actif
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button disabled={enCours} className={buttonClass("primary", "sm")}>Enregistrer</button>
            <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setEdition(null)}>Annuler</button>
          </div>
        </form>
      ) : null}
      {erreur ? <p role="alert" className="text-sm text-danger">{erreur}</p> : null}
    </Card>
  );
}
