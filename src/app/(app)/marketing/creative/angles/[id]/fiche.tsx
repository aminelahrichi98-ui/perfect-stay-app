"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { buttonClass, Notice } from "@/components/ui";
import { supprimerAngle } from "../../actions";
import type { Angle } from "../../donnees";
import { FormulaireAngle, type BoiteAngle } from "../../formulaire-angle";

/** Actions de la fiche d'un angle : modifier, supprimer (seulement s'il n'a aucune image). */
export function ActionsAngle({ angle }: { angle: Angle }) {
  const router = useRouter();
  const boite = useRef<BoiteAngle>(null);
  const [confirmation, setConfirmation] = useState(false);
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => boite.current?.ouvrir(angle)} className={buttonClass("secondary", "sm")}>
          <Pencil className="h-4 w-4" /> Modifier
        </button>
        {angle.nbCreatives === 0 ? (
          <button
            type="button"
            disabled={enCours}
            onClick={() => {
              if (!confirmation) return setConfirmation(true);
              demarrer(async () => {
                const r = await supprimerAngle(angle.id);
                if (r?.erreur) setErreur(r.erreur);
                else router.push("/marketing/creative");
              });
            }}
            className={buttonClass("danger", "sm")}
          >
            <Trash2 className="h-4 w-4" /> {confirmation ? "Confirmer la suppression" : "Supprimer"}
          </button>
        ) : null}
      </div>
      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
      <FormulaireAngle ref={boite} />
    </div>
  );
}
