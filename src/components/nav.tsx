"use client";

import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo, LogoMark } from "@/components/logo";
import { seDeconnecter } from "@/app/connexion/actions";
import { cn } from "@/lib/cn";
import { MODULE_BY_KEY, OPERATIONS, type ModuleKey } from "@/lib/modules";

type Props = {
  autorises: ModuleKey[];
  utilisateur: { prenom: string; nom: string; role: string };
};

type Entree =
  | { type: "lien"; key: ModuleKey }
  | { type: "groupe"; enfants: ModuleKey[] };

/** Ordre du menu (cahier des charges §5) : Opérations regroupe ses 4 sous-pages, Paramètres reste en bas. */
function construireMenu(autorises: ModuleKey[]): { principal: Entree[]; bas: ModuleKey[] } {
  const a = new Set(autorises);
  const principal: Entree[] = [];
  const ajoute = (k: ModuleKey) => a.has(k) && principal.push({ type: "lien", key: k });
  (["dashboard", "taches", "strategie", "marketing", "crm", "onboarding", "logements", "calendrier"] as ModuleKey[]).forEach(ajoute);
  const ops = (["menage", "maintenance", "stock", "checklists"] as ModuleKey[]).filter((k) => a.has(k));
  if (ops.length) principal.push({ type: "groupe", enfants: ops });
  (["comptabilite", "rh"] as ModuleKey[]).forEach(ajoute);
  return { principal, bas: a.has("parametres") ? ["parametres"] : [] };
}

