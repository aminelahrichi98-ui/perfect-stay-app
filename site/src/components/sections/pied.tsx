"use client";

import { bouton } from "@/components/ui/bouton";
import { Logo } from "@/components/ui/logo";
import { CONTACT, CTA, MARQUE, NAVIGATION } from "@/lib/content";
import { useExperience } from "@/lib/experience";

export function Pied() {
  const { ouvrirTunnel } = useExperience();
  const tel = CONTACT.whatsapp.replace(/\D/g, "");
  return (
    <footer className="border-t border-white/[0.06] bg-charbon pt-16 pb-28 md:pb-12">
      <div className="mx-auto max-w-[88rem] px-5 md:px-10">
        <div className="flex flex-col justify-between gap-10 md:flex-row md:items-end">
          <div>
            <Logo />
            <p className="titre mt-5 max-w-md text-[1.7rem] text-papier/85">{MARQUE.promesse}</p>
          </div>
          <button type="button" onClick={() => ouvrirTunnel("pied-de-page")} className={bouton("or", "lg")}>
            {CTA.audit}
          </button>
        </div>
        <div className="mt-14 flex flex-col gap-6 border-t border-white/[0.06] pt-8 text-[0.84rem] text-papier/50 md:flex-row md:items-center md:justify-between">
          <nav aria-label="Pied de page">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {NAVIGATION.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="hover:text-papier">
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <a href="/confidentialite" className="hover:text-papier">
                  Confidentialité
                </a>
              </li>
            </ul>
          </nav>
          <p className="flex flex-wrap gap-x-5 gap-y-1">
            <span>{CONTACT.adresse}</span>
            {tel ? (
              <a href={`https://wa.me/${tel}`} className="hover:text-papier" target="_blank" rel="noopener noreferrer">
                WhatsApp {CONTACT.whatsapp}
              </a>
            ) : null}
            {CONTACT.email ? (
              <a href={`mailto:${CONTACT.email}`} className="hover:text-papier">
                {CONTACT.email}
              </a>
            ) : null}
            <span>© {new Date().getFullYear()} Perfect Stay</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
