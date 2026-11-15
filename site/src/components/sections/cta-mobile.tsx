"use client";

import { useEffect, useState } from "react";
import { bouton } from "@/components/ui/bouton";
import { cn } from "@/lib/cn";
import { useExperience } from "@/lib/experience";

/** Sur téléphone : l'estimation reste à portée de pouce une fois le hero dépassé. */
export function CtaMobile() {
  const { ouvrirTunnel, tunnelOuvert } = useExperience();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const maj = () => setVisible(window.scrollY > window.innerHeight * 0.8);
    maj();
    window.addEventListener("scroll", maj, { passive: true });
    return () => window.removeEventListener("scroll", maj);
  }, []);
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-papier/[0.06] bg-charbon/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl transition-transform duration-500 md:hidden",
        visible && !tunnelOuvert ? "translate-y-0" : "translate-y-full",
      )}
    >
      <button type="button" onClick={() => ouvrirTunnel("barre-mobile")} className={bouton("or", "md", "w-full")} tabIndex={visible ? 0 : -1}>
        Estimer mon potentiel locatif
      </button>
    </div>
  );
}
