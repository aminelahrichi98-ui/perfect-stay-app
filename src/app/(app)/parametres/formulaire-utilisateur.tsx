"use client";

import { Lock } from "lucide-react";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Notice } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  MODELES_DROITS,
  MODULES,
  POLES,
  TYPES_UTILISATEUR,
  type Droits,
  type ModuleKey,
  type TypeUtilisateur,
} from "@/lib/modules";
import type { EtatAction } from "./actions";

type Props = {
  action: (etat: EtatAction, formData: FormData) => Promise<EtatAction>;
  /** Droits de la personne qui remplit le formulaire : elle ne peut donner que ceux-là. */
  accordant: { admin: boolean; droits: Droits };
  valeurs?: {
    prenom: string;
    nom: string;
    email: string;
    type: TypeUtilisateur;
    poles: string[];
    admin: boolean;
    droits: Droits;
  };
  edition?: boolean;
  libelleBouton: string;
  /** Logements proposés au rattachement d'un compte Propriétaire */
  logements?: { id: string; nom: string }[];
  logementsRattaches?: string[];
  peutRattacher?: boolean;
};

const GROUPES: { titre: string; modules: ModuleKey[] }[] = [
  { titre: "Pilotage", modules: ["dashboard", "taches", "strategie"] },
  { titre: "Croissance", modules: ["marketing", "crm"] },
  { titre: "Logements", modules: ["onboarding", "logements", "documents_sensibles", "calendrier"] },
  { titre: "Opérations", modules: ["menage", "maintenance", "stock", "checklists"] },
  { titre: "Gestion", modules: ["comptabilite", "rh", "parametres"] },
];

const VIDE = { voir: false, modifier: false };

