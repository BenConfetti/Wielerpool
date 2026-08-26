(function registerGameLogic(global) {
  const api = Object.freeze({
    scoringDepth(classificationId, settings = {}) {
      const configured = Number(settings?.scoringDepth?.[classificationId]);
      if (Number.isFinite(configured) && configured > 0) return configured;
      return classificationId === "youth" ? 3 : 5;
    },
    requiresFullScoreCount(classificationId) {
      return classificationId === "general" || classificationId === "youth";
    },
    compareStageScores(a, b, mode) {
      const scoreDifference = mode === "low" ? a.score - b.score : b.score - a.score;
      return scoreDifference || Number(a.position) - Number(b.position);
    },
    withdrawalEffectiveStage(code, stageNumber) {
      return String(code || "DNF").toUpperCase() === "DNS" ? Number(stageNumber) : Number(stageNumber) + 1;
    },
    splitPrize(amount, recipients) {
      return recipients > 0 ? Number(amount || 0) / recipients : 0;
    },
    parseTimeValue(rawValue) {
      const raw = String(rawValue ?? "").trim().replace(/^\+/, "");
      if (!raw) return null;
      if (/^\d+(?::\d{2}){1,2}$/.test(raw)) {
        const parts = raw.split(":").map(Number);
        return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
      }
      const numeric = Number(raw.replace(",", "."));
      return Number.isFinite(numeric) ? numeric : null;
    },
    teamKey(team) {
      if (team?.id) return `team:${team.id}`;
      const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
      return `participant:${normalize(team?.name)}|${normalize(team?.teamName)}`;
    },
    isConfiguredRestDaySwap(afterStage, exchangeWindows = []) {
      return exchangeWindows.some((window) => Number(window?.afterStage) === Number(afterStage));
    },
    stagePolicy(stage = {}) {
      const cancelled = stage.cancelled === true;
      const completed = cancelled || Boolean(String(stage.results || "").trim());
      return {
        completed,
        scoreRiders: completed && !cancelled,
        awardClassificationLeaders: completed,
        awardStageWinner: completed && !cancelled
      };
    },
    selfTest() {
      const results = [];
      const check = (name, condition) => results.push({ name, passed: Boolean(condition) });
      check("Algemeen vereist vijf geldige tijden", api.scoringDepth("general", { scoringDepth: { general: 5 } }) === 5 && api.requiresFullScoreCount("general"));
      check("Jongeren vereist drie geldige tijden", api.scoringDepth("youth", { scoringDepth: { youth: 3 } }) === 3 && api.requiresFullScoreCount("youth"));
      check("DNF wisselt vanaf volgende etappe", api.withdrawalEffectiveStage("DNF", 4) === 5);
      check("DNS wisselt in dezelfde etappe", api.withdrawalEffectiveStage("DNS", 4) === 4);
      check("Gedeelde prijs wordt gelijk verdeeld", api.splitPrize(12, 3) === 4);
      check("DNF wordt niet als tijd nul gelezen", api.parseTimeValue("DNF") === null);
      check("Tijdnotatie wordt naar seconden omgerekend", api.parseTimeValue("1:02:03") === 3723);
      check("Deelnemer-teams hebben een unieke sleutel", api.teamKey({ id: "abc", name: "Sam" }) !== api.teamKey({ id: "def", name: "Sam" }));
      check("Alleen ingestelde rustdagen leveren handmatige wissels", api.isConfiguredRestDaySwap(9, [{ afterStage: 9 }, { afterStage: 15 }]) && !api.isConfiguredRestDaySwap(1, [{ afterStage: 9 }, { afterStage: 15 }]));
      check("Gelijke scores volgen de officiële dagpositie", api.compareStageScores({ score: 0, position: 10 }, { score: 0, position: 25 }, "low") < 0);
      return results;
    }
  });
  global.POOL_GAME_LOGIC = api;
})(globalThis);
