"use client";

import { ExternalLink, FileText, Lock, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Badge, Notice, Spinner } from "@/components/ui";
import { envoyerVersStockage } from "@/lib/envoi-client";
import { formatDateHeure } from "@/lib/format";
import { formatTaille, TYPES_DOCUMENT, type TypeDocument } from "@/lib/logements";
import { enregistrerDocument, ouvrirDocument, preparerEnvoi, supprimerDocument } from "./actions";

export type DocumentVue = {
  id: string;
  type: string;
  nom: string;
  taille: number;
  horodatage: string;
  reference: string;
  par: string;
};

export function DocumentsLogement({
  logementId,
  documents,
  modifiable,
  voitSensibles,
  modifieSensibles,
  admin,
}: {
  logementId: string;
  documents: DocumentVue[];
  modifiable: boolean;
  voitSensibles: boolean;
  modifieSensibles: boolean;
  admin: boolean;
}) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const entree = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<TypeDocument>("contrat_gestion");
  const [reference, setReference] = useState("");
  const [envoi, setEnvoi] = useState<{ total: number; fait: number } | null>(null);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [aConfirmer, setAConfirmer] = useState<string | null>(null);

  const typesVisibles = TYPES_DOCUMENT.filter((t) => !("sensible" in t && t.sensible) || voitSensibles);
  const typesEnvoi = TYPES_DOCUMENT.filter((t) => !("sensible" in t && t.sensible) || modifieSensibles);
  const photoUniquement = type === "etat_des_lieux";

  async function envoyer(fichiers: FileList | null) {
    if (!fichiers?.length) return;
    const liste = Array.from(fichiers);
    setErreurs([]);
    setEnvoi({ total: liste.length, fait: 0 });
    const problemes: string[] = [];
    for (const f of liste) {
      try {
        const prep = await preparerEnvoi({ logementId, nature: "document", nomFichier: f.name, taille: f.size, typeDocument: type });
        if ("erreur" in prep) throw new Error(prep.erreur);
        await envoyerVersStockage(prep.bucket, prep.chemin, prep.token, f);
        const r = await enregistrerDocument({
          logementId,
          chemin: prep.chemin,
          nomFichier: f.name,
          typeMime: f.type,
          taille: f.size,
          typeDocument: type,
          reference,
        });
        if (r?.erreur) throw new Error(r.erreur);
      } catch (e) {
        problemes.push(`${f.name} : ${e instanceof Error ? e.message : "échec de l'envoi"}`);
      }
      setEnvoi((p) => (p ? { ...p, fait: p.fait + 1 } : p));
    }
    setErreurs(problemes);
    setEnvoi(null);
    setReference("");
    if (entree.current) entree.current.value = "";
    demarrer(() => router.refresh());
  }

  async function ouvrir(id: string) {
    setOccupe(id);
    const r = await ouvrirDocument(id);
    setOccupe(null);
    if (r.url) window.open(r.url, "_blank", "noopener");
    else setErreurs([r.erreur ?? "Le document n'a pas pu être ouvert."]);
  }

  async function retirer(id: string) {
    setOccupe(id);
    const r = await supprimerDocument(id);
    setOccupe(null);
    setAConfirmer(null);
    if (r?.erreur) setErreurs([r.erreur]);
    else demarrer(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      {typesVisibles.map((t) => {
        const liste = documents.filter((d) => d.type === t.value);
        const sensible = "sensible" in t && t.sensible;
        return (
          <div key={t.value}>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              {t.label}
              {sensible ? (
                <Badge ton="attention">
                  <Lock className="h-3 w-3" /> Données personnelles
                </Badge>
              ) : null}
              <span className="num font-normal text-ink-3">{liste.length ? `(${liste.length})` : ""}</span>
            </h4>
            {liste.length ? (
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {liste.map((d) => {
                  const supprimable = modifiable && (d.type !== "fiche_police" || modifieSensibles);
                  return (
                    <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5">
                      <FileText className="h-4 w-4 shrink-0 text-ink-3" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.95rem] font-medium">{d.nom}</span>
                        <span className="num block text-[0.8rem] text-ink-3">
                          Envoyé le {formatDateHeure(d.horodatage)}
                          {d.par ? ` par ${d.par}` : ""} · {formatTaille(d.taille)}
                          {d.reference ? ` · ${d.reference}` : ""}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => ouvrir(d.id)}
                        disabled={occupe === d.id}
                        className="press inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-wine-700 hover:bg-wine-50"
                      >
                        {occupe === d.id ? <Spinner /> : <ExternalLink className="h-4 w-4" />} Ouvrir
                      </button>
                      {supprimable && (d.type !== "etat_des_lieux" || admin) ? (
                        aConfirmer === d.id ? (
                          <span className="flex items-center gap-1">
                            <button type="button" onClick={() => retirer(d.id)} className="press h-9 rounded-lg bg-danger px-3 text-sm font-medium text-white">
                              Confirmer
                            </button>
                            <button type="button" onClick={() => setAConfirmer(null)} className="press h-9 rounded-lg px-3 text-sm text-ink-2 hover:bg-sunken">
                              Annuler
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAConfirmer(d.id)}
                            aria-label={`Supprimer ${d.nom}`}
                            className="press grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-danger-bg hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm text-ink-3">Aucun document.</p>
            )}
          </div>
        );
      })}

      {modifiable ? (
        <div className="space-y-3 rounded-2xl border border-line bg-sunken/50 p-4">
          <p className="text-sm font-medium">Ajouter un document</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm text-ink-2">Type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TypeDocument)}
                className="block h-11 w-full rounded-xl border border-line-strong bg-surface px-3.5 shadow-card focus:border-wine-500 focus:ring-4 focus:ring-wine-500/15 focus:outline-none"
              >
                {typesEnvoi.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-ink-2">Réservation concernée (facultatif)</span>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="ex. séjour du 12 au 15 mars"
                className="block h-11 w-full rounded-xl border border-line-strong bg-surface px-3.5 shadow-card focus:border-wine-500 focus:ring-4 focus:ring-wine-500/15 focus:outline-none"
              />
            </label>
          </div>
          {photoUniquement ? (
            <p className="text-[0.82rem] leading-snug text-ink-2">
              La date et l&apos;heure d&apos;envoi seront <strong>gravées sur la photo</strong> et ne pourront plus être modifiées. Seul un administrateur peut supprimer un état des lieux.
            </p>
          ) : null}
          <input ref={entree} type="file" hidden multiple accept={photoUniquement ? "image/*" : undefined} onChange={(e) => envoyer(e.target.files)} />
          <button
            type="button"
            disabled={!!envoi}
            onClick={() => entree.current?.click()}
            className="press inline-flex h-11 items-center gap-2 rounded-xl bg-wine-600 px-5 font-medium text-white shadow-card hover:bg-wine-700 disabled:opacity-60"
          >
            {envoi ? <Spinner /> : <Upload className="h-4 w-4" />}
            {envoi ? `Envoi ${Math.min(envoi.fait + 1, envoi.total)} sur ${envoi.total}…` : photoUniquement ? "Prendre ou choisir des photos" : "Choisir un fichier"}
          </button>
        </div>
      ) : null}
      {erreurs.length ? (
        <Notice ton="danger">
          {erreurs.map((e) => (
            <span key={e} className="block">
              {e}
            </span>
          ))}
        </Notice>
      ) : null}
    </div>
  );
}
