import type { ReactNode } from "react";
import { Logo, LogoMark } from "@/components/logo";

/** Cadre commun des écrans de connexion : panneau de marque + formulaire. */
export function AuthShell({ titre, description, children }: { titre: string; description?: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Panneau de marque (ordinateur) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-aub-900 p-12 text-white lg:flex">
        <LogoMark
          className="pointer-events-none absolute -right-[12%] -bottom-[8%] h-[118%] w-auto text-aub-800"
        />
        <div className="relative">
          <Logo markClassName="h-10" />
        </div>
        <div className="relative max-w-md">
          <p className="font-display text-4xl leading-[1.1] font-semibold tracking-tight text-balance">
            Chaque séjour, orchestré dans les moindres détails.
          </p>
          <p className="mt-5 text-aub-200 text-pretty">
            Logements, réservations, ménage et comptabilité : l&apos;espace de travail de Perfect Stay Conciergerie.
          </p>
        </div>
        <p className="relative text-sm text-aub-300">Marrakech · Casablanca</p>
      </aside>

      <section className="flex flex-col">
        {/* Bandeau de marque (téléphone) */}
        <div className="relative overflow-hidden bg-aub-900 px-6 pt-[max(1.75rem,env(safe-area-inset-top))] pb-9 text-white lg:hidden">
          <LogoMark className="pointer-events-none absolute -right-8 -bottom-10 h-44 w-auto text-aub-800" />
          <Logo className="relative" />
        </div>

        <div className="flex flex-1 items-start justify-center px-5 pt-8 pb-12 lg:items-center lg:pt-12">
          <div className="enter w-full max-w-sm">
            <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-tight">{titre}</h1>
            {description ? <p className="mt-1.5 text-ink-2 text-pretty">{description}</p> : null}
            <div className="mt-7">{children}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
