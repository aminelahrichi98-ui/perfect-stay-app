"use client";

import { Download, FilePlus2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Notice, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { emettreFactureLogement, genererMois, genererRapportLogement, regenererPdf, urlDocument, type ResultatDocuments } from "../actions";

const BOUTON =
  "press inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-surface px-3.5 text-sm font-medium shadow-card hover:bg-sunken disabled:opacity-60";

/** Un bouton qui lance une action serveur et affiche le résultat dans la page. */
export function BoutonAction({
  libelle,
  icone = "genere",
  action,
  principal,
  onResultat,
}: {
  libelle: string;
  icone?: "genere" | "relance";
  action: () => Promise<ResultatDocuments>;
  principal?: boolean;
  onResultat?: (r: ResultatDocuments) => void;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const Icone = icone === "relance" ? RefreshCw : FilePlus2;
  return (
    <button
      type="button"
      disabled={enCours}
      aria-busy={enCours}
      onClick={() =>
        demarrer(async () => {
          const r = await action();
          onResultat?.(r);
          router.refresh();
        })
      }
      className={cn(BOUTON, principal && "border-transparent bg-wine-600 text-white shadow-card hover:bg-wine-700")}
    >
      {enCours ? <Spinner /> : <Icone className="h-4 w-4" />} {libelle}
    </button>
  );
}

export function BoutonTelecharger({ type, id, libelle = "Télécharger" }: { type: "facture" | "rapport"; id: string; libelle?: string }) {
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string>();
  async function ouvrir() {
    setOccupe(true);
    setErreur(undefined);
    const r = await urlDocument(type, id);
    setOccupe(false);
    if (r.url) window.open(r.url, "_blank", "noopener");
    else setErreur(r.erreur);
  }
  return (
    <span className="inline-flex flex-col">
      <button type="button" onClick={ouvrir} disabled={occupe} className={BOUTON}>
        {occupe ? <Spinner /> : <Download className="h-4 w-4" />} {libelle}
      </button>
      {erreur ? <span className="mt-1 text-[0.8rem] text-danger">{erreur}</span> : null}
    </span>
  );
}

/** Messages et boutons d'une ligne de logement. */
export function ActionsLogement({
  logementId,
  mois,
  rapportId,
  facture,
}: {
  logementId: string;
  mois: string;
  rapportId: string | null;
  facture: { id: string; avecPdf: boolean } | null;
}) {
  const [retour, setRetour] = useState<ResultatDocuments>();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <BoutonAction
          libelle={rapportId ? "Régénérer le rapport" : "Générer le rapport"}
          icone={rapportId ? "relance" : "genere"}
          action={() => genererRapportLogement(logementId, mois)}
          onResultat={setRetour}
        />
        {rapportId ? <BoutonTelecharger type="rapport" id={rapportId} libelle="Rapport PDF" /> : null}
        {facture ? (
          <>
            {facture.avecPdf ? <BoutonTelecharger type="facture" id={facture.id} libelle="Facture PDF" /> : null}
            {!facture.avecPdf ? <BoutonAction libelle="Régénérer le PDF" icone="relance" action={() => regenererPdf(facture.id)} onResultat={setRetour} /> : null}
          </>
        ) : (
          <BoutonAction libelle="Émettre la facture" action={() => emettreFactureLogement(logementId, mois)} onResultat={setRetour} />
        )}
      </div>
      {retour?.erreur ? <Notice ton="danger">{retour.erreur}</Notice> : retour?.message ? <Notice ton="ok">{retour.message}</Notice> : null}
    </div>
  );
}

export function BoutonTout({ mois }: { mois: string }) {
  const [retour, setRetour] = useState<ResultatDocuments>();
  return (
    <div className="space-y-2">
      <BoutonAction libelle="Générer tous les documents du mois" action={() => genererMois(mois)} principal onResultat={setRetour} />
      {retour?.erreur ? <Notice ton="danger">{retour.erreur}</Notice> : retour?.message ? <Notice ton="ok">{retour.message}</Notice> : null}
    </div>
  );
}
