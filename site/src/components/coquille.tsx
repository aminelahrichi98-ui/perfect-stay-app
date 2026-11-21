import type { ReactNode } from "react";
import { TunnelDiffere } from "@/components/funnel/tunnel-differe";
import { Consentement } from "@/components/sections/consentement";
import { CtaMobile } from "@/components/sections/cta-mobile";
import { Navigation } from "@/components/sections/navigation";
import { Pied } from "@/components/sections/pied";
import { ExperienceProvider } from "@/lib/experience";

/** Enveloppe commune à toutes les pages : navigation, pied, bouton d'audit permanent, formulaire. */
export function Coquille({ children }: { children: ReactNode }) {
  return (
    <ExperienceProvider>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-full focus:bg-papier focus:px-4 focus:py-2 focus:text-charbon">
        Aller au contenu
      </a>
      <Navigation />
      <main id="contenu">{children}</main>
      <Pied />
      <CtaMobile />
      <Consentement />
      <TunnelDiffere />
    </ExperienceProvider>
  );
}
