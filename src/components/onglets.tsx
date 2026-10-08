"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/** Onglets de section : l'onglet actif suit l'adresse de la page. */
export function Onglets({ items, libelle }: { items: { href: string; label: string; exact?: boolean }[]; libelle: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={libelle} className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
      {items.map((o) => {
        const actif = o.exact ? pathname === o.href : pathname === o.href || pathname.startsWith(`${o.href}/`);
        return (
          <Link
            key={o.href}
            href={o.href}
            aria-current={actif ? "page" : undefined}
            className={cn(
              "press -mb-px h-11 border-b-2 px-4 text-[0.95rem] leading-[2.6rem] font-medium whitespace-nowrap",
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
