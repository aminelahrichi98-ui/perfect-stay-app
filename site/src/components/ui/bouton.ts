import { cn } from "@/lib/cn";

type Variante = "or" | "clair" | "contour" | "lien";

const BASE =
  "group inline-flex select-none items-center justify-center gap-2.5 rounded-full font-medium whitespace-nowrap transition-[background-color,color,border-color,transform,box-shadow] duration-300 ease-[var(--ease-cine)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const VARIANTES: Record<Variante, string> = {
  or: "bg-or text-papier hover:bg-or-clair shadow-[0_10px_30px_-12px_rgb(35_12_31/0.7)]",
  clair: "bg-papier text-charbon hover:bg-white",
  contour: "border border-papier/25 text-papier hover:border-or hover:text-or-clair",
  lien: "text-papier/80 underline decoration-papier/30 underline-offset-[6px] hover:text-papier hover:decoration-or",
};

export function bouton(variante: Variante = "or", taille: "md" | "lg" = "md", classe?: string) {
  const t = variante === "lien" ? "" : taille === "lg" ? "h-14 px-7 text-[0.98rem]" : "h-12 px-6 text-[0.92rem]";
  return cn(BASE, VARIANTES[variante], t, classe);
}
