import assert from "node:assert/strict";
import { test } from "node:test";
import { canalDepuisPlateforme, libelleSejour } from "./canaux.ts";

test("le séjour se lit en un coup d'œil", () => {
  assert.equal(libelleSejour({ arrivee: "2026-10-05", depart: "2026-10-08", canal: "airbnb", date_versement: "2026-10-08" }), "05/10 → 08/10 · Airbnb");
  assert.equal(libelleSejour({ arrivee: "2026-10-05", depart: "2026-10-08", canal: "direct", date_versement: "2026-10-08" }), "05/10 → 08/10 · Direct");
  assert.equal(libelleSejour({ arrivee: "2026-10-05", depart: "2026-10-08", canal: null, date_versement: "2026-10-08" }), "05/10 → 08/10");
});

test("un ancien versement garde sa date", () => {
  assert.equal(libelleSejour({ arrivee: null, depart: null, canal: null, date_versement: "2026-09-12" }), "12/09/2026");
});

test("la plateforme du calendrier devient un canal", () => {
  assert.equal(canalDepuisPlateforme("Airbnb"), "airbnb");
  assert.equal(canalDepuisPlateforme("Booking.com"), "booking");
  assert.equal(canalDepuisPlateforme("Vrbo"), "");
  assert.equal(canalDepuisPlateforme(null), "");
});
