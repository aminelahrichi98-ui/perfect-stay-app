import { createClient } from "@/lib/supabase/client";

/** Envoie un fichier directement vers le stockage privé avec l'autorisation temporaire donnée par le serveur. */
export async function envoyerVersStockage(bucket: string, chemin: string, token: string, fichier: File) {
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(chemin, token, fichier, {
    contentType: fichier.type || "application/octet-stream",
  });
  if (error) throw new Error("L'envoi du fichier a échoué. Vérifiez votre connexion et réessayez.");
}
