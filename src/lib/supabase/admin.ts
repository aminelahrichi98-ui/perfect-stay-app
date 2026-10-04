import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client « service » : contourne la Row Level Security.
 * À n'utiliser que dans des actions serveur, APRÈS avoir vérifié les droits de l'appelant.
 * La clé secrète ne doit jamais être envoyée au navigateur ni écrite dans le code.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error("La clé secrète Supabase (SUPABASE_SECRET_KEY) n'est pas configurée.");
  }
  return createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
}
