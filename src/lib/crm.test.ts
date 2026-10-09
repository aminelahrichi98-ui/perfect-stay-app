import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { ageLead, lienAppel, normaliserTelephone, tauxConversion } from "./crm.ts";
import { analyserCsv, deviner } from "./csv.ts";
import { analyserLeadMeta, extraireLeadgen, verifierSignature } from "./meta-leads.ts";

test("taux de conversion", () => {
  assert.equal(tauxConversion(2, 8), 25);
  assert.equal(tauxConversion(1, 3), 33.3);
  assert.equal(tauxConversion(0, 0), null);
});

test("âge d'un lead", () => {
  const maintenant = new Date("2026-10-10T12:00:00Z");
  assert.equal(ageLead("2026-10-10T08:00:00Z", maintenant), "aujourd'hui");
  assert.equal(ageLead("2026-10-09T08:00:00Z", maintenant), "hier");
  assert.equal(ageLead("2026-10-05T08:00:00Z", maintenant), "il y a 5 j");
});

test("numéros marocains : même numéro, écritures différentes", () => {
  assert.equal(normaliserTelephone("06 12 34 56 78"), "0612345678");
  assert.equal(normaliserTelephone("+212 612-345-678"), "0612345678");
  assert.equal(normaliserTelephone("00212612345678"), "0612345678");
  assert.equal(lienAppel("0612345678"), "tel:+212612345678");
  assert.equal(lienAppel("+33 6 12 34 56 78"), "tel:+33612345678");
  assert.equal(lienAppel("12"), null);
});

test("signature Meta : acceptée si correcte, refusée sinon", () => {
  const corps = '{"entry":[]}';
  const bonne = `sha256=${createHmac("sha256", "secret").update(corps).digest("hex")}`;
  assert.equal(verifierSignature(corps, bonne, "secret"), true);
  assert.equal(verifierSignature(corps, bonne, "autre"), false);
  assert.equal(verifierSignature(corps + " ", bonne, "secret"), false);
  assert.equal(verifierSignature(corps, null, "secret"), false);
  assert.equal(verifierSignature(corps, "sha256=zz", "secret"), false);
  assert.equal(verifierSignature(corps, bonne, ""), false);
});

test("lead Meta : champs reconnus, questions personnalisées dans les notes", () => {
  const lead = analyserLeadMeta([
    { name: "full_name", values: ["Fatima Alaoui"] },
    { name: "phone_number", values: ["+212612345678"] },
    { name: "email", values: ["fatima@example.com"] },
    { name: "city", values: ["Marrakech"] },
    { name: "Type de bien", values: ["Villa"] },
    { name: "avez_vous_deja_loue_sur_airbnb", values: ["Oui"] },
  ]);
  assert.deepEqual(lead, { nom: "Fatima Alaoui", telephone: "+212612345678", email: "fatima@example.com", ville: "Marrakech", type_bien: "Villa", notes: "avez vous deja loue sur airbnb : Oui" });
  assert.equal(analyserLeadMeta([{ name: "first_name", values: ["Omar"] }, { name: "last_name", values: ["B"] }]).nom, "Omar B");
  assert.equal(analyserLeadMeta([{ name: "phone_number", values: ["0600000000"] }]).nom, "0600000000");
});

test("envoi Meta : seuls les nouveaux leads sont lus", () => {
  const corps = { entry: [{ changes: [{ field: "leadgen", value: { leadgen_id: 123, form_id: "9", page_id: "7" } }, { field: "feed", value: {} }] }] };
  assert.deepEqual(extraireLeadgen(corps), [{ leadgenId: "123", formId: "9", pageId: "7" }]);
  assert.deepEqual(extraireLeadgen(null), []);
  assert.deepEqual(extraireLeadgen({ entry: "x" }), []);
});

test("CSV : point-virgule, guillemets, accents et lignes vides", () => {
  const l = analyserCsv('﻿Nom;Téléphone;Ville\n"Alaoui; Fatima";0612345678;Marrakech\n\nOmar;"06 11 22 33 44";"Casa ""blanca"""\n');
  assert.deepEqual(l, [
    ["Nom", "Téléphone", "Ville"],
    ["Alaoui; Fatima", "0612345678", "Marrakech"],
    ["Omar", "06 11 22 33 44", 'Casa "blanca"'],
  ]);
  assert.deepEqual(analyserCsv("a,b\n1,2")[1], ["1", "2"]);
});

test("CSV : les colonnes sont reconnues toutes seules", () => {
  assert.deepEqual(deviner(["Full Name", "Téléphone", "E-mail", "Ville", "Type de bien", "Commentaire", "Autre"]), ["nom", "telephone", "email", "ville", "type_bien", "notes", ""]);
});

import { coutParLead } from "./marketing.ts";

test("coût par lead", () => {
  assert.equal(coutParLead(1500, 20), 75);
  assert.equal(coutParLead(1000, 3), 333.33);
  assert.equal(coutParLead(500, 0), null);
});

import { anciennete } from "./rh.ts";

test("ancienneté d'un membre de l'équipe", () => {
  const ref = new Date("2026-10-15T00:00:00Z");
  assert.equal(anciennete("2026-10-01", ref), "moins d'un mois");
  assert.equal(anciennete("2026-05-10", ref), "5 mois");
  assert.equal(anciennete("2024-07-15", ref), "2 ans et 3 mois");
  assert.equal(anciennete("2025-10-15", ref), "1 an");
  assert.equal(anciennete("2025-10-20", ref), "11 mois");
});
