"use client";

import { Check, Copy, Link2, MessageCircle } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, Notice, Spinner } from "@/components/ui";
import { changerStatut, genererLienAcces, renvoyerEmail, type EtatAction } from "./actions";

export function BoutonRenvoyer({ id }: { id: string }) {
  const [etat, action] = useActionState(() => renvoyerEmail(id), undefined as EtatAction);
  return (
    <form action={action} className="space-y-2">
      <SubmitButton variante="secondary" taille="sm">
        Renvoyer l&apos;e-mail de connexion
      </SubmitButton>
      {etat?.succes ? <Notice ton="ok">{etat.succes}</Notice> : null}
      {etat?.erreur ? <Notice ton="danger">{etat.erreur}</Notice> : null}
    </form>
  );
}

export function BoutonStatut({ id, actif }: { id: string; actif: boolean }) {
  return (
    <form action={changerStatut.bind(null, id, !actif)}>
      <SubmitButton variante={actif ? "danger" : "secondary"} taille="sm">
        {actif ? "Désactiver ce compte" : "Réactiver ce compte"}
      </SubmitButton>
    </form>
  );
}

/** Lien d'accès personnel : à copier ou à envoyer par WhatsApp, sans dépendre des e-mails. */
export function LienAcces({ id, prenom }: { id: string; prenom: string }) {
  const [enCours, demarrer] = useTransition();
  const [lien, setLien] = useState("");
  const [erreur, setErreur] = useState("");
  const [copie, setCopie] = useState(false);

  function generer() {
    setErreur("");
    setCopie(false);
    demarrer(async () => {
      const r = await genererLienAcces(id);
      if (r.erreur) setErreur(r.erreur);
      else setLien(r.lien ?? "");
    });
  }
  async function copier() {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      setErreur("Copie automatique impossible : sélectionnez le lien et copiez-le à la main.");
    }
  }
  const message = `Bonjour ${prenom}, voici votre accès à l'application Perfect Stay. Ouvrez ce lien pour choisir votre mot de passe : ${lien}`;

  return (
    <div className="space-y-3">
      <button type="button" onClick={generer} disabled={enCours} aria-busy={enCours} className={buttonClass("primary", "md")}>
        {enCours ? <Spinner /> : <Link2 className="h-4 w-4" />} {lien ? "Générer un nouveau lien" : "Générer le lien d'accès"}
      </button>
      {lien ? (
        <div className="space-y-3 rounded-xl border border-line-strong bg-sunken/50 p-4">
          <input readOnly value={lien} onFocus={(e) => e.currentTarget.select()} aria-label="Lien d'accès" className="num block h-11 w-full rounded-lg border border-line-strong bg-surface px-3 font-mono text-xs" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copier} className={buttonClass("secondary", "sm")}>
              {copie ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />} {copie ? "Copié" : "Copier le lien"}
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}>
              <MessageCircle className="h-4 w-4" /> Envoyer par WhatsApp
            </a>
          </div>
          <p className="text-sm text-ink-2 text-pretty">Ce lien est personnel, à usage unique et valable environ 1 heure. Ne le publiez pas dans un groupe. S&apos;il a expiré, générez-en un nouveau.</p>
        </div>
      ) : null}
      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
    </div>
  );
}
