"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { bouton } from "@/components/ui/bouton";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/cn";
import { CTA, NAVIGATION } from "@/lib/content";
import { useExperience } from "@/lib/experience";

export function Navigation() {
  const { ouvrirTunnel } = useExperience();
  const [defile, setDefile] = useState(false);
  const [menu, setMenu] = useState(false);
  // Tant que l'image d'accueil est sous la barre : aucun bandeau, textes et logo en blanc
  const [surHero, setSurHero] = useState(true);
  const surImage = usePathname() === "/" && surHero;

  useEffect(() => {
    const surDefilement = () => {
      setDefile(window.scrollY > 40);
      const hero = document.getElementById("haut");
      setSurHero(hero ? hero.getBoundingClientRect().bottom > 72 : false);
    };
    surDefilement();
    window.addEventListener("scroll", surDefilement, { passive: true });
    window.addEventListener("resize", surDefilement);
    return () => {
      window.removeEventListener("scroll", surDefilement);
      window.removeEventListener("resize", surDefilement);
    };
  }, []);

  useEffect(() => {
    if (!menu) return;
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", echap);
    return () => window.removeEventListener("keydown", echap);
  }, [menu]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-500",
        surImage && "zone-sombre text-white",
        surImage
          ? menu
            ? "border-b border-white/10 bg-charbon/90 backdrop-blur-xl"
            : "border-b border-transparent"
          : defile || menu
            ? "border-b border-white/[0.06] bg-charbon/80 backdrop-blur-xl"
            : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-[88rem] items-center gap-8 px-5 md:px-10">
        <Link href="/" aria-label="Perfect Stay, accueil" className="rounded-md">
          <Logo blanc={surImage} />
        </Link>
        <nav aria-label="Sections" className="ml-auto hidden lg:block">
          <ul className={cn("flex items-center gap-7 text-[0.88rem]", surImage ? "text-white" : "text-papier/70")}>
            {NAVIGATION.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={cn("transition-colors", surImage ? "hover:text-or-clair" : "hover:text-papier")}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto hidden sm:block lg:ml-0">
          <button type="button" onClick={() => ouvrirTunnel("navigation")} className={bouton("or", "md", "!h-11")}>
            {CTA.court}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-expanded={menu}
          aria-controls="menu-mobile"
          aria-label={menu ? "Fermer le menu" : "Ouvrir le menu"}
          className="ml-auto grid h-11 w-11 place-items-center rounded-full border border-white/15 sm:ml-0 lg:hidden"
        >
          {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {menu ? (
        <nav id="menu-mobile" aria-label="Menu" className="border-t border-white/[0.06] px-5 pt-3 pb-7 lg:hidden">
          <ul className="space-y-1">
            {NAVIGATION.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setMenu(false)} className="titre block py-2.5 text-[1.9rem] text-papier/90">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              setMenu(false);
              ouvrirTunnel("menu-mobile");
            }}
            className={bouton("or", "lg", "mt-6 w-full")}
          >
            {CTA.audit}
          </button>
        </nav>
      ) : null}
    </header>
  );
}
