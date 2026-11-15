"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useVisible } from "@/lib/use-visible";

/** Fait apparaître son contenu en douceur quand il arrive à l'écran. */
export function Revele({ children, delai = 0, className, as: Balise = "div" }: { children: ReactNode; delai?: number; className?: string; as?: ElementType }) {
  const [ref, visible] = useVisible<HTMLDivElement>();
  return (
    <Balise ref={ref} data-visible={visible} className={cn("revele", className)} style={{ "--delai": `${delai}ms` } as CSSProperties}>
      {children}
    </Balise>
  );
}
