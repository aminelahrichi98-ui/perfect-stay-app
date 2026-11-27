import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { SchemaExtractionIA } from "../extraction";
import { CONSIGNES_SYSTEME, consigneUtilisateur } from "./consignes";
import type { FournisseurExtraction } from "./fournisseur";

/*
  Adaptateur Claude (Anthropic). La clé ANTHROPIC_API_KEY reste côté serveur.
  - Sortie structurée validée par le SDK contre SchemaExtractionIA (puis re-contrôlée par l'application).
  - Repli côté serveur activé (« fallbacks: default ») : si le modèle principal décline la requête,
    l'API la relance sur le modèle de repli recommandé, dans le même appel.
  - Diffusion en flux pour éviter les délais d'attente sur les longues réponses.
*/
export function fournisseurClaude(cle: string, modele: string): FournisseurExtraction {
  const client = new Anthropic({ apiKey: cle, maxRetries: 2, timeout: 240_000 });
  return {
    nom: "Claude (Anthropic)",
    modele,
    async extraire(captures, contexte = {}) {
      try {
        const contenu: Anthropic.Beta.BetaContentBlockParam[] = captures.flatMap((c) => [
          { type: "text" as const, text: `Capture ${c.numero} :` },
          { type: "image" as const, source: { type: "base64" as const, media_type: c.type, data: c.donnees.toString("base64") } },
        ]);
        contenu.push({ type: "text", text: consigneUtilisateur(captures.length, contexte) });

        const flux = client.beta.messages.stream({
          model: modele,
          max_tokens: 32000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          thinking: { type: "adaptive" },
          output_config: { effort: "medium", format: betaZodOutputFormat(SchemaExtractionIA) },
          system: CONSIGNES_SYSTEME,
          messages: [{ role: "user", content: contenu }],
        });
        const message = await flux.finalMessage();

        if (message.stop_reason === "refusal") return { ok: false, code: "refus", erreur: "Le service d'IA a refusé de traiter ces captures. Saisissez les données à la main." };
        if (message.stop_reason === "max_tokens") return { ok: false, code: "trop_long", erreur: "Réponse incomplète (trop de contenu). Envoyez moins de captures à la fois." };
        if (!message.parsed_output) return { ok: false, code: "format", erreur: "La réponse de l'IA n'a pas le format attendu. Relancez ou saisissez à la main." };
        const repli = (message.usage.iterations ?? []).some((e) => e.type === "fallback_message");
        return { ok: true, extraction: message.parsed_output, modele: message.model, repli };
      } catch (e) {
        if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return { ok: false, code: "cle_invalide", erreur: "La clé du service d'IA est refusée. Vérifiez ANTHROPIC_API_KEY." };
        if (e instanceof Anthropic.RateLimitError) return { ok: false, code: "limite", erreur: "Limite d'utilisation du service d'IA atteinte. Réessayez dans quelques minutes." };
        if (e instanceof Anthropic.InternalServerError) return { ok: false, code: "surcharge", erreur: "Le service d'IA est momentanément indisponible. Réessayez." };
        if (e instanceof Anthropic.APIConnectionError) return { ok: false, code: "reseau", erreur: "Le service d'IA ne répond pas. Réessayez." };
        if (e instanceof Anthropic.BadRequestError) {
          console.error("[estimateur] Requête d'extraction refusée :", e.message);
          return { ok: false, code: "format", erreur: "Le service d'IA n'a pas accepté ces images (format ou taille). Essayez des captures PNG ou JPEG plus légères." };
        }
        console.error("[estimateur] Échec de l'extraction :", e instanceof Error ? e.message : e);
        return { ok: false, code: "autre", erreur: "L'extraction a échoué. Réessayez ou saisissez les données à la main." };
      }
    },
  };
}
