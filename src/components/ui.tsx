import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ---------- Boutons ---------- */

type Variante = "primary" | "secondary" | "ghost" | "danger";
type Taille = "md" | "sm";

const BASE =
  "press inline-flex select-none items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTES: Record<Variante, string> = {
  primary: "bg-wine-600 text-white shadow-card hover:bg-wine-700 active:bg-wine-800",
  secondary: "border border-line-strong bg-surface text-ink shadow-card hover:bg-sunken",
  ghost: "text-ink-2 hover:bg-sunken hover:text-ink",
  danger: "border border-danger/30 bg-surface text-danger hover:bg-danger-bg",
};

const TAILLES: Record<Taille, string> = {
  md: "h-11 px-5 text-[0.95rem]",
  sm: "h-9 px-3.5 text-sm",
};

export function buttonClass(variante: Variante = "primary", taille: Taille = "md", className?: string) {
  return cn(BASE, VARIANTES[variante], TAILLES[taille], className);
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-4 w-4 animate-[spin_700ms_linear_infinite]", className)}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Formulaires ---------- */

const CHAMP =
  "block w-full rounded-xl border border-line-strong bg-surface px-3.5 text-[1rem] text-ink shadow-card transition-[border-color,box-shadow] duration-150 placeholder:text-ink-3/70 hover:border-aub-300 focus:border-wine-500 focus:outline-none focus:ring-4 focus:ring-wine-500/15 disabled:bg-sunken disabled:text-ink-3 aria-[invalid=true]:border-danger";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input {...props} className={cn(CHAMP, "h-11", className)} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select {...props} className={cn(CHAMP, "h-11 pr-9", className)}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={cn(CHAMP, "min-h-24 py-2.5", className)} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-[0.82rem] leading-snug text-ink-3">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-[0.82rem] leading-snug text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- Surfaces ---------- */

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("rounded-2xl border border-line bg-surface shadow-card", className)} />;
}

type Ton = "neutre" | "ok" | "attention" | "danger" | "marque";

const TONS: Record<Ton, string> = {
  neutre: "bg-sunken text-ink-2",
  ok: "bg-ok-bg text-ok",
  attention: "bg-warn-bg text-warn",
  danger: "bg-danger-bg text-danger",
  marque: "bg-wine-100 text-wine-800",
};

export function Badge({ ton = "neutre", className, ...props }: ComponentProps<"span"> & { ton?: Ton }) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONS[ton],
        className,
      )}
    />
  );
}

export function PageHeader({
  titre,
  description,
  action,
}: {
  titre: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="enter mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 md:mb-8">
      <div className="min-w-0">
        <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-tight text-balance md:text-[2rem]">
          {titre}
        </h1>
        {description ? <p className="mt-1 max-w-prose text-ink-2 text-pretty">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}

/** Message d'erreur ou de confirmation sous un formulaire */
export function Notice({ ton, children }: { ton: "ok" | "danger" | "info"; children: ReactNode }) {
  const styles = {
    ok: "border-ok/25 bg-ok-bg text-ok",
    danger: "border-danger/25 bg-danger-bg text-danger",
    info: "border-line bg-sunken text-ink-2",
  };
  return (
    <p role={ton === "danger" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm leading-snug", styles[ton])}>
      {children}
    </p>
  );
}
