import { cn } from "@/lib/cn";

/** Le « P » en chevrons de Perfect Stay, redessiné en vectoriel (net à toutes les tailles). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="150 158 840 756"
      fill="currentColor"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
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

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark className={cn("h-8 w-auto", markClassName)} />
      <span className="font-display text-lg font-semibold leading-none tracking-tight">
        Perfect Stay
        <span className="mt-1 block text-[0.62rem] font-medium uppercase tracking-[0.22em] opacity-60">
          Conciergerie
        </span>
      </span>
    </span>
  );
}
