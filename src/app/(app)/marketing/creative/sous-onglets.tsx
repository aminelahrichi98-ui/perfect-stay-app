"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/marketing/creative", label: "Angles", aussi: "/marketing/creative/angles" },
  { href: "/marketing/creative/creatives", label: "Images" },
  { href: "/marketing/creative/import", label: "Import Meta" },
  { href: "/marketing/creative/performances", label: "Performances" },
  { href: "/marketing/creative/decisions", label: "Décisions" },
];

/** Sections de Creative Intelligence, sous les onglets du Marketing. */
export function SousOnglets() {
  const chemin = usePathname();
  return (
    <nav aria-label="Sections de Creative Intelligence" className="mb-6 flex gap-1.5 overflow-x-auto pb-1">
      {ITEMS.map((o) => {
        const actif = o.href === "/marketing/creative" ? chemin === o.href || chemin.startsWith(`${o.aussi}/`) : chemin === o.href || chemin.startsWith(`${o.href}/`);
        return (
          <Link key={o.href} href={o.href} aria-current={actif ? "page" : undefined} className={cn("press h-10 rounded-full px-4 text-sm leading-10 font-medium whitespace-nowrap", actif ? "bg-wine-600 text-white shadow-card" : "bg-sunken text-ink-2 hover:text-ink")}>
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
