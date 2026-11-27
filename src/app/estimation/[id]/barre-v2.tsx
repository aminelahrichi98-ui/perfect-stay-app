"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Archive, ArrowLeft, CheckCircle2, Copy, FilePlus2, MessageCircle, Pencil, Printer, Send, UserRound } from "lucide-react";
import { Badge, buttonClass, Spinner } from "@/components/ui";
import { libelleStatut, tonStatut } from "@/lib/estimation/statuts";
import { archiverEstimation, marquerEnvoyee, validerEstimation } from "@/app/(app)/estimateur/estimation-actions";

/** Barre d'outils (jamais imprimée) : statut, impression, partage, et actions explicites. */
export function BarreV2({ id, statut, leadId, lienWhatsappProprietaire, modifiable }: { id: string; statut: string; leadId: string | null; lienWhatsappProprietaire: string; modifiable: boolean }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const ajuster = () => document.documentElement.style.setProperty("--zoom-feuille", String(Math.min(1, (window.innerWidth - 32) / 794)));
    ajuster();
    window.addEventListener("resize", ajuster);
    return () => window.removeEventListener("resize", ajuster);
  }, []);

  const lancer = (f: () => Promise<{ erreur?: string }>, confirmation?: string) => {
    if (confirmation && !window.confirm(confirmation)) return;
    demarrer(async () => {
      const r = await f();
      setErreur(r.erreur ?? "");
      if (!r.erreur) router.refresh();
    });
  };
  const brouillon = statut === "brouillon" || statut === "a_valider";

  return (
    <div className="sticky top-0 z-10 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center gap-2">
        <Link href="/estimateur/historique" aria-label="Retour à l'historique" className={buttonClass("ghost", "sm")}>
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Historique</span>
        </Link>
        <Badge ton={tonStatut(statut)}>{libelleStatut(statut)}</Badge>
        {enCours ? <Spinner /> : null}
        <div className="ml-auto flex flex-wrap gap-2">
          {leadId ? (
            <Link href={`/crm/${leadId}`} className={buttonClass("ghost", "sm")}>
              <UserRound className="h-4 w-4" /> Fiche CRM
            </Link>
          ) : null}
          {modifiable && brouillon ? (
            <>
              <Link href={`/estimateur/nouvelle?brouillon=${id}`} className={buttonClass("secondary", "sm")}>
                <Pencil className="h-4 w-4" /> Modifier
              </Link>
              <button type="button" disabled={enCours} className={buttonClass("primary", "sm")} onClick={() => lancer(() => validerEstimation(id), "Valider cette estimation ? Ses chiffres seront figés.")}>
                <CheckCircle2 className="h-4 w-4" /> Valider
              </button>
            </>
          ) : null}
          {!brouillon ? (
            <>
              <button type="button" onClick={() => window.print()} className={buttonClass(statut === "validee" ? "secondary" : "primary", "sm")}>
                <Printer className="h-4 w-4" /> Télécharger / Imprimer
              </button>
              {lienWhatsappProprietaire ? (
                <a href={lienWhatsappProprietaire} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm")}>
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              ) : null}
            </>
          ) : null}
          {modifiable && statut === "validee" ? (
            <button type="button" disabled={enCours} className={buttonClass("primary", "sm")} onClick={() => lancer(() => marquerEnvoyee(id, "manuel"), "Confirmez-vous avoir envoyé ce document au propriétaire ?")}>
              <Send className="h-4 w-4" /> Marquer comme envoyée
            </button>
          ) : null}
          {modifiable && !brouillon ? (
            <Link href={`/estimateur/nouvelle?version=${id}`} className={buttonClass("ghost", "sm")}>
              <FilePlus2 className="h-4 w-4" /> Nouvelle version
            </Link>
          ) : null}
          {modifiable ? (
            <Link href={`/estimateur/nouvelle?dupliquer=${id}`} className={buttonClass("ghost", "sm")}>
              <Copy className="h-4 w-4" /> Dupliquer
            </Link>
          ) : null}
          {modifiable && statut !== "archivee" ? (
            <button type="button" disabled={enCours} className={buttonClass("ghost", "sm")} onClick={() => lancer(() => archiverEstimation(id), "Archiver cette estimation ? Elle reste consultable dans l'historique.")}>
              <Archive className="h-4 w-4" /> Archiver
            </button>
          ) : null}
        </div>
      </div>
      {erreur ? <p role="alert" className="mx-auto mt-1.5 max-w-[210mm] text-sm text-danger">{erreur}</p> : null}
      <p className="mx-auto mt-1.5 max-w-[210mm] text-[0.8rem] text-ink-3">
        {brouillon ? "Aperçu d'un brouillon : validez-le avant de le télécharger ou de l'envoyer." : "Dans la fenêtre d'impression, choisissez « Enregistrer au format PDF ». Télécharger ou ouvrir WhatsApp ne marque pas l'estimation comme envoyée."}
      </p>
    </div>
  );
}
