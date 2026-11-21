"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass, Field, Input, Notice, Select, Spinner } from "@/components/ui";
import { STATUTS_CREATIVE, type Reglages } from "@/lib/creative";
import { changerStatutCreative, enregistrerReglages } from "../actions";

/** Le statut d'une image se change à la main : la recommandation n'applique jamais rien toute seule. */
export function StatutCreative({ id, statut, code }: { id: string; statut: string; code: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState("");
  return (
    <div className="space-y-1">
      <Select
        aria-label={`Statut de l'image ${code}`}
        value={statut}
        disabled={enCours}
        onChange={(e) =>
          demarrer(async () => {
            const r = await changerStatutCreative(id, e.target.value);
            if (r?.erreur) setErreur(r.erreur);
            else router.refresh();
          })
        }
      >
        {STATUTS_CREATIVE.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
      {erreur ? <p className="text-[0.82rem] text-danger">{erreur}</p> : null}
    </div>
  );
}

export function FormulaireReglages({ reglages }: { reglages: Reglages }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState<{ ton: "ok" | "danger"; texte: string } | null>(null);
  const fr = (n: number) => String(n).replace(".", ",");
  function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const t = (n: string) => String(f.get(n) ?? "");
    setMessage(null);
    demarrer(async () => {
      const r = await enregistrerReglages({ devise: t("devise").toUpperCase(), budgetMensuel: t("budget"), cplCible: t("cpl"), impressionsMin: t("impressions"), leadsMin: t("leads"), ctrMin: t("ctr"), tolerance: t("tolerance") });
      if (r?.erreur) return setMessage({ ton: "danger", texte: r.erreur });
      setMessage({ ton: "ok", texte: "Réglages enregistrés. Les recommandations sont recalculées." });
      router.refresh();
    });
  }
  return (
    <form onSubmit={soumettre} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Budget mensuel" htmlFor="r-budget" hint={`En ${reglages.devise}. Modifiable à tout moment.`}>
          <Input id="r-budget" name="budget" defaultValue={fr(reglages.budgetMensuel)} inputMode="decimal" className="num" required />
        </Field>
        <Field label="CPL cible" htmlFor="r-cpl" hint="Le coût par lead que vous jugez acceptable.">
          <Input id="r-cpl" name="cpl" defaultValue={fr(reglages.cplCible)} inputMode="decimal" className="num" required />
        </Field>
        <Field label="Devise du compte Meta" htmlFor="r-devise" hint="3 lettres : EUR, MAD, USD.">
          <Input id="r-devise" name="devise" defaultValue={reglages.devise} maxLength={3} className="num uppercase" required />
        </Field>
        <Field label="Leads minimum pour juger" htmlFor="r-leads" hint="En dessous, le CPL reste provisoire.">
          <Input id="r-leads" name="leads" defaultValue={reglages.leadsMin} inputMode="numeric" className="num" required />
        </Field>
        <Field label="Impressions minimum" htmlFor="r-impressions" hint="Avant de juger le CTR d'une image.">
          <Input id="r-impressions" name="impressions" defaultValue={reglages.impressionsMin} inputMode="numeric" className="num" required />
        </Field>
        <Field label="CTR lien minimal (%)" htmlFor="r-ctr" hint="En dessous, l'image accroche peu.">
          <Input id="r-ctr" name="ctr" defaultValue={fr(reglages.ctrMin)} inputMode="decimal" className="num" required />
        </Field>
        <Field label="Tolérance sur le CPL" htmlFor="r-tolerance" hint="1,3 = jusqu'à 30 % au-dessus de la cible.">
          <Input id="r-tolerance" name="tolerance" defaultValue={fr(reglages.tolerance)} inputMode="decimal" className="num" required />
        </Field>
      </div>
      {message ? <Notice ton={message.ton}>{message.texte}</Notice> : null}
      <button type="submit" disabled={enCours} aria-busy={enCours} className={buttonClass("primary", "md")}>
        {enCours ? <Spinner /> : null} {reglages.cplConfirme ? "Enregistrer les réglages" : "Confirmer ces réglages"}
      </button>
    </form>
  );
}
