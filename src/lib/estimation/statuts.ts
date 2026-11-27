/* Statuts d'une estimation et libellés. Télécharger ou ouvrir WhatsApp ne vaut pas « Envoyée ». */
import type { Ton } from "@/lib/crm";

export const STATUTS = [
  { value: "brouillon", label: "Brouillon", ton: "neutre" },
  { value: "a_valider", label: "À valider", ton: "attention" },
  { value: "validee", label: "Validée", ton: "marque" },
  { value: "envoyee", label: "Envoyée", ton: "ok" },
  { value: "archivee", label: "Archivée", ton: "neutre" },
] as const satisfies readonly { value: string; label: string; ton: Ton }[];
export type Statut = (typeof STATUTS)[number]["value"];

export const libelleStatut = (v: string) => STATUTS.find((s) => s.value === v)?.label ?? v;
export const tonStatut = (v: string): Ton => STATUTS.find((s) => s.value === v)?.ton ?? "neutre";
