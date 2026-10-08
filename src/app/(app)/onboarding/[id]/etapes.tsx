"use client";

import { Check, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Notice } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDateHeure } from "@/lib/format";
import { basculerEtape } from "../actions";

type Etape = { cle: string; libelle: string; aide: string; fait: boolean; auto: boolean; fait_le: string | null };

export function EtapesOnboarding({ logementId, etapes, modifiable, statut }: { logementId: string; etapes: Etape[]; modifiable: boolean; statut: string }) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const [local, setLocal] = useState<Record<string, boolean>>({});
  const [erreur, setErreur] = useState("");
  const [active, setActive] = useState(false);

  async function basculer(e: Etape) {
    if (!modifiable || e.auto) return;
    const nouveau = !(local[e.cle] ?? e.fait);
    setLocal((l) => ({ ...l, [e.cle]: nouveau }));
    setErreur("");
    const r = await basculerEtape(logementId, e.cle, nouveau);
    if (r?.erreur) {
      setLocal((l) => ({ ...l, [e.cle]: !nouveau }));
      setErreur(r.erreur);
      return;
    }
    if (r?.active) setActive(true);
    demarrer(() => router.refresh());
  }

  return (
    <div>
      <ol className="divide-y divide-line">
        {etapes.map((e, i) => {
          const fait = local[e.cle] ?? e.fait;
          return (
            <li key={e.cle} className="flex items-start gap-4 px-5 py-4">
              <button
                type="button"
                role="checkbox"
                aria-checked={fait}
                aria-label={e.libelle}
                disabled={!modifiable || e.auto}
                onClick={() => basculer(e)}
                className={cn("press mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 transition-colors duration-150", fait ? "border-wine-600 bg-wine-600 text-white" : "border-line-strong bg-surface", (!modifiable || e.auto) && "opacity-80")}
              >
                {fait ? <Check className="h-5 w-5" strokeWidth={3} /> : null}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", fait && "text-ink-2")}>
                  <span className="num mr-2 text-ink-3">{i + 1}.</span>
                  {e.libelle}
                </p>
                <p className="text-sm text-ink-3 text-pretty">
                  {e.auto ? "Reconnue automatiquement dans la fiche du logement." : e.fait_le && fait ? `Cochée le ${formatDateHeure(e.fait_le)}` : e.aide}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      {erreur ? (
        <div className="p-4">
          <Notice ton="danger">{erreur}</Notice>
        </div>
      ) : null}
      {active && statut === "onboarding" ? (
        <div className="p-4">
          <Notice ton="ok">
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Les 8 étapes sont faites : ce logement est maintenant actif.
            </span>
          </Notice>
        </div>
      ) : null}
    </div>
  );
}
