import { cn } from "@/lib/cn";

export function Surtitre({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("surtitre flex items-center gap-3 text-or", className)}>
      <span aria-hidden className="h-px w-8 bg-or/60" />
      {children}
    </p>
  );
}
