"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";
import { changerStatut, renvoyerEmail, type EtatAction } from "./actions";

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
