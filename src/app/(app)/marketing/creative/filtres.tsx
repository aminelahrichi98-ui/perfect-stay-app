"use client";

/** Formulaire de filtres : la page se met à jour dès qu'un filtre change. */
export function Filtres({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <form method="get" className={className} onChange={(e) => e.currentTarget.requestSubmit()}>
      {children}
    </form>
  );
}
