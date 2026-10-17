import assert from "node:assert/strict";
import { test } from "node:test";
import { DUREE_RESTER, optionsSession, veutRester } from "./session.ts";

test("rester connecté : cookie de 400 jours", () => {
  assert.deepEqual(optionsSession({ path: "/", sameSite: "lax", maxAge: 3600 }, true), { path: "/", sameSite: "lax", maxAge: DUREE_RESTER });
  assert.equal(optionsSession(undefined, true).maxAge, DUREE_RESTER);
});

test("sans « rester connecté » : cookie de session (ni durée ni date d'expiration)", () => {
  const o = optionsSession({ path: "/", maxAge: 3600, expires: new Date() }, false);
  assert.deepEqual(o, { path: "/" });
});

test("la déconnexion supprime toujours les cookies", () => {
  assert.equal(optionsSession({ path: "/", maxAge: 0 }, true).maxAge, 0);
  assert.equal(optionsSession({ path: "/", maxAge: 0 }, false).maxAge, 0);
});

test("préférence : on reste connecté sauf demande contraire", () => {
  assert.equal(veutRester(undefined), true);
  assert.equal(veutRester("1"), true);
  assert.equal(veutRester("0"), false);
});
