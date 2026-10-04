"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ONGLETS = [
  { href: "/parametres", label: "Utilisateurs", exact: false },
  { href: "/parametres/entreprise", label: "Entreprise", exact: true },
];

export function OngletsParametres() {
  const pathname = usePathname();
  const entreprise = pathname.startsWith("/parametres/entreprise");
  return (
    <nav aria-label="Sections des paramètres" className="mb-6 flex gap-1 border-b border-line">
      {ONGLETS.map((o) => {
        const actif = o.exact ? entreprise : !entreprise;
        return (
          <Link
            key={o.href}
            href={o.href}
            aria-current={actif ? "page" : undefined}
            className={cn(
              "press -mb-px h-11 border-b-2 px-4 text-[0.95rem] font-medium leading-[2.6rem]",
              actif ? "border-wine-600 text-wine-700" : "border-transparent text-ink-3 hover:text-ink",
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
