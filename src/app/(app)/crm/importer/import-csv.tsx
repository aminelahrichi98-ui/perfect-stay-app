"use client";

import { FileUp } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { buttonClass, Notice, Select, Spinner } from "@/components/ui";
import { analyserCsv, deviner, type ChampLead } from "@/lib/csv";
import { importerLeads, type LigneLead } from "../actions";

const CHAMPS: { value: ChampLead; label: string }[] = [
  { value: "", label: "Ignorer cette colonne" },
  { value: "nom", label: "Nom" },
  { value: "telephone", label: "Téléphone" },
  { value: "email", label: "E-mail" },
  { value: "ville", label: "Ville" },
  { value: "type_bien", label: "Type de bien" },
  { value: "notes", label: "Notes" },
];

export function ImportCsv() {
  const entree = useRef<HTMLInputElement>(null);
  const [enCours, demarrer] = useTransition();
  const [nomFichier, setNomFichier] = useState("");
  const [lignes, setLignes] = useState<string[][] | null>(null);
  const [champs, setChamps] = useState<ChampLead[]>([]);
  const [erreur, setErreur] = useState("");
  const [bilan, setBilan] = useState<{ crees: number; ignores: number } | null>(null);

  async function lire(f: File | undefined) {
    if (!f) return;
    setErreur("");
    setBilan(null);
    const analyse = analyserCsv(await f.text());
    if (analyse.length < 2) {
      setErreur("Ce fichier ne contient pas de données : il faut une ligne d'en-têtes puis au moins un lead.");
      return;
    }
    setNomFichier(f.name);
    setLignes(analyse);
    setChamps(deviner(analyse[0]));
  }

  const donnees: LigneLead[] = (lignes ?? []).slice(1).map((l) => {
    const v: LigneLead = { nom: "", telephone: "", email: "", ville: "", type_bien: "", notes: "" };
    champs.forEach((c, i) => {
      if (c && l[i]) v[c] = v[c] ? `${v[c]}\n${l[i]}` : l[i];
    });
    return v;
  });
  const utilisables = donnees.filter((d) => d.nom || d.telephone || d.email).length;

  function importer() {
    setErreur("");
    if (!champs.includes("nom") && !champs.includes("telephone") && !champs.includes("email")) {
      setErreur("Indiquez au moins la colonne du nom, du téléphone ou de l'e-mail.");
      return;
    }
    demarrer(async () => {
      const r = await importerLeads(donnees);
      if (r?.erreur) setErreur(r.erreur);
      else setBilan({ crees: r?.crees ?? 0, ignores: r?.ignores ?? 0 });
    });
  }

  if (bilan) {
    return (
      <div className="space-y-4">
        <Notice ton="ok">
          {bilan.crees} lead{bilan.crees > 1 ? "s" : ""} importé{bilan.crees > 1 ? "s" : ""}
          {bilan.ignores ? `, ${bilan.ignores} ignoré${bilan.ignores > 1 ? "s" : ""} (déjà présents ou vides)` : ""}.
        </Notice>
        <Link href="/crm" className={buttonClass("primary", "md")}>
          Voir le pipeline
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <input ref={entree} type="file" accept=".csv,text/csv,text/plain" hidden onChange={(e) => lire(e.target.files?.[0])} />
      <button type="button" onClick={() => entree.current?.click()} className="press inline-flex h-12 items-center gap-2 rounded-xl border border-dashed border-line-strong px-5 font-medium text-ink-2 hover:border-wine-500 hover:text-wine-700">
        <FileUp className="h-5 w-5" /> {nomFichier || "Choisir un fichier CSV"}
      </button>

      {lignes ? (
        <>
          <p className="text-sm text-ink-2">
            <strong>{lignes.length - 1}</strong> ligne{lignes.length > 2 ? "s" : ""} trouvée{lignes.length > 2 ? "s" : ""}. Vérifiez à quoi correspond chaque colonne :
          </p>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b border-line bg-sunken/60 text-left">
                  {lignes[0].map((e, i) => (
                    <th key={i} className="min-w-40 px-3 py-2.5 align-top">
                      <span className="mb-1.5 block truncate font-medium">{e || `Colonne ${i + 1}`}</span>
                      <Select aria-label={`Champ pour la colonne ${e || i + 1}`} value={champs[i] ?? ""} onChange={(ev) => setChamps((c) => c.map((x, k) => (k === i ? (ev.target.value as ChampLead) : x)))} className="h-10 text-sm font-normal">
                        {CHAMPS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </Select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lignes.slice(1, 6).map((l, r) => (
                  <tr key={r}>
                    {lignes[0].map((_, i) => (
                      <td key={i} className="max-w-56 truncate px-3 py-2 text-ink-2">
                        {l[i] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lignes.length > 6 ? <p className="text-sm text-ink-3">Aperçu des 5 premières lignes.</p> : null}
          {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
          <button type="button" onClick={importer} disabled={enCours || !utilisables} aria-busy={enCours} className={buttonClass("primary", "md", "w-full sm:w-auto")}>
            {enCours ? <Spinner /> : null} Importer {utilisables} lead{utilisables > 1 ? "s" : ""}
          </button>
        </>
      ) : erreur ? (
        <Notice ton="danger">{erreur}</Notice>
      ) : null}
    </div>
  );
}
