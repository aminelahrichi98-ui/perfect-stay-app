"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function OngletsParametres({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  const onglets = [
    { href: "/parametres", label: "Utilisateurs", actif: !pathname.startsWith("/parametres/entreprise") && !pathname.startsWith("/parametres/import") },
    { href: "/parametres/entreprise", label: "Entreprise", actif: pathname.startsWith("/parametres/entreprise") },
    ...(admin ? [{ href: "/parametres/import", label: "Import", actif: pathname.startsWith("/parametres/import") }] : []),
  ];
  return (
    <nav aria-label="Sections des paramètres" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
      {onglets.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          aria-current={o.actif ? "page" : undefined}
          className={cn(
            "press -mb-px h-11 border-b-2 px-4 text-[0.95rem] font-medium leading-[2.6rem] whitespace-nowrap",
            o.actif ? "border-wine-600 text-wine-700" : "border-transparent text-ink-3 hover:text-ink",
          )}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
