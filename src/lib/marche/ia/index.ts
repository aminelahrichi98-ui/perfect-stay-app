import "server-only";
import { fournisseurClaude } from "./claude";
import type { FournisseurExtraction } from "./fournisseur";

export type EtatIA = { disponible: boolean; nom: string; modele: string; raison: string };

const MODELE_PAR_DEFAUT = "claude-opus-5-5";
const MODELE_VALIDE = /^[a-z0-9][a-z0-9.-]{2,60}$/;

/**
 * Fournisseur d'extraction configuré sur le serveur, ou null.
 * ESTIMATEUR_IA_FOURNISSEUR choisit l'adaptateur (« claude » par défaut) ; le modèle vient des paramètres de l'estimateur.
 */
export function fournisseurExtraction(modeleParametre?: string | null): FournisseurExtraction | null {
  const choix = (process.env.ESTIMATEUR_IA_FOURNISSEUR ?? "claude").trim().toLowerCase();
  const modele = modeleParametre && MODELE_VALIDE.test(modeleParametre) ? modeleParametre : MODELE_PAR_DEFAUT;
  if (choix === "claude") {
    const cle = process.env.ANTHROPIC_API_KEY?.trim();
    return cle ? fournisseurClaude(cle, modele) : null;
  }
  return null;
}

export function etatIA(iaActive: boolean, modeleParametre?: string | null): EtatIA {
  const f = fournisseurExtraction(modeleParametre);
  if (!iaActive) return { disponible: false, nom: f?.nom ?? "", modele: f?.modele ?? "", raison: "L'extraction automatique est désactivée dans les paramètres de l'estimateur." };
  if (!f) return { disponible: false, nom: "", modele: "", raison: "Aucun service d'IA n'est configuré sur le serveur (variable ANTHROPIC_API_KEY absente). La saisie manuelle reste possible." };
  return { disponible: true, nom: f.nom, modele: f.modele, raison: "" };
}
