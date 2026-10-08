import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/** Appel autorisé uniquement avec le mot de passe `CRON_SECRET` (envoyé par Supabase ou par Vercel). */
export function autoriserCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 24) return "non-configure" as const;
  const recu = Buffer.from(request.headers.get("authorization") ?? "");
  const attendu = Buffer.from(`Bearer ${secret}`);
  return recu.length === attendu.length && timingSafeEqual(recu, attendu) ? ("ok" as const) : ("refuse" as const);
}
