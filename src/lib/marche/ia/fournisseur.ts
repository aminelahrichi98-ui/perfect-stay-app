/*
  Contrat d'un fournisseur d'extraction (Claude aujourd'hui, un autre demain) : le reste de l'application
  ne dépend que de ce type, jamais d'un SDK particulier.
*/
import type { ExtractionIA } from "../extraction.ts";

export type TypeImage = "image/png" | "image/jpeg" | "image/webp";
export type CaptureIA = { numero: number; type: TypeImage; donnees: Buffer };

export type CodeErreurIA = "non_configure" | "cle_invalide" | "refus" | "limite" | "surcharge" | "trop_long" | "format" | "reseau" | "autre";
export type ResultatIA =
  | { ok: true; extraction: ExtractionIA; modele: string; repli: boolean }
  | { ok: false; code: CodeErreurIA; erreur: string };

export interface FournisseurExtraction {
  readonly nom: string;
  readonly modele: string;
  extraire(captures: CaptureIA[], contexte?: { segmentAttendu?: string }): Promise<ResultatIA>;
}
