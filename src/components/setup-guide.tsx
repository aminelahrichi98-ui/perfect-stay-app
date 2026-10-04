import { AuthShell } from "@/components/auth-shell";
import { Notice } from "@/components/ui";

/** Affiché tant que les clés Supabase ne sont pas renseignées. */
export function SetupGuide() {
  return (
    <AuthShell titre="Configuration à terminer" description="L'application est en ligne, mais pas encore reliée à sa base de données.">
      <div className="space-y-4 text-sm leading-relaxed text-ink-2">
        <Notice ton="info">
          Il manque les clés de connexion à Supabase. Ajoutez-les dans les « Environment Variables » de Vercel, puis
          redéployez : <code className="rounded bg-sunken px-1.5 py-0.5 text-ink">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code className="rounded bg-sunken px-1.5 py-0.5 text-ink">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> et{" "}
          <code className="rounded bg-sunken px-1.5 py-0.5 text-ink">SUPABASE_SECRET_KEY</code>.
        </Notice>
        <p>Claude vous guide pas à pas pour cette étape dans la conversation.</p>
      </div>
    </AuthShell>
  );
}
