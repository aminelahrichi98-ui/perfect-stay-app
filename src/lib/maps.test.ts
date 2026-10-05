import assert from "node:assert/strict";
import { test } from "node:test";
import { lienMaps, urlCarte } from "./maps.ts";

test("extrait les coordonnées d'un lien Google Maps", () => {
  const u = urlCarte({ mapsUrl: "https://www.google.com/maps/place/Villa/@31.6295,-7.9811,17z/data=x", adresse: "", ville: "" });
  assert.ok(u?.includes("q=31.6295%2C-7.9811"));
});

test("retombe sur l'adresse quand le lien est court", () => {
  const u = urlCarte({ mapsUrl: "https://maps.app.goo.gl/abc", adresse: "12 rue Yougoslavie", ville: "Marrakech" });
  assert.ok(u?.includes(encodeURIComponent("12 rue Yougoslavie, Marrakech, Maroc")));
});

test("pas de carte sans information", () => {
  assert.equal(urlCarte({ mapsUrl: "", adresse: "", ville: "" }), null);
  assert.equal(lienMaps({ mapsUrl: "", adresse: "", ville: "" }), null);
});

test("le lien saisi est conservé tel quel", () => {
  assert.equal(lienMaps({ mapsUrl: "https://maps.app.goo.gl/abc", adresse: "", ville: "" }), "https://maps.app.goo.gl/abc");
});
