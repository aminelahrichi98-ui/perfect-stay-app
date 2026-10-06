import assert from "node:assert/strict";
import { test } from "node:test";
import { classerEvenement, codeReservation, lireIcal, urlIcalAutorisee } from "./ical.ts";

const AIRBNB = [
  "BEGIN:VCALENDAR",
  "PRODID:-//Airbnb Inc//Hosting Calendar 1.0//EN",
  "CALSCALE:GREGORIAN",
  "BEGIN:VEVENT",
  "DTEND;VALUE=DATE:20261014",
  "DTSTART;VALUE=DATE:20261010",
  "UID:1418fb94e984-aaa@airbnb.com",
  "DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/de",
  " tails/HMABC123XY\\nPhone Number (Last 4 Digits): 1234",
  "SUMMARY:Reserved",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTEND;VALUE=DATE:20261020",
  "DTSTART;VALUE=DATE:20261018",
  "UID:blocage-1@airbnb.com",
  "SUMMARY:Airbnb (Not available)",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

test("lit un calendrier Airbnb : dates, résumé, ligne coupée", () => {
  const r = lireIcal(AIRBNB);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.evenements.length, 2);
  const [resa, blocage] = r.evenements;
  assert.deepEqual([resa.debut, resa.fin, resa.resume], ["2026-10-10", "2026-10-14", "Reserved"]);
  assert.equal(codeReservation(resa.description), "HMABC123XY");
  assert.deepEqual([blocage.debut, blocage.fin], ["2026-10-18", "2026-10-20"]);
});

test("distingue réservation et blocage chez Airbnb", () => {
  const r = lireIcal(AIRBNB);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(classerEvenement(r.evenements[0], "Airbnb"), { type: "reservation", code: "HMABC123XY" });
  assert.equal(classerEvenement(r.evenements[1], "Airbnb").type, "blocage");
});

test("autres plateformes : tout compte comme une réservation (jamais de ménage oublié)", () => {
  const r = lireIcal(AIRBNB);
  assert.ok(r.ok);
  if (r.ok) assert.equal(classerEvenement(r.evenements[1], "Booking.com").type, "reservation");
});

test("événement annulé, dates avec heure en UTC, fin manquante", () => {
  const r = lireIcal(
    [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:a",
      "DTSTART:20261031T233000Z", // 00:30 le 1er novembre à Casablanca (UTC+1)
      "DTEND:20261102T100000Z",
      "STATUS:CANCELLED",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:b",
      "DTSTART;VALUE=DATE:20261105",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n"),
  );
  assert.ok(r.ok);
  if (!r.ok) return;
  const a = r.evenements.find((e) => e.uid === "a")!;
  assert.equal(a.annule, true);
  assert.equal(a.debut, "2026-11-01");
  const b = r.evenements.find((e) => e.uid === "b")!;
  assert.equal(b.fin, "2026-11-06"); // sans fin : une nuit
});

test("refuse un contenu qui n'est pas un calendrier", () => {
  const r = lireIcal("<html><body>Connexion</body></html>");
  assert.ok(!r.ok && /iCal/.test(r.erreur));
});

test("un calendrier vide mais valide donne zéro événement", () => {
  const r = lireIcal("BEGIN:VCALENDAR\nEND:VCALENDAR");
  assert.ok(r.ok && r.evenements.length === 0);
});

test("liens autorisés : https public seulement", () => {
  assert.ok(urlIcalAutorisee("https://www.airbnb.fr/calendar/ical/123.ics?s=abc").ok);
  for (const mauvais of ["http://www.airbnb.fr/x.ics", "https://localhost/x", "https://127.0.0.1/x", "https://192.168.1.5/x", "https://intranet/x", "ftp://a.com/x", "n'importe quoi"]) {
    assert.ok(!urlIcalAutorisee(mauvais).ok, mauvais);
  }
});