export function FormulaireUtilisateur({
  action,
  accordant,
  valeurs,
  edition = false,
  libelleBouton,
  logements = [],
  logementsRattaches = [],
  peutRattacher = false,
}: Props) {
  const [etat, formAction] = useActionState(action, undefined);
  const [type, setType] = useState<TypeUtilisateur>(valeurs?.type ?? "equipe");
  const [admin, setAdmin] = useState(valeurs?.admin ?? false);
  const [droits, setDroits] = useState<Droits>(valeurs?.droits ?? {});

  const possede = (k: ModuleKey, niveau: "voir" | "modifier") =>
    accordant.admin || Boolean(accordant.droits[k]?.[niveau]);

  const basculer = (k: ModuleKey, niveau: "voir" | "modifier", coche: boolean) =>
    setDroits((d) => {
      const actuel = d[k] ?? VIDE;
      const suivant = { ...actuel, [niveau]: coche };
      if (niveau === "modifier" && coche) suivant.voir = true; // modifier implique voir
      if (niveau === "voir" && !coche) suivant.modifier = false;
      return { ...d, [k]: suivant };
    });

  const appliquerModele = (modele: Droits) => {
    setDroits((d) => {
      const suivant: Droits = {};
      for (const m of MODULES) {
        const demande = modele[m.key] ?? VIDE;
        const existant = d[m.key] ?? VIDE;
        const voir = possede(m.key, "voir") ? demande.voir : existant.voir;
        const modifier = possede(m.key, "modifier") ? demande.modifier : existant.modifier;
        if (voir || modifier) suivant[m.key] = { voir: voir || modifier, modifier };
      }
      return suivant;
    });
  };

  const aDesDroits = type !== "proprietaire" && !admin;
  const limite = MODULES.some((m) => !possede(m.key, "voir") || !possede(m.key, "modifier"));

  return (
    <form action={formAction} className="space-y-8">
      <section className="grid gap-5 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="prenom">
          <Input id="prenom" name="prenom" defaultValue={valeurs?.prenom} autoComplete="off" required />
        </Field>
        <Field label="Nom" htmlFor="nom">
          <Input id="nom" name="nom" defaultValue={valeurs?.nom} autoComplete="off" required />
        </Field>
        <Field
          label="Adresse e-mail"
          htmlFor="email"
          className="sm:col-span-2"
          hint={edition ? "L'adresse de connexion ne peut pas être changée ici." : "Un e-mail lui sera envoyé pour choisir son mot de passe."}
        >
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={valeurs?.email}
            readOnly={edition}
            disabled={edition}
            required={!edition}
          />
        </Field>
      </section>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Type de compte</legend>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {TYPES_UTILISATEUR.map((t) => (
            <label
              key={t.value}
              className={cn(
                "press flex cursor-pointer flex-col gap-1 rounded-xl border bg-surface p-3.5 shadow-card has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-wine-500/15",
                type === t.value ? "border-wine-500 bg-wine-50" : "border-line-strong hover:border-aub-300",
              )}
            >
              <span className="flex items-center gap-2.5 font-medium">
                <input type="radio" name="type" value={t.value} checked={type === t.value} onChange={() => setType(t.value)} className="h-4 w-4" />
                {t.label}
              </span>
              <span className="pl-[1.65rem] text-[0.82rem] leading-snug text-ink-2">{t.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {type === "equipe" ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Pôle(s)</legend>
          <div className="flex flex-wrap gap-2">
            {POLES.map((p) => (
              <label
                key={p}
                className="press flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface px-3.5 text-sm has-[:checked]:border-wine-500 has-[:checked]:bg-wine-50 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-wine-500/15"
              >
                <input type="checkbox" name="poles" value={p} defaultChecked={valeurs?.poles.includes(p)} className="h-4 w-4" />
                {p}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {accordant.admin && type === "equipe" ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line-strong bg-surface p-3.5 shadow-card">
          <input type="checkbox" name="admin" checked={admin} onChange={(e) => setAdmin(e.target.checked)} className="mt-1 h-4 w-4" />
          <span>
            <span className="block font-medium">Administrateur</span>
            <span className="block text-[0.82rem] leading-snug text-ink-2">
              Accès total à tout, y compris la comptabilité. À réserver à la direction.
            </span>
          </span>
        </label>
      ) : null}

      {type === "proprietaire" ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Logement(s) rattaché(s)</legend>
          <p className="text-[0.82rem] leading-snug text-ink-2">
            Un propriétaire ne voit que l&apos;Espace propriétaire, limité aux logements cochés ici.
          </p>
          {!peutRattacher ? (
            <Notice ton="info">Vous n&apos;avez pas le droit de modifier les logements : le rattachement doit être fait par un administrateur.</Notice>
          ) : logements.length ? (
            <div className="flex flex-wrap gap-2">
              {logements.map((l) => (
                <label
                  key={l.id}
                  className="press flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface px-3.5 text-sm has-[:checked]:border-wine-500 has-[:checked]:bg-wine-50 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-wine-500/15"
                >
                  <input type="checkbox" name="logements" value={l.id} defaultChecked={logementsRattaches.includes(l.id)} className="h-4 w-4" />
                  {l.nom}
                </label>
              ))}
            </div>
          ) : (
            <Notice ton="info">Aucun logement pour le moment. Créez-les dans « Logements » : vous pourrez ensuite les rattacher ici, ou depuis la fiche du logement.</Notice>
          )}
        </fieldset>
      ) : null}

      {admin && type === "equipe" ? (
        <Notice ton="info">Un administrateur a accès à tous les modules : il n&apos;y a pas de droits à cocher.</Notice>
      ) : null}

      {aDesDroits ? (
        <fieldset className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <legend className="text-sm font-medium">Droits par module</legend>
              <p className="mt-0.5 text-[0.82rem] text-ink-2">« Modifier » inclut « Voir ».</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {MODELES_DROITS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => appliquerModele(m.droits)}
                  className="press h-9 rounded-full border border-line-strong bg-surface px-3.5 text-sm font-medium text-ink-2 hover:bg-sunken hover:text-ink"
                >
                  {m.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => appliquerModele({})}
                className="press h-9 rounded-full px-3.5 text-sm font-medium text-ink-3 hover:bg-sunken hover:text-ink"
              >
                Tout décocher
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <div className="grid grid-cols-[1fr_4.25rem_4.25rem] items-center border-b border-line bg-sunken px-4 py-2 text-xs font-medium tracking-wide text-ink-2 uppercase sm:grid-cols-[1fr_6rem_6rem]">
              <span>Module</span>
              <span className="text-center">Voir</span>
              <span className="text-center">Modifier</span>
            </div>
            {GROUPES.map((g) => (
              <div key={g.titre} className="border-b border-line last:border-b-0">
                <p className="bg-canvas px-4 py-1.5 text-[0.7rem] font-semibold tracking-[0.12em] text-ink-3 uppercase">{g.titre}</p>
                <ul>
                  {g.modules.map((k) => {
                    const m = MODULES.find((x) => x.key === k)!;
                    const d = droits[k] ?? VIDE;
                    const peutV = possede(k, "voir");
                    const peutM = possede(k, "modifier");
                    return (
                      <li key={k} className="grid grid-cols-[1fr_4.25rem_4.25rem] items-center px-4 sm:grid-cols-[1fr_6rem_6rem]">
                        <span className="min-w-0 py-2.5 pr-2">
                          <span className="block text-[0.95rem] font-medium">{m.label}</span>
                          <span className="hidden text-[0.8rem] text-ink-3 sm:block">{m.description}</span>
                        </span>
                        {(["voir", "modifier"] as const).map((niveau) => {
                          const permis = niveau === "voir" ? peutV : peutM;
                          return (
                            <label
                              key={niveau}
                              className={cn("grid h-12 place-items-center", permis ? "cursor-pointer" : "cursor-not-allowed")}
                              title={permis ? undefined : "Vous ne pouvez pas donner un droit que vous n'avez pas"}
                            >
                              <span className="sr-only">
                                {niveau === "voir" ? "Voir" : "Modifier"} {m.label}
                              </span>
                              <input
                                type="checkbox"
                                name={`${niveau}:${k}`}
                                checked={d[niveau]}
                                disabled={!permis}
                                onChange={(e) => basculer(k, niveau, e.target.checked)}
                                className="h-5 w-5 disabled:opacity-40"
                              />
                            </label>
                          );
                        })}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {limite ? (
            <p className="flex items-start gap-2 text-[0.82rem] leading-snug text-ink-3">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Les cases grisées sont des accès que vous n&apos;avez pas vous-même : vous ne pouvez pas les donner.
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {etat?.erreur ? <Notice ton="danger">{etat.erreur}</Notice> : null}
      {etat?.succes ? <Notice ton="ok">{etat.succes}</Notice> : null}

      <div className="flex justify-end">
        <SubmitButton className="w-full sm:w-auto">{libelleBouton}</SubmitButton>
      </div>
    </form>
  );
}
