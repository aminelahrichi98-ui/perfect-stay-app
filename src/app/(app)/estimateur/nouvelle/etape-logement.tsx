"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Badge, buttonClass, Input, Select, Spinner, Textarea } from "@/components/ui";
import { envoyerVersStockage } from "@/lib/envoi-client";
import { EQUIPEMENTS, LIBELLES_LOGEMENT, manquantsBien, TYPES_LOGEMENT, type Bien } from "@/lib/estimation/snapshot";
import { preparerPhotos } from "../actions";
import { lirePhotosBien } from "../estimation-actions";
import { ChampNombre } from "../marche/import/[id]/champs";

async function alleger(f: File): Promise<File> {
  const image = await createImageBitmap(f);
  const echelle = Math.min(1, 1800 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * echelle);
  canvas.height = Math.round(image.height * echelle);
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
  if (!blob) throw new Error("photo");
  return new File([blob], f.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

function TroisEtatsCompact({ label, valeur, onChange }: { label: string; valeur: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-1.5 text-sm">
      {label}
      <select className="bg-transparent text-sm" value={valeur === null ? "" : valeur ? "oui" : "non"} onChange={(e) => onChange(e.target.value === "" ? null : e.target.value === "oui")}>
        <option value="">inconnu</option>
        <option value="oui">oui</option>
        <option value="non">non</option>
      </select>
    </label>
  );
}

export function EtapeLogement({ bien, setBien, photoBien, setPhotoBien }: { bien: Bien; setBien: (f: (b: Bien) => Bien) => void; photoBien: string | null; setPhotoBien: (c: string | null) => void }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const entree = useRef<HTMLInputElement>(null);
  const manquants = manquantsBien(bien);
  const maj = <K extends keyof Bien>(k: K, v: Bien[K]) => setBien((b) => ({ ...b, [k]: v }));

  useEffect(() => {
    const absentes = bien.photos.filter((c) => !urls[c]);
    if (!absentes.length) return;
    let actif = true;
    void lirePhotosBien(absentes).then((r) => actif && setUrls((u) => ({ ...u, ...r })));
    return () => {
      actif = false;
    };
  }, [bien.photos, urls]);

  async function ajouterPhotos(fichiers: FileList | null) {
    const liste = Array.from(fichiers ?? []).slice(0, 8 - bien.photos.length);
    if (!liste.length) return;
    setEnvoi(true);
    setErreur("");
    try {
      const legeres = await Promise.all(liste.map(alleger));
      const prep = await preparerPhotos(legeres.map((f) => ({ nom: f.name, taille: f.size })));
      if (prep.erreur || !prep.envois) throw new Error(prep.erreur ?? "Envoi impossible.");
      await Promise.all(prep.envois.map((e, i) => envoyerVersStockage("estimations", e.chemin, e.token, legeres[i])));
      const nouvelles: Record<string, string> = {};
      prep.envois.forEach((e, i) => (nouvelles[e.chemin] = URL.createObjectURL(legeres[i])));
      setUrls((u) => ({ ...u, ...nouvelles }));
      setBien((b) => ({ ...b, photos: [...b.photos, ...prep.envois!.map((e) => e.chemin)] }));
      if (!photoBien) setPhotoBien(prep.envois[0].chemin);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="space-y-5">
      {manquants.length ? <p className="rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn">Informations indispensables manquantes : {manquants.join(", ")}.</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Champ label="Ville *" id="b-ville">
          <Input id="b-ville" className="h-10" value={bien.ville} onChange={(e) => maj("ville", e.target.value)} />
        </Champ>
        <Champ label="Quartier *" id="b-quartier">
          <Input id="b-quartier" className="h-10" value={bien.quartier} onChange={(e) => maj("quartier", e.target.value)} placeholder="ex. Ferme Bretonne" />
        </Champ>
        <Champ label="Résidence / adresse" id="b-adresse">
          <Input id="b-adresse" className="h-10" value={bien.residence} onChange={(e) => maj("residence", e.target.value)} placeholder="Facultatif (non montré au client)" />
        </Champ>
        <Champ label="Type de logement *" id="b-type">
          <Select id="b-type" className="h-10" value={bien.type_logement ?? ""} onChange={(e) => setBien((b) => ({ ...b, type_logement: (e.target.value || null) as Bien["type_logement"], chambres: e.target.value === "studio" ? 0 : b.chambres }))}>
            <option value="">à préciser</option>
            {TYPES_LOGEMENT.map((t) => (
              <option key={t} value={t}>
                {LIBELLES_LOGEMENT[t]}
              </option>
            ))}
          </Select>
        </Champ>
        <ChampNombre id="b-chambres" label="Chambres *" mode="entier" valeur={bien.chambres} disabled={bien.type_logement === "studio"} onChange={(v) => maj("chambres", v)} />
        <ChampNombre id="b-surface" label="Surface (m²)" mode="entier" valeur={bien.surface} onChange={(v) => maj("surface", v)} />
        <ChampNombre id="b-capacite" label="Capacité (voyageurs)" mode="entier" valeur={bien.capacite} onChange={(v) => maj("capacite", v)} />
        <ChampNombre id="b-sdb" label="Salles de bain" mode="entier" valeur={bien.salles_de_bain} onChange={(v) => maj("salles_de_bain", v)} />
        <Champ label="Standing" id="b-standing">
          <Select id="b-standing" className="h-10" value={bien.standing ?? ""} onChange={(e) => maj("standing", (e.target.value || null) as Bien["standing"])}>
            <option value="">non renseigné</option>
            <option value="standard">Standard</option>
            <option value="superieur">Supérieur</option>
            <option value="premium">Premium</option>
          </Select>
        </Champ>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Équipements</p>
        <div className="flex flex-wrap gap-1.5">
          {EQUIPEMENTS.map((e) => {
            const actif = bien.equipements.includes(e.cle);
            return (
              <button key={e.cle} type="button" aria-pressed={actif} onClick={() => maj("equipements", actif ? bien.equipements.filter((x) => x !== e.cle) : [...bien.equipements, e.cle])} className={actif ? "rounded-full bg-wine-600 px-3 py-1 text-xs text-white" : "rounded-full border border-line-strong px-3 py-1 text-xs text-ink-2"}>
                {e.libelle}
              </button>
            );
          })}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <TroisEtatsCompact label="Parking" valeur={bien.parking} onChange={(v) => maj("parking", v)} />
          <TroisEtatsCompact label="Terrasse" valeur={bien.terrasse} onChange={(v) => maj("terrasse", v)} />
          <TroisEtatsCompact label="Piscine" valeur={bien.piscine} onChange={(v) => maj("piscine", v)} />
          <TroisEtatsCompact label="Salle de sport" valeur={bien.salle_sport} onChange={(v) => maj("salle_sport", v)} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Champ label="Ameublement" id="b-meuble">
          <Select id="b-meuble" className="h-10" value={bien.ameublement ?? ""} onChange={(e) => maj("ameublement", (e.target.value || null) as Bien["ameublement"])}>
            <option value="">non renseigné</option>
            <option value="meuble">Meublé</option>
            <option value="partiel">Partiellement meublé</option>
            <option value="non_meuble">Non meublé</option>
          </Select>
        </Champ>
        <Champ label="Exploitation actuelle" id="b-exploit">
          <Select id="b-exploit" className="h-10" value={bien.exploitation ?? ""} onChange={(e) => maj("exploitation", (e.target.value || null) as Bien["exploitation"])}>
            <option value="">non renseigné</option>
            <option value="longue">Location longue durée</option>
            <option value="courte">Location courte durée</option>
            <option value="vacant">Vacant</option>
            <option value="autre">Autre</option>
          </Select>
        </Champ>
        <Champ label="Occupation" id="b-occ">
          <Select id="b-occ" className="h-10" value={bien.occupation ?? ""} onChange={(e) => maj("occupation", (e.target.value || null) as Bien["occupation"])}>
            <option value="">non renseigné</option>
            <option value="occupe">Occupé</option>
            <option value="vacant">Vacant</option>
            <option value="bientot_libre">Bientôt libre</option>
          </Select>
        </Champ>
        <ChampNombre id="b-loyer" label="Loyer longue durée actuel (MAD/mois)" valeur={bien.loyer_longue_duree} onChange={(v) => maj("loyer_longue_duree", v)} />
        <ChampNombre id="b-courte" label="Revenus courte durée actuels (MAD/mois)" valeur={bien.revenus_courte_mensuels} onChange={(v) => maj("revenus_courte_mensuels", v)} />
        <Champ label="Lien de l'annonce actuelle" id="b-lien">
          <Input id="b-lien" className="h-10" value={bien.lien_annonce} onChange={(e) => maj("lien_annonce", e.target.value.trim())} placeholder="https://…" />
        </Champ>
      </div>
      <Champ label="Attentes du propriétaire" id="b-attentes">
        <Textarea id="b-attentes" className="min-h-16 text-sm" value={bien.attentes} onChange={(e) => maj("attentes", e.target.value.slice(0, 1000))} />
      </Champ>

      <div>
        <p className="mb-2 text-sm font-medium">Photos du logement</p>
        <div className="flex flex-wrap gap-2">
          {bien.photos.map((c) => (
            <div key={c} className="relative">
              <button type="button" onClick={() => setPhotoBien(c)} className={photoBien === c ? "block overflow-hidden rounded-lg ring-2 ring-wine-600" : "block overflow-hidden rounded-lg"} aria-label="Utiliser en couverture">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {urls[c] ? <img src={urls[c]} alt="" className="h-20 w-28 object-cover" /> : <span className="grid h-20 w-28 place-items-center bg-sunken"><Spinner /></span>}
              </button>
              {photoBien === c ? <Badge ton="marque" className="absolute bottom-1 left-1">couverture</Badge> : null}
              <button type="button" aria-label="Retirer la photo" className="absolute top-1 right-1 rounded-full bg-surface/90 p-0.5" onClick={() => (setBien((b) => ({ ...b, photos: b.photos.filter((x) => x !== c) })), photoBien === c && setPhotoBien(null))}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {bien.photos.length < 8 ? (
            <button type="button" disabled={envoi} onClick={() => entree.current?.click()} className="grid h-20 w-28 place-items-center rounded-lg border-2 border-dashed border-line-strong text-ink-3">
              {envoi ? <Spinner /> : <ImagePlus className="h-5 w-5" />}
            </button>
          ) : null}
          <input ref={entree} type="file" accept="image/*" multiple hidden onChange={(e) => (void ajouterPhotos(e.target.files), (e.target.value = ""))} />
        </div>
        <p className="mt-1 text-xs text-ink-3">La photo de couverture apparaît en haut du document. Sans photo réelle, aucune image n&apos;est affichée (jamais d&apos;image d&apos;illustration).</p>
        {erreur ? <p role="alert" className="text-sm text-danger">{erreur}</p> : null}
      </div>
      <p className="text-xs text-ink-3">
        <span className={buttonClass("ghost", "sm", "pointer-events-none h-auto px-0")}>Note :</span> ces informations servent à l&apos;estimation. La fiche CRM n&apos;est mise à jour que si vous cliquez sur « Enregistrer dans la fiche CRM ».
      </p>
    </div>
  );
}

function Champ({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[0.82rem] font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
