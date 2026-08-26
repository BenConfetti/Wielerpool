import assert from "node:assert/strict";
import { test } from "node:test";
import "../game-logic.js";

const logic = globalThis.POOL_GAME_LOGIC;

test("vaste spelregels slagen", () => {
  const results = logic.selfTest();
  assert.equal(results.length, 10);
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

test("een geannuleerde etappe behoudt klassementsprijzen maar heeft geen ritprijs", () => {
  assert.deepEqual(logic.stagePolicy({ cancelled: true, results: "" }), {
    completed: true,
    scoreRiders: false,
    awardClassificationLeaders: true,
    awardStageWinner: false
  });
});

test("gelijke tijden worden op officiële dagpositie gesorteerd", () => {
  const riders = [
    { rider: "Lager geklasseerd", score: 0, position: 25 },
    { rider: "Wout van Aert", score: 0, position: 10 },
    { rider: "Sneller", score: -1, position: 50 }
  ].sort((a, b) => logic.compareStageScores(a, b, "low"));
  assert.deepEqual(riders.map((rider) => rider.rider), ["Sneller", "Wout van Aert", "Lager geklasseerd"]);
});
