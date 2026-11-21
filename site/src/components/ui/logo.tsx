import { cn } from "@/lib/cn";

/** Le « P » en chevrons de Perfect Stay (même tracé que l'application de gestion). */
export function Monogramme({ className }: { className?: string }) {
  return (
    <svg viewBox="150 158 840 756" fill="currentColor" aria-hidden="true" className={cn("shrink-0", className)}>
      <path d="M330 215 360 268 212 537H152Z" />
      <path d="M390 321 420 374 331 537H271Z" />
      <path d="M451 427 481 480 449 537H389Z" />
      <path d="M360 160H420L628 537V912H570V537Z" />
      <path d="M480 160H540L748 537V912H689V537Z" />
      <path d="M598 160H658L866 537V755L810 855 808 537Z" />
      <path d="M717 160H777L986 537 928 642 926 537Z" />
    </svg>
  );
}

/** `blanc` : monogramme et nom entièrement blancs (au-dessus de l'image d'accueil). */
export function Logo({ className, blanc = false }: { className?: string; blanc?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", blanc && "text-white", className)}>
      <Monogramme className={cn("h-7 w-auto", blanc ? "text-white" : "text-or")} />
      <span className="titre text-[1.45rem] leading-none tracking-tight whitespace-nowrap">Perfect Stay</span>
    </span>
  );
}
