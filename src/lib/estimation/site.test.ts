import assert from "node:assert/strict";
import { test } from "node:test";
import { bienDepuisSite, typeDepuisSite } from "./site.ts";

test("formulaire du site → logement du CRM, sans rien inventer", () => {
  const b = bienDepuisSite({ ville: "Casablanca", quartier: "Gauthier", bien: { typeBien: "Appartement", surface: 75, chambres: "2", capacite: 4, ameublement: "Meublé" }, situation: { situation: "longue", loyer: "7 000" } })!;
  assert.deepEqual([b.ville, b.quartier, b.type_logement, b.chambres, b.surface, b.capacite, b.ameublement, b.exploitation, b.loyer_longue_duree], ["Casablanca", "Gauthier", "appartement", 2, 75, 4, "meuble", "longue", 7000]);
  const studio = bienDepuisSite({ quartier: "Maarif", bien: { typeBien: "Studio", chambres: "1" } })!;
  assert.equal(studio.chambres, 0);
  const flou = bienDepuisSite({ quartier: "Racine", bien: { typeBien: "Autre", chambres: "3+", ameublement: "Non meublé" }, situation: { situation: "courte", revenuMensuel: "environ 8000", lienAnnonce: "airbnb.com/rooms/1" } })!;
  assert.deepEqual([flou.type_logement, flou.chambres, flou.ameublement, flou.revenus_courte_mensuels, flou.lien_annonce], [null, null, "non_meuble", null, ""]);
  assert.equal(bienDepuisSite({ ville: "Casablanca" }), null);
  assert.equal(typeDepuisSite("Penthouse vue mer"), "penthouse");
});
