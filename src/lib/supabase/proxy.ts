import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROUTES_PUBLIQUES = ["/api/meta", "/connexion", "/auth", "/mot-de-passe-oublie", "/api/cron"];

/** Rafraîchit la session à chaque requête et renvoie les visiteurs non connectés vers /connexion. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    // Supabase pas encore branché : on laisse passer, les pages affichent un guide de configuration.
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const connecte = Boolean(data?.claims);
  const { pathname } = request.nextUrl;
  const publique = ROUTES_PUBLIQUES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!connecte && !publique) {
    const redirection = request.nextUrl.clone();
    redirection.pathname = "/connexion";
    redirection.search = "";
    return NextResponse.redirect(redirection);
  }
  if (connecte && pathname === "/connexion") {
    const redirection = request.nextUrl.clone();
    redirection.pathname = "/";
    return NextResponse.redirect(redirection);
  }
  return response;
}