function actif(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const LIEN =
  "press group flex h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium text-aub-200 hover:bg-white/8 hover:text-white";
const LIEN_ACTIF = "bg-white/12 text-white";

function LienModule({ k, pathname, sous = false }: { k: ModuleKey; pathname: string; sous?: boolean }) {
  const m = MODULE_BY_KEY[k];
  const Icone = m.icon;
  const courant = actif(pathname, m.href);
  return (
    <Link href={m.href} aria-current={courant ? "page" : undefined} className={cn(LIEN, sous && "h-10 pl-11 text-sm", courant && LIEN_ACTIF)}>
      {sous ? null : <Icone className={cn("h-[1.15rem] w-[1.15rem] shrink-0", courant ? "text-wine-100" : "text-aub-300 group-hover:text-white")} />}
      {m.label}
    </Link>
  );
}

function Groupe({ enfants, pathname }: { enfants: ModuleKey[]; pathname: string }) {
  const dedans = enfants.some((k) => actif(pathname, MODULE_BY_KEY[k].href));
  // Ouvert d'office quand on est dans une de ses pages ; l'utilisateur peut ensuite le replier à la main.
  const [choix, setChoix] = useState<{ pour: boolean; ouvert: boolean } | null>(null);
  const ouvert = choix && choix.pour === dedans ? choix.ouvert : dedans;
  const setOuvert = (fn: (o: boolean) => boolean) => setChoix({ pour: dedans, ouvert: fn(ouvert) });
  const Icone = OPERATIONS.icon;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        className={cn(LIEN, "w-full", dedans && !ouvert && LIEN_ACTIF)}
      >
        <Icone className="h-[1.15rem] w-[1.15rem] shrink-0 text-aub-300 group-hover:text-white" />
        <span className="flex-1 text-left">{OPERATIONS.label}</span>
        <ChevronDown className={cn("h-4 w-4 text-aub-300 transition-transform duration-200 ease-[var(--ease-out)]", ouvert && "rotate-180")} />
      </button>
      <div className={cn("grid transition-[grid-template-rows] duration-200 ease-[var(--ease-out)]", ouvert ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden" inert={!ouvert}>
          <div className="space-y-0.5 pt-0.5">
            {enfants.map((k) => (
              <LienModule key={k} k={k} pathname={pathname} sous />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Initiales({ prenom, nom }: { prenom: string; nom: string }) {
  return (
    <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-wine-100 text-sm font-semibold text-wine-800">
      {(prenom[0] ?? "") + (nom[0] ?? "")}
    </span>
  );
}

function ListeMenu({ autorises, pathname }: { autorises: ModuleKey[]; pathname: string }) {
  const { principal, bas } = construireMenu(autorises);
  return (
    <>
      <nav aria-label="Navigation principale" className="space-y-0.5">
        {principal.map((e) =>
          e.type === "lien" ? (
            <LienModule key={e.key} k={e.key} pathname={pathname} />
          ) : (
            <Groupe key="operations" enfants={e.enfants} pathname={pathname} />
          ),
        )}
      </nav>
      {bas.length ? (
        <div className="mt-auto space-y-0.5 pt-4">
          {bas.map((k) => (
            <LienModule key={k} k={k} pathname={pathname} />
          ))}
        </div>
      ) : null}
    </>
  );
}

function BlocUtilisateur({ utilisateur }: Pick<Props, "utilisateur">) {
  return (
    <div className="flex items-center gap-3 border-t border-white/10 pt-4">
      <Initiales prenom={utilisateur.prenom} nom={utilisateur.nom} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {utilisateur.prenom} {utilisateur.nom}
        </p>
        <p className="truncate text-xs text-aub-300">{utilisateur.role}</p>
      </div>
      <form action={seDeconnecter}>
        <button
          type="submit"
          aria-label="Se déconnecter"
          title="Se déconnecter"
          className="press grid h-9 w-9 place-items-center rounded-lg text-aub-300 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-[1.1rem] w-[1.1rem]" />
        </button>
      </form>
    </div>
  );
}

export function Navigation({ autorises, utilisateur }: Props) {
  const pathname = usePathname();
  const feuille = useRef<HTMLDialogElement>(null);

  // Referme le menu du téléphone après chaque changement de page.
  useEffect(() => {
    feuille.current?.close();
  }, [pathname]);

  // Barre du bas : les 4 entrées les plus utiles au quotidien parmi celles autorisées.
  const priorite: ModuleKey[] = ["dashboard", "taches", "calendrier", "logements", "menage", "comptabilite", "crm", "onboarding"];
  const rapides = priorite.filter((k) => autorises.includes(k)).slice(0, 4);

  return (
    <>
      {/* Ordinateur : menu latéral */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] flex-col bg-aub-900 px-4 pt-6 pb-4 text-white md:flex">
        <Link href="/" className="mb-7 rounded-xl px-3 py-1" aria-label="Perfect Stay, accueil">
          <Logo />
        </Link>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pb-4">
          <ListeMenu autorises={autorises} pathname={pathname} />
        </div>
        <BlocUtilisateur utilisateur={utilisateur} />
      </aside>

      {/* Téléphone : barre du haut */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-aub-900 px-4 pt-[env(safe-area-inset-top)] text-white md:hidden">
        <Link href="/" aria-label="Perfect Stay, accueil" className="flex items-center gap-2.5">
          <LogoMark className="h-6 w-auto" />
          <span className="font-display text-base font-semibold tracking-tight">Perfect Stay</span>
        </Link>
        <Initiales prenom={utilisateur.prenom} nom={utilisateur.nom} />
      </header>

      {/* Téléphone : barre du bas, à portée du pouce */}
      <nav
        aria-label="Navigation rapide"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {rapides.map((k) => {
          const m = MODULE_BY_KEY[k];
          const Icone = m.icon;
          const courant = actif(pathname, m.href);
          return (
            <Link
              key={k}
              href={m.href}
              aria-current={courant ? "page" : undefined}
              className={cn("press flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium", courant ? "text-wine-700" : "text-ink-3")}
            >
              <Icone className="h-[1.3rem] w-[1.3rem]" />
              <span className="max-w-full truncate px-1">{m.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => feuille.current?.showModal()}
          className="press flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium text-ink-3"
        >
          <Menu className="h-[1.3rem] w-[1.3rem]" />
          Menu
        </button>
      </nav>

      {/* Téléphone : menu complet */}
      <dialog
        ref={feuille}
        aria-label="Menu"
        onClick={(e) => e.target === feuille.current && feuille.current?.close()}
        className="feuille m-0 mt-auto max-h-[88dvh] w-full max-w-none rounded-t-3xl bg-aub-900 p-0 text-white backdrop:bg-aub-950/60 md:hidden"
      >
        <div className="flex max-h-[88dvh] flex-col px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mb-3 flex items-center justify-between px-1">
            <Logo markClassName="h-7" />
            <button
              type="button"
              onClick={() => feuille.current?.close()}
              aria-label="Fermer le menu"
              className="press grid h-10 w-10 place-items-center rounded-xl text-aub-200 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pb-4">
            <ListeMenu autorises={autorises} pathname={pathname} />
          </div>
          <BlocUtilisateur utilisateur={utilisateur} />
        </div>
      </dialog>
    </>
  );
}
