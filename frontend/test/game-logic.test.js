import assert from "node:assert/strict";
import { test } from "node:test";
import "../game-logic.js";

const logic = globalThis.POOL_GAME_LOGIC;

test("vaste spelregels slagen", () => {
  const results = logic.selfTest();
  assert.equal(results.length, 9);
  assert.deepEqual(results.filter((result) => !result.passed), []);
});

test("gelijke deelnemersnamen houden afzonderlijke teams", () => {
  assert.notEqual(
    logic.teamKey({ id: "team-a", name: "Deelnemer", teamName: "Ploeg A" }),
    logic.teamKey({ id: "team-b", name: "Deelnemer", teamName: "Ploeg B" })
  );
  assert.equal(
    logic.teamKey({ id: "team-a", name: "Oude naam", teamName: "Oude ploeg" }),
    logic.teamKey({ id: "team-a", name: "Nieuwe naam", teamName: "Nieuwe ploeg" })
  );
});

test("ongeldige tijden worden nooit nul", () => {
  assert.equal(logic.parseTimeValue("DNF"), null);
  assert.equal(logic.parseTimeValue("geen tijd"), null);
  assert.equal(logic.parseTimeValue("+01:25"), 85);
});

test("prijzen en uitvalmomenten zijn deterministisch", () => {
  assert.equal(logic.splitPrize(10, 2), 5);
  assert.equal(logic.splitPrize(10, 0), 0);
  assert.equal(logic.withdrawalEffectiveStage("OTL", 8), 9);
  assert.equal(logic.withdrawalEffectiveStage("DNS", 8), 8);
});

test("handmatige wissels horen alleen bij rustdagen", () => {
  const windows = [{ afterStage: 9 }, { afterStage: 15 }];
  assert.equal(logic.isConfiguredRestDaySwap(1, windows), false);
  assert.equal(logic.isConfiguredRestDaySwap(9, windows), true);
});
