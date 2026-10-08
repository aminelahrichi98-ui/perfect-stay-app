import { createHmac, timingSafeEqual } from "node:crypto";

/** Meta signe chaque envoi avec le « secret de l'application » : on refuse tout ce qui n'est pas signé correctement. */
export function verifierSignature(corps: string, entete: string | null, secret: string): boolean {
  if (!entete || !secret || !entete.startsWith("sha256=")) return false;
  const attendu = createHmac("sha256", secret).update(corps).digest();
  const recu = Buffer.from(entete.slice(7), "hex");
  return recu.length === attendu.length && timingSafeEqual(recu, attendu);
}

export type LeadMeta = { nom: string; telephone: string; email: string; ville: string; type_bien: string; notes: string };

type Champ = { name: string; values?: string[] };

const cle = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const NOM = new Set(["full_name", "nom_complet", "nom", "name", "nom_et_prenom", "prenom_et_nom"]);
const PRENOM = new Set(["first_name", "prenom"]);
const FAMILLE = new Set(["last_name", "nom_de_famille"]);
const TEL = new Set(["phone_number", "phone", "telephone", "tel", "numero_de_telephone", "numero_de_tel", "whatsapp"]);
const MAIL = new Set(["email", "e_mail", "adresse_email", "mail"]);
const VILLE = new Set(["city", "ville", "ville_du_bien", "votre_ville"]);
const BIEN = new Set(["type_de_bien", "property_type", "type_bien", "type_de_logement", "type_de_propriete"]);

/** Transforme les champs d'un formulaire Meta en fiche lead. Les questions inconnues vont dans les notes. */
export function analyserLeadMeta(champs: Champ[]): LeadMeta {
  const lead: LeadMeta = { nom: "", telephone: "", email: "", ville: "", type_bien: "", notes: "" };
  let prenom = "";
  let famille = "";
  const autres: string[] = [];
  for (const c of champs) {
    const valeur = (c.values ?? []).join(", ").trim();
    if (!valeur) continue;
    const k = cle(c.name);
    if (NOM.has(k)) lead.nom ||= valeur;
    else if (PRENOM.has(k)) prenom ||= valeur;
    else if (FAMILLE.has(k)) famille ||= valeur;
    else if (TEL.has(k)) lead.telephone ||= valeur;
    else if (MAIL.has(k)) lead.email ||= valeur;
    else if (VILLE.has(k)) lead.ville ||= valeur;
    else if (BIEN.has(k)) lead.type_bien ||= valeur;
    else autres.push(`${c.name.replace(/_/g, " ")} : ${valeur}`);
  }
  if (!lead.nom) lead.nom = [prenom, famille].filter(Boolean).join(" ");
  if (!lead.nom) lead.nom = lead.telephone || lead.email || "Lead Meta";
  lead.notes = autres.join("\n");
  return lead;
}

export type EvenementLead = { leadgenId: string; formId: string; pageId: string };

/** Lit l'envoi de Meta (webhook « leadgen ») : renvoie les identifiants des nouveaux leads. */
export function extraireLeadgen(corps: unknown): EvenementLead[] {
  const sortie: EvenementLead[] = [];
  const entrees = (corps as { entry?: unknown[] } | null)?.entry;
  if (!Array.isArray(entrees)) return sortie;
  for (const e of entrees) {
    const changes = (e as { changes?: unknown[] }).changes;
    if (!Array.isArray(changes)) continue;
    for (const c of changes) {
      const ch = c as { field?: string; value?: { leadgen_id?: string | number; form_id?: string | number; page_id?: string | number } };
      if (ch.field !== "leadgen" || !ch.value?.leadgen_id) continue;
      sortie.push({ leadgenId: String(ch.value.leadgen_id), formId: String(ch.value.form_id ?? ""), pageId: String(ch.value.page_id ?? "") });
    }
  }
  return sortie;
}
