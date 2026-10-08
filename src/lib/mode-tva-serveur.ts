import "server-only";
import { cookies } from "next/headers";
import { COOKIE_TVA, type ModeTva } from "@/lib/mode-tva";

/** TTC par défaut : c'est ce que Perfect Stay reçoit réellement. */
export async function lireModeTva(): Promise<ModeTva> {
  return (await cookies()).get(COOKIE_TVA)?.value === "ht" ? "ht" : "ttc";
}
