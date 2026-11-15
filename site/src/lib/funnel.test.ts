import assert from "node:assert/strict";
import { test } from "node:test";
import { qualifier, schemaBien, schemaContact, schemaLead, schemaSituation, schemaVille } from "./funnel.ts";

const leadValide = {
  ville: { ville: "Casablanca" },
  quartier: { quartier: "Maarif" },
  bien: { typeBien: "Appartement", surface: "92", chambres: "2", capacite: "4", ameublement: "Meublé", equipements: ["Climatisation"] },
  situation: { situation: "courte", revenuMensuel: "", tauxOccupation: "", gestionActuelle: "Je gère moi-même", defi: "La maintenance" },
  objectif: { objectifs: ["Déléguer l'exploitation"] },
  contact: { prenom: "Karim", nom: "Bennani", telephone: "+212 6 61 23 45 67", email: "karim@example.com", consentement: true },
  site: "",
  dureeMs: 30000,
};

test("un lead complet est accepté et les nombres sont convertis", () => {
  const r = schemaLead.safeParse(leadValide);
  assert.ok(r.success);
  if (r.success) assert.equal(r.data.bien.surface, 92);
});

test("« Autre ville » exige le nom de la ville", () => {
  assert.equal(schemaVille.safeParse({ ville: "Autre", villeAutre: "" }).success, false);
  assert.equal(schemaVille.safeParse({ ville: "Autre", villeAutre: "Tanger" }).success, true);
});

test("les questions de situation dépendent du profil", () => {
  assert.equal(schemaSituation.safeParse({ situation: "longue", occupation: "Libre", disponibilite: "Immédiatement" }).success, true);
  // Un bien en longue durée ne répond pas aux questions de la courte durée
  assert.equal(schemaSituation.safeParse({ situation: "longue", gestionActuelle: "Je gère moi-même" }).success, false);
  assert.equal(schemaSituation.safeParse({ situation: "vacant", disponibilite: "Immédiatement", ameublementPrevu: "Meublé", strategie: "Courte durée" }).success, true);
});

test("champs invalides refusés", () => {
  assert.equal(schemaBien.safeParse({ ...leadValide.bien, surface: "5" }).success, false);
  assert.equal(schemaContact.safeParse({ ...leadValide.contact, email: "pas-un-email" }).success, false);
  assert.equal(schemaContact.safeParse({ ...leadValide.contact, consentement: false }).success, false);
});

test("le champ piège rempli invalide la demande", () => {
  assert.equal(schemaLead.safeParse({ ...leadValide, site: "http://spam" }).success, false);
});

test("qualification explicable", () => {
  const r = schemaLead.parse(leadValide);
  const q = qualifier(r);
  assert.equal(q.niveau, "prioritaire");
  assert.ok(q.raisons.length >= 2);
  const ailleurs = qualifier({ ...r, ville: { ville: "Rabat" } });
  assert.equal(ailleurs.niveau, "standard");
});
