import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { tamponnerImage, texteHorodatage } from "./horodatage.ts";

test("la date est donnée à l'heure du Maroc, au format JJ/MM/AAAA HH:MM", () => {
  // 05/10/2026 13:32 UTC = 14:32 à Casablanca (UTC+1)
  assert.equal(texteHorodatage(new Date("2026-10-05T13:32:00Z")), "05/10/2026 14:32");
});

test("le tampon modifie bien les pixels du coin bas droit et garde les dimensions", async () => {
  const blanc = await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#ffffff" } }).jpeg().toBuffer();
  const sortie = await tamponnerImage(blanc, new Date("2026-10-05T13:32:00Z"));
  const meta = await sharp(sortie).metadata();
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 800);
  const coin = await sharp(sortie).extract({ left: 800, top: 700, width: 400, height: 100 }).raw().toBuffer();
  const origine = await sharp(blanc).extract({ left: 800, top: 700, width: 400, height: 100 }).raw().toBuffer();
  assert.notDeepEqual(coin, origine);
  const hautGauche = await sharp(sortie).extract({ left: 0, top: 0, width: 200, height: 100 }).raw().toBuffer();
  assert.ok(hautGauche.every((v) => v > 250)); // le reste de l'image n'est pas touché
});
