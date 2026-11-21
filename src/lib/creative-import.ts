import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/*
  Accès de Claude (ou d'un autre outil) à Creative Intelligence, par un secret partagé :
  CREATIVE_IMPORT_SECRET, envoyé dans l'en-tête « Authorization: Bearer … ».
  Ce passage ne sert qu'à lire les angles et à déposer une image : rien d'autre.
*/

export function secretValide(request: NextRequest): "absent" | "refuse" | "ok" {
  const secret = process.env.CREATIVE_IMPORT_SECRET;
  if (!secret || secret.length < 24) return "absent";
  const recu = Buffer.from((request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, ""));
  const attendu = Buffer.from(secret);
  return recu.length === attendu.length && timingSafeEqual(recu, attendu) ? "ok" : "refuse";
}
