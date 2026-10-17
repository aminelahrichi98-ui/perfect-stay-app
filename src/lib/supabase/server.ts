import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { COOKIE_RESTER, optionsSession, veutRester } from "./session";

/** Client Supabase côté serveur : agit avec les droits de l'utilisateur connecté (Row Level Security appliquée). */
export async function createClient(choix?: { rester?: boolean }) {
  const cookieStore = await cookies();
  // « Rester connecté » : choisi à la connexion (cookie ps_rester), ou imposé pour la connexion en cours
  const rester = choix?.rester ?? veutRester(cookieStore.get(COOKIE_RESTER)?.value);
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, optionsSession(options, rester)));
          } catch {
            // Appelé depuis un composant serveur : le proxy se charge déjà de rafraîchir la session.
          }
        },
      },
    },
  );
}
