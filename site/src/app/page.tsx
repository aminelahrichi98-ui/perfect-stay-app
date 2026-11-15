import { SectionAppartement } from "@/components/apartment/section-appartement";
import { TableauDeBord } from "@/components/dashboard/tableau-de-bord";
import { TunnelDiffere } from "@/components/funnel/tunnel-differe";
import { Parcours } from "@/components/journeys/parcours";
import { Consentement } from "@/components/sections/consentement";
import { Convergence } from "@/components/sections/convergence";
import { CtaMobile } from "@/components/sections/cta-mobile";
import { Faq } from "@/components/sections/faq";
import { Hero } from "@/components/sections/hero";
import { Methode } from "@/components/sections/methode";
import { Navigation } from "@/components/sections/navigation";
import { Offre } from "@/components/sections/offre";
import { Pied } from "@/components/sections/pied";
import { Preuves } from "@/components/sections/preuves";
import { ExperienceProvider } from "@/lib/experience";

export default function Accueil() {
  return (
    <ExperienceProvider>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-full focus:bg-papier focus:px-4 focus:py-2 focus:text-charbon">
        Aller au contenu
      </a>
      <Navigation />
      <main id="contenu">
        <Hero />
        <Parcours />
        <Convergence />
        <SectionAppartement />
        <TableauDeBord />
        <Methode />
        <Preuves />
        <Offre />
        <Faq />
      </main>
      <Pied />
      <CtaMobile />
      <Consentement />
      <TunnelDiffere />
    </ExperienceProvider>
  );
}
