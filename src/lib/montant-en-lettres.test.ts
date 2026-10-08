import assert from "node:assert/strict";
import { test } from "node:test";
import { entierEnLettres, montantEnLettres } from "./montant-en-lettres.ts";

test("nombres usuels", () => {
  const cas: [number, string][] = [
    [0, "zéro"], [1, "un"], [16, "seize"], [21, "vingt et un"], [22, "vingt-deux"], [71, "soixante et onze"],
    [77, "soixante-dix-sept"], [80, "quatre-vingts"], [81, "quatre-vingt-un"], [91, "quatre-vingt-onze"],
    [100, "cent"], [101, "cent un"], [200, "deux cents"], [280, "deux cent quatre-vingts"],
    [999, "neuf cent quatre-vingt-dix-neuf"], [1000, "mille"], [1001, "mille un"], [2000, "deux mille"],
    [80000, "quatre-vingt mille"], [200000, "deux cent mille"], [1234, "mille deux cent trente-quatre"],
    [940, "neuf cent quarante"], [1_000_000, "un million"], [2_500_000, "deux millions cinq cent mille"],
  ];
  for (const [n, attendu] of cas) assert.equal(entierEnLettres(n), attendu, String(n));
});

test("montants en dirhams, avec ou sans centimes", () => {
  assert.equal(montantEnLettres(940), "neuf cent quarante dirhams");
  assert.equal(montantEnLettres(1), "un dirham");
  assert.equal(montantEnLettres(1128.5), "mille cent vingt-huit dirhams et cinquante centimes");
  assert.equal(montantEnLettres(783.33), "sept cent quatre-vingt-trois dirhams et trente-trois centimes");
  assert.equal(montantEnLettres(0.01), "zéro dirham et un centime");
  assert.equal(montantEnLettres(12000), "douze mille dirhams");
});
