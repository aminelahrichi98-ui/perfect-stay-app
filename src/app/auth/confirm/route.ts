import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Reçoit le lien des e-mails (invitation, mot de passe oublié) et ouvre la session. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const suite = searchParams.get("next") ?? "/mot-de-passe";
  // On n'accepte que des chemins internes (pas de redirection vers un site extérieur).
  const destination = suite.startsWith("/") && !suite.startsWith("//") ? suite : "/mot-de-passe";

  const supabase = await createClient();
  // Lien fabriqué par l'app (accès d'un membre) ou modèle d'e-mail avec jeton
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(destination, request.url));
  }
  // Lien de l'e-mail Supabase standard (« Mot de passe oublié ») : un code à échanger contre une session
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, request.url));
  }
  const echec = new URL("/connexion", request.url);
  echec.searchParams.set("lien", "expire");
  return NextResponse.redirect(echec);
}
