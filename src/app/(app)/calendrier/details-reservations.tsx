"use client";

import { Broom, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui";
import { formatJour, nbNuits } from "@/lib/dates";

export type DetailReservation = {
  logementId: string;
  logement: string;
  plateforme: string;
  type: "reservation" | "blocage";
  arrivee: string;
  depart: string;
  code: string;
  menage?: { echeance: string | null; statut: string; responsable: string };
};

const STATUTS_MENAGE: Record<string, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  bloque: "Bloqué",
  termine: "Terminé",
  annule: "Annulé",
};

/**
 * Enveloppe le calendrier (affiché côté serveur) : un clic sur un séjour ouvre ses détails.
 * Un seul écouteur pour tous les séjours, au lieu d'un composant par case.
 */
export function DetailsReservations({ details, children }: { details: Record<string, DetailReservation>; children: ReactNode }) {
  const feuille = useRef<HTMLDialogElement>(null);
  const [courant, setCourant] = useState<DetailReservation | null>(null);

  function ouvrir(e: React.MouseEvent) {
    const cible = (e.target as HTMLElement).closest<HTMLElement>("[data-resa]");
    const d = cible ? details[cible.dataset.resa ?? ""] : undefined;
    if (!d) return;
    setCourant(d);
    feuille.current?.showModal();
  }

  const nuits = courant ? nbNuits(courant.arrivee, courant.depart) : 0;

  return (
    <div onClick={ouvrir}>
      {children}
      <dialog
        ref={feuille}
        aria-label="Détail de la réservation"
        onClick={(e) => {
          e.stopPropagation();
          if (e.target === feuille.current) feuille.current?.close();
        }}
        className="feuille-centree m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-aub-950/50"
      >
        {courant ? (
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Badge ton={courant.type === "reservation" ? "ok" : "neutre"}>{courant.type === "reservation" ? "Réservation" : "Nuits bloquées"}</Badge>
                <h2 className="mt-2 font-display text-xl font-semibold tracking-tight text-balance">{courant.logement}</h2>
              </div>
              <button type="button" onClick={() => feuille.current?.close()} aria-label="Fermer" className="press grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink-3 hover:bg-sunken">
                <X className="h-5 w-5" />
              </button>
            </div>

            <dl className="mt-4 divide-y divide-line text-[0.95rem]">
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-ink-2">Arrivée</dt>
                <dd className="num font-medium">{formatJour(courant.arrivee)}</dd>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-ink-2">Départ</dt>
                <dd className="num font-medium">{formatJour(courant.depart)}</dd>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-ink-2">Durée</dt>
                <dd className="num font-medium">
                  {nuits} nuit{nuits > 1 ? "s" : ""}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-ink-2">Plateforme</dt>
                <dd className="font-medium">{courant.plateforme}</dd>
              </div>
              {courant.code ? (
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-ink-2">Code de réservation</dt>
                  <dd className="font-mono text-sm font-medium">{courant.code}</dd>
                </div>
              ) : null}
            </dl>

            {courant.menage ? (
              <div className="mt-3 rounded-xl bg-sunken/70 p-3 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <Broom className="h-4 w-4 text-wine-600" /> Ménage prévu le {courant.menage.echeance ? formatJour(courant.menage.echeance) : "—"}
                </p>
                <p className="mt-0.5 text-ink-2">
                  {STATUTS_MENAGE[courant.menage.statut] ?? courant.menage.statut}
                  {courant.menage.responsable ? ` · ${courant.menage.responsable}` : ""}
                </p>
              </div>
            ) : null}

            <p className="mt-3 text-[0.8rem] leading-snug text-ink-3 text-pretty">
              Les calendriers des plateformes ne transmettent ni le nom du voyageur ni le montant : les montants se saisissent en comptabilité.
            </p>
            <Link href={`/logements/${courant.logementId}`} className="press mt-4 inline-flex h-10 items-center rounded-xl border border-line-strong px-4 text-sm font-medium hover:bg-sunken">
              Ouvrir la fiche du logement
            </Link>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
