import { Card } from "@/components/ui";
import { ScriptManquant } from "./donnees";

/** Exécute un chargement ; renvoie `null` si la base n'a pas encore reçu le script du module. */
export async function charger<T>(f: () => Promise<T>): Promise<T | null> {
  try {
    return await f();
  } catch (e) {
    if (e instanceof ScriptManquant) return null;
    throw e;
  }
}

export function ScriptAFaire() {
  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-semibold tracking-tight">Une étape reste à faire</h2>
      <p className="mt-2 max-w-prose text-ink-2 text-pretty">
        Ce module a besoin de ses tables dans la base. Collez une fois le script <strong>0014_creative_intelligence.sql</strong> dans Supabase, SQL Editor, puis cliquez sur « Run ». Rechargez ensuite cette page.
      </p>
    </Card>
  );
}
