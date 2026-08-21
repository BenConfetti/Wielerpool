const ROUND_CONFIG = window.ROUND_CONFIG || {};
const ROUND_SETTINGS = ROUND_CONFIG.settings || {};
const ROUND_FILES = ROUND_CONFIG.files || {};
const GAME_LOGIC = window.POOL_GAME_LOGIC;
const STORAGE_PREFIX = ROUND_CONFIG.storageKeyPrefix || `wielerpool-${ROUND_CONFIG.id || "default"}`;
const POOL_STORAGE = window.createPoolStorage({
  roundId: ROUND_CONFIG.id,
  prefix: STORAGE_PREFIX,
  roundConfig: ROUND_CONFIG,
  mode: new URLSearchParams(window.location.search).get("storage") || ROUND_CONFIG.storageMode || (["127.0.0.1", "localhost"].includes(window.location.hostname) ? "local" : "api"),
  apiBase: ROUND_CONFIG.apiBase || "http://127.0.0.1:3000/api/v1"
});
const CLASSIFICATIONS = [
  { id: "general", label: "Algemeen", mode: "low", unit: "sec" },
  { id: "points", label: "Punten", mode: "high", unit: "pt" },
  { id: "youth", label: "Jongeren", mode: "low", unit: "sec" },
  { id: "mountain", label: "Berg", mode: "high", unit: "pt" }
];
const DEFAULT_PRIZE_WEIGHTS = {
  final: { general: 3, general2: 0, general3: 0, points: 2, youth: 1, mountain: 1 },
  daily: { general: 3, points: 2, youth: 1, mountain: 1, stageWinner: 3 }
};
const DEFAULT_PRIZE_POT_SPLIT = { final: 50, daily: 50 };
const REST_DAY_AFTER_STAGES = (ROUND_CONFIG.exchangeWindows || []).map((window) => Number(window.afterStage)).filter(Number.isFinite);
const ADMIN_PASSWORD = "koers";
const TEAM_COLOR_PALETTE_VERSION = "non-jersey-colors-1";
const TEAM_COLOR_PALETTE = {
  "7AK3P -1": ["#1d4ed8", "#f97316"],
  "7AK3P -2": ["#0f766e", "#7c3aed"],
  "7AK3A -1": ["#be123c", "#0f172a"],
  "7AK3A -2": ["#ea580c", "#2563eb"],
  "10P -1": ["#581c87", "#06b6d4"],
  "10P -2": ["#0369a1", "#c026d3"],
  "7AKJ -1": ["#334155", "#38bdf8"],
  "7AKJ -2": ["#1e3a8a", "#f97316"],
  "7AKB -1": ["#7f1d1d", "#0f766e"],
  "7AKB -2": ["#b91c1c", "#1f2937"],
  "10AK -1": ["#312e81", "#f97316"],
  "10AK -2": ["#92400e", "#2563eb"],
  "5AK5P -1": ["#0f172a", "#06b6d4"],
  "5AK5P -2": ["#6d28d9", "#ea580c"],
  "sportpools SJORS": ["#111827", "#38bdf8"],
  "sportpools KEJE": ["#111827", "#f97316"]
};
const STARTER_COUNT = Number(ROUND_SETTINGS.starterCount || 10);
const RESERVE_COUNT = Number(ROUND_SETTINGS.reserveCount || 10);
const DATA_VERSION = `${ROUND_CONFIG.id || "round"}-${ROUND_CONFIG.dataVersion || "1"}`;
const WITHDRAWAL_FILE = ROUND_FILES.withdrawals || "";
const OFFICIAL_STAGE_FILES = (ROUND_FILES.stages || []).map((stage) => ({
  name: stage.name || `Etappe ${stage.number}`,
  url: stage.results
}));
const TOUR_STAGES = ROUND_CONFIG.stageSchedule || [];
const PRICE_VERSION = String(ROUND_CONFIG.priceVersion || "");

const exampleState = {
  settings: {
    stake: Number(ROUND_SETTINGS.stake ?? 10),
    budget: Number(ROUND_SETTINGS.budget ?? 20000),
    stageCount: Number(ROUND_SETTINGS.stageCount ?? 21),
    bcPrices: {},
    exchangeWindows: structuredClone(ROUND_CONFIG.exchangeWindows || []),
    prizePotSplit: structuredClone(ROUND_SETTINGS.prizePotSplit || DEFAULT_PRIZE_POT_SPLIT),
    prizeWeights: structuredClone(ROUND_SETTINGS.prizeWeights || DEFAULT_PRIZE_WEIGHTS)
  },
  teams: [],
  stages: [],
  manualSwaps: [],
  dataVersion: DATA_VERSION
};

let state = migrateState(loadState());
let tourRiders = [];
let withdrawalRecords = [];
let feedbackItems = loadFeedback();
let adminLogItems = loadAdminLog();
let adminUnlocked = sessionStorage.getItem(`${STORAGE_PREFIX}-admin-unlocked`) === "1";
let participantAccess = loadParticipantAccess();
const CLIENT_ID = getOrCreateClientId();
let runtimeSyncReady = false;
let runtimeSyncTimer = null;
let runtimeRevision = 0;
let storageSyncError = "";

const els = {
  stake: document.getElementById("stakeInput"),
  budget: document.getElementById("budgetInput"),
  stageCount: document.getElementById("stageCountInput"),
  finalPotPercentage: document.getElementById("finalPotPercentageInput"),
  dailyPotPercentage: document.getElementById("dailyPotPercentageInput"),
  teams: document.getElementById("teams"),
  teamSelectionMatrix: document.getElementById("teamSelectionMatrix"),
  teamSaveStatus: document.getElementById("teamSaveStatus"),
  participantName: document.getElementById("participantNameInput"),
  participantTeamName: document.getElementById("participantTeamNameInput"),
  participantAccessStatus: document.getElementById("participantAccessStatus"),
  closeSelection: document.getElementById("closeSelectionButton"),
  gameChangeMode: document.getElementById("gameChangeModeInput"),
  restDayOverride: document.getElementById("restDayOverrideInput"),
  stages: document.getElementById("stages"),
  results: document.getElementById("results"),
  details: document.getElementById("details"),
  startlistData: document.getElementById("startlistData"),
  withdrawnRidersData: document.getElementById("withdrawnRidersData"),
  tourResultsData: document.getElementById("tourResultsData"),
  jerseyLogData: document.getElementById("jerseyLogData"),
  participantTeamsData: document.getElementById("participantTeamsData"),
  bcPriceEditor: document.getElementById("bcPriceEditor"),
  exchangeWindowEditor: document.getElementById("exchangeWindowEditor"),
  progressData: document.getElementById("progressData"),
  riderPerformanceData: document.getElementById("riderPerformanceData"),
  swapLogData: document.getElementById("swapLogData"),
  prizePotData: document.getElementById("prizePotData"),
  historyData: document.getElementById("historyData"),
  chartsData: document.getElementById("chartsData"),
  teamVisuals: document.getElementById("teamVisuals"),
  feedbackForm: document.getElementById("feedbackForm"),
  feedbackName: document.getElementById("feedbackNameInput"),
  feedbackTeam: document.getElementById("feedbackTeamInput"),
  feedbackType: document.getElementById("feedbackTypeInput"),
  feedbackSubject: document.getElementById("feedbackSubjectInput"),
  feedbackMessage: document.getElementById("feedbackMessageInput"),
  feedbackStatus: document.getElementById("feedbackStatus"),
  feedbackList: document.getElementById("feedbackList"),
  adminLoginPanel: document.getElementById("adminLoginPanel"),
  adminContent: document.getElementById("adminContent"),
  adminPassword: document.getElementById("adminPasswordInput"),
  adminLoginStatus: document.getElementById("adminLoginStatus"),
  adminSaveStatus: document.getElementById("adminSaveStatus"),
  appLoadingStatus: document.getElementById("appLoadingStatus"),
  introEditor: document.getElementById("introEditor"),
  prizeWeightEditor: document.getElementById("prizeWeightEditor"),
  adminOverviewData: document.getElementById("adminOverviewData"),
  possibleErrorsData: document.getElementById("possibleErrorsData"),
  logicTestsData: document.getElementById("logicTestsData"),
  adminLogData: document.getElementById("adminLogData")
};

setupAdminLayout();

function setupAdminLayout() {
  if (!els.adminContent || els.adminContent.dataset.layoutReady === "1") return;
  const sections = [...els.adminContent.querySelectorAll(":scope > section.panel")];
  const settingsSection = sections.find((section) => section.classList.contains("settings"));
  if (settingsSection) els.adminContent.prepend(settingsSection);
  [...els.adminContent.querySelectorAll(":scope > section.panel")].forEach((section) => {
    const heading = section.querySelector(":scope > h2, :scope > .section-heading > h2");
    const details = document.createElement("details");
    details.className = [...section.classList, "admin-section"].join(" ");
    if (section === settingsSection) details.open = true;
    const summary = document.createElement("summary");
    summary.textContent = heading?.textContent || "Adminonderdeel";
    heading?.remove();
    details.append(summary, ...section.childNodes);
    section.replaceWith(details);
  });
  els.adminContent.dataset.layoutReady = "1";
}

document.querySelectorAll("[data-tab-target]").forEach((button) => {
  button.addEventListener("click", () => activateTab(button.dataset.tabTarget));
});

document.getElementById("retrieveSelectionButton")?.addEventListener("click", () => {
  openParticipantSelection(false);
});

document.getElementById("createSelectionButton")?.addEventListener("click", () => {
  openParticipantSelection(true);
});

document.getElementById("closeSelectionButton")?.addEventListener("click", () => {
  participantAccess = null;
  localStorage.removeItem(`${STORAGE_PREFIX}-participant-access`);
  persistClientState();
  render();
});
document.getElementById("addTeamButton")?.addEventListener("click", () => {
  saveFromForm();
  state.teams.push({
    name: `Deelnemer ${state.teams.length + 1}`,
    teamName: "",
    color1: "#f6d32d",
    color2: "#ffffff",
    riders: "",
    reserves: ""
  });
  render();
});

document.getElementById("saveTeamsButton")?.addEventListener("click", async () => {
  updateAllTeamColorStatus();
  updateAllTeamRiderAvailability();
  const colorErrors = validateAllTeamColors();
  const riderErrors = validateAllTeamRiders();
  const errors = [...colorErrors, ...riderErrors];
  if (errors.length) {
    showTeamSaveStatus(`Niet opgeslagen: ${errors.join(" ")}`, "error");
    return;
  }
  const gameChangeMode = Boolean(els.gameChangeMode?.checked);
  const pendingTeamChanges = collectPendingTeamChanges();
  if (gameChangeMode && pendingTeamChanges.length && !isManualSwapAllowedNow()) {
    const moment = getManualSwapMoment();
    showTeamSaveStatus(`Niet opgeslagen: spelwissels mogen alleen na etappe ${REST_DAY_AFTER_STAGES.join(" of na etappe ")}. Huidig moment: ${moment.label}. Gebruik de test-override als je dit nu toch wilt testen.`, "error");
    return;
  }
  saveFromForm();
  if (gameChangeMode) {
    registerManualTeamChanges(pendingTeamChanges);
  } else {
    applyRetroactiveTeamChanges(pendingTeamChanges);
  }
  try {
    await saveAccessibleTeamToApi();
  } catch (error) {
    showTeamSaveStatus("Niet opgeslagen in de online database. Probeer het over een moment opnieuw.", "error");
    return;
  }
  persistState();
  render();
  showTeamSaveStatus(
    gameChangeMode
      ? "Teamselectie opgeslagen als spelwijziging. De wissel blijft op dit moment in de berekening staan."
      : "Teamselectie terugwerkend opgeslagen vanaf het begin van het spel.",
    "success"
  );
});

els.teams?.addEventListener("change", (event) => {
  const control = event.target.closest("select, input");
  if (!control) return;
  const teamIndex = getTeamIndexFromControl(control);
  if (teamIndex != null) {
    updateTeamColorStatus(teamIndex);
    updateTeamRiderAvailability(teamIndex);
    updateTeamBudgetStatus(teamIndex);
    renderTeamSelectionMatrix();
  }
  showTeamSaveStatus("Wijzigingen nog niet opgeslagen.", "pending");
});

els.teams?.addEventListener("input", (event) => {
  const control = event.target.closest("input");
  if (!control) return;
  const teamIndex = getTeamIndexFromControl(control);
  if (teamIndex != null) {
    updateTeamColorStatus(teamIndex);
    updateTeamRiderAvailability(teamIndex);
    updateTeamBudgetStatus(teamIndex);
    renderTeamSelectionMatrix();
  }
  showTeamSaveStatus("Wijzigingen nog niet opgeslagen.", "pending");
});

els.teams?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-clear-team-riders]");
  if (!button) return;
  const teamIndex = Number(button.dataset.clearTeamRiders);
  clearTeamRiderSelection(teamIndex);
  showTeamSaveStatus("Wijzigingen nog niet opgeslagen.", "pending");
});

els.teams?.addEventListener("dragstart", (event) => {
  const row = event.target.closest("[data-roster-rider]");
  if (!row) return;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", JSON.stringify({
    teamIndex: row.dataset.rosterTeam,
    name: row.dataset.rosterRider
  }));
  row.dataset.dragSourceKind = row.dataset.rosterKind || "";
  row.classList.add("roster-dragging");
});

els.teams?.addEventListener("dragover", (event) => {
  const list = event.target.closest("[data-roster-list]");
  if (!list) return;
  event.preventDefault();
  const dragging = document.querySelector(".roster-dragging");
  if (!dragging) return;
  if (!canDropRosterRow(list, dragging)) {
    event.dataTransfer.dropEffect = "none";
    return;
  }
  event.dataTransfer.dropEffect = "move";
  setRosterDropTarget(list);
});

els.teams?.addEventListener("drop", (event) => {
  const list = event.target.closest("[data-roster-list]");
  if (!list) return;
  event.preventDefault();
  const dragging = document.querySelector(".roster-dragging");
  clearRosterDropTargets();
  if (!dragging || !canDropRosterRow(list, dragging)) return;
  const teamIndex = Number(list.dataset.rosterList);
  list.querySelector(".roster-empty")?.remove();
  const after = getRosterInsertBefore(list, event.clientY);
  if (after) {
    list.insertBefore(dragging, after);
  } else {
    list.appendChild(dragging);
  }
  rebalanceRosterLists(teamIndex, list, dragging);
  updateCheckboxesFromRoster(teamIndex);
  updateTeamRiderAvailability(teamIndex, { preserveRoster: true });
  updateTeamBudgetStatus(teamIndex);
  renderTeamSelectionMatrix();
  showTeamSaveStatus("Wijzigingen nog niet opgeslagen.", "pending");
});

els.teams?.addEventListener("dragend", (event) => {
  const row = event.target.closest("[data-roster-rider]");
  if (!row) return;
  row.classList.remove("roster-dragging");
  delete row.dataset.dragSourceKind;
  clearRosterDropTargets();
});

els.details?.addEventListener("change", (event) => {
  const control = event.target.closest("[data-classification-detail-control]");
  if (!control) return;
  const root = control.closest("[data-classification-detail-root]");
  if (!root) return;
  saveFromForm();
  const standings = calculateStandings(state);
  renderClassificationDetail(
    root.dataset.classificationDetailRoot,
    root.dataset.currentTeam,
    standings,
    {
      mode: root.querySelector("[data-detail-progress-mode]")?.value || "team",
      selectedTeam: root.querySelector("[data-detail-progress-team]")?.value || root.dataset.currentTeam,
      selectedStage: root.querySelector("[data-detail-progress-stage]")?.value || "",
      selectedRider: root.querySelector("[data-detail-progress-rider]")?.value || ""
    }
  );
});

els.budget?.addEventListener("input", () => {
  document.querySelectorAll("[data-budget-status]").forEach((item) => {
    updateTeamBudgetStatus(Number(item.dataset.budgetStatus));
  });
  showTeamSaveStatus("Wijzigingen nog niet opgeslagen.", "pending");
});

document.querySelector('[data-tab-panel="admin"]')?.addEventListener("focusin", (event) => {
  const control = event.target.closest("input, select, textarea");
  if (!control) return;
  control.dataset.adminPreviousValue = control.value;
});

document.querySelector('[data-tab-panel="admin"]')?.addEventListener("input", (event) => {
  const control = event.target.closest("input, select, textarea");
  if (!control || control.id === "adminPasswordInput") return;
  showAdminSaveStatus("Adminwijzigingen nog niet opgeslagen.", "pending");
});

els.introEditor?.addEventListener("input", () => {
  els.introEditor.dataset.edited = "1";
  showAdminSaveStatus("Adminwijzigingen nog niet opgeslagen.", "pending");
});

document.getElementById("saveAdminButton")?.addEventListener("click", async () => {
  await saveAdminChanges();
});

els.possibleErrorsData?.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-error-acknowledgement]");
  if (!checkbox) return;
  showAdminSaveStatus("Adminwijzigingen nog niet opgeslagen.", "pending");
});

document.getElementById("addStageButton")?.addEventListener("click", () => {
  state.stages.push({ name: `Etappe ${state.stages.length + 1}`, results: "" });
  render();
});

document.getElementById("calculateButton").addEventListener("click", () => {
  saveFromForm();
  renderResults();
});

document.getElementById("recalculateButton")?.addEventListener("click", async () => {
  saveFromForm();
  state.stages = state.stages
    .filter((stage) => getStageNumber(stage.name) >= 2)
    .sort((a, b) => getStageNumber(a.name) - getStageNumber(b.name));
  render();
});

document.getElementById("clearDetailButton").addEventListener("click", () => {
  els.details.textContent = "Klik op een regel in een klassement of ploegenklassement om de opbouw te zien.";
});

els.excelUpload?.addEventListener("change", () => {
  const fileName = els.excelUpload.files?.[0]?.name;
  els.excelUploadStatus.textContent = fileName
    ? `${fileName} geselecteerd. In deze testversie zet ik het bestand nog om via de lokale converter in de input-map.`
    : "Geen bestand geselecteerd.";
});

els.feedbackForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  submitFeedback();
});

document.getElementById("exportFeedbackButton")?.addEventListener("click", () => {
  exportFeedbackCsv();
});

document.getElementById("clearFeedbackButton")?.addEventListener("click", () => {
  if (!feedbackItems.length) return;
  if (!confirm("Alle centraal opgeslagen feedback wissen?")) return;
  feedbackItems = [];
  persistFeedback();
  renderFeedback();
  recordAdminLog("Feedback", "Feedback gewist", "Alle centrale feedbackinzendingen gewist.");
  showFeedbackStatus("Feedback gewist.", "success");
});

document.getElementById("adminUnlockButton")?.addEventListener("click", () => {
  unlockAdmin();
});

els.adminPassword?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    unlockAdmin();
  }
});

document.getElementById("exportAdminLogButton")?.addEventListener("click", () => {
  exportAdminLogCsv();
});

document.getElementById("clearAdminLogButton")?.addEventListener("click", () => {
  if (!adminLogItems.length) return;
  if (!confirm("Adminlog wissen?")) return;
  adminLogItems = [];
  persistAdminLog();
  renderAdminLog();
});

els.stages?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-import-stage]");
  if (!button) return;
  saveFromForm();
  const index = Number(button.dataset.importStage);
  state.stages[index].results = mergeStageResultText(
    state.stages[index].results,
    importStageCsv(state.stages[index].importCsv)
  );
  render();
});

els.chartsData?.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-chart-team]");
  if (!checkbox) return;
  state.openCharts = getOpenChartIds();
  const selected = new Set(state.chartTeams || defaultChartTeams(calculateStandings(state)));
  if (checkbox.checked) {
    selected.add(checkbox.dataset.chartTeam);
  } else {
    selected.delete(checkbox.dataset.chartTeam);
  }
  state.chartTeams = [...selected];
  renderChartsData();
  persistState();
});

els.chartsData?.addEventListener("click", (event) => {
  const action = event.target.closest("[data-chart-action]")?.dataset.chartAction;
  if (!action) return;
  state.openCharts = getOpenChartIds();
  const standings = calculateStandings(state);
  if (action === "all") state.chartTeams = state.teams.map(teamKey);
  if (action === "none") state.chartTeams = [];
  if (action === "top5") state.chartTeams = defaultChartTeams(standings);
  renderChartsData();
  persistState();
});

els.chartsData?.addEventListener("toggle", (event) => {
  if (!event.target.matches("[data-chart-id]")) return;
  state.openCharts = getOpenChartIds();
  persistState();
}, true);

function applyRoundConfig() {
  const theme = ROUND_CONFIG.theme || {};
  const jerseys = ROUND_CONFIG.jerseys || {};
  const root = document.documentElement;
  root.style.setProperty("--accent", theme.accent || jerseys.general?.color || "#0072ce");
  root.style.setProperty("--accent-dark", theme.accentDark || theme.accent || "#005ea8");
  root.style.setProperty("--tour-yellow", theme.general || jerseys.general?.color || "#ffd900");
  root.style.setProperty("--tour-green", theme.points || jerseys.points?.color || "#009a44");
  root.style.setProperty("--tour-white", theme.youth || jerseys.youth?.color || "#ffffff");
  root.style.setProperty("--tour-red", theme.mountainAccent || jerseys.mountain?.accent || "#d61f26");
  document.title = `${ROUND_CONFIG.name || "Wielerpool"} | Wielerpool`;
  const roundLabel = ROUND_CONFIG.competition || ROUND_CONFIG.name || "Ronde";
  const eyebrow = document.getElementById("roundEyebrow");
  const title = document.getElementById("roundTitle");
  const dataLabel = document.getElementById("roundDataLabel");
  if (eyebrow) eyebrow.textContent = `${roundLabel} ${ROUND_CONFIG.status === "setup" ? "opbouwversie" : "testversie"}`;
  if (title) title.textContent = `${ROUND_CONFIG.name || "Wielerpool"}-pool`;
  if (dataLabel) dataLabel.textContent = ROUND_CONFIG.dataLabel || "Rondedata";
}

function renderRoundIntro() {
  const container = document.getElementById("roundIntroContent");
  if (!container) return;
  if (hasVisibleIntroContent(state.settings.introHtml)) {
    container.innerHTML = sanitizeIntroHtml(state.settings.introHtml);
    return;
  }
  if (ROUND_CONFIG.intro?.template !== "vuelta-pool") {
    container.innerHTML = `
      <p class="hint">Testversie voor de ${escapeHtml(ROUND_CONFIG.name || "wieler")}–pool. Kies teams, importeer uitslagen en controleer per klassement hoe scores en geldbedragen zijn opgebouwd.</p>
      <section class="rules-summary">
        <h3>Belangrijke spelregels</h3>
        <ul>
          <li>Per etappe tellen de beste vijf actieve renners per team mee voor algemeen, punten en berg. Bij jongeren tellen alleen de beste drie jongeren mee.</li>
          <li>DNF, OTL, DSQ en OUT gelden vanaf de volgende etappe. DNS geldt vanaf dezelfde etappe.</li>
          <li>Rustdagwissels mogen alleen binnen de ingestelde wisselvensters in Admin, behalve als de test-override aan staat.</li>
        </ul>
      </section>`;
    return;
  }

  const settings = state.settings;
  const scoringDepth = ROUND_SETTINGS.scoringDepth || {};
  const split = getPrizePotSplit(state);
  const weights = getPrizeWeights(state);
  const teamCount = state.teams.length;
  const pot = teamCount * Number(settings.stake || 0);
  const finalPot = pot * split.final / 100;
  const dailyPot = pot * split.daily / 100;
  const finalWeight = sumFinalPrizeWeights(weights.final);
  const dailyWeight = sumClassificationWeights(weights.daily) + Number(weights.daily.stageWinner || 0);
  const stages = Math.max(1, Number(settings.stageCount || 1));
  const finalAmount = (key) => finalWeight ? finalPot * Number(weights.final[key] || 0) / finalWeight : 0;
  const dailyAmount = (key) => dailyWeight ? dailyPot * Number(weights.daily[key] || 0) / dailyWeight / stages : 0;
  const generalPlaces = getGeneralFinalPlacePrizes(weights, finalPot, finalWeight);
  const generalPlaceAmount = (place) => generalPlaces.find((item) => item.place === place)?.amount || 0;
  const noPotNote = teamCount
    ? `De actuele pot is ${formatCurrency(pot)} op basis van ${teamCount} deelnemer${teamCount === 1 ? "" : "s"} à ${formatCurrency(settings.stake)}.`
    : `Er zijn nog geen deelnemers ingevoerd. De bedragen hieronder staan daarom op ${formatCurrency(0)} en lopen automatisch mee zodra teams worden toegevoegd.`;

  container.innerHTML = `
    <section class="intro-copy">
      <h3>Doel van het spel</h3>
      <p>Natuurlijk het algemeen klassement winnen. De winnaar krijgt, dit keer bij de Vuelta, een paar rode sokken. Maar er is ook een ploegenklassement waarin de inleg wordt verdeeld. Die inleg is voor deze testversie ${formatCurrency(settings.stake)} per deelnemer.</p>

      <h3>Hoe win ik de rode trui?</h3>
      <p>Je maakt een selectie van ${formatNumber(STARTER_COUNT)} renners en ${formatNumber(RESERVE_COUNT)} wissels met een budget van ${formatNumber(settings.budget)} BC. Van je actieve renners tellen alleen je ${formatNumber(scoringDepth.general || 5)} beste renners uit de daguitslag mee voor het algemeen klassement. De tijden van die renners opgeteld vormen de tijd die jouw team in het algemeen klassement van deze pool krijgt.</p>

      <h3>Blijft mijn team drie weken hetzelfde?</h3>
      <p>Nee. Wanneer een renner uitvalt, wordt deze automatisch gewisseld met je eerste beschikbare reserve. Bij een DNF, OTL, DSQ of OUT gebeurt dat vanaf de volgende etappe. Bij een DNS wordt de renner diezelfde etappe nog gewisseld.</p>
      <p>Daarnaast mag je tijdens de ingestelde wisselvensters rond de rustdagen vrij wisselen tussen je startteam en de reserves. Je kunt geen nieuwe renners aan je selectie toevoegen.</p>

      <h3>Hoe kan ik geld winnen?</h3>
      <p>${noPotNote} Van de totale pot gaat ${formatNumber(split.final)}% naar de eindklassementen en ${formatNumber(split.daily)}% naar de dagprijzen. De actuele verdeling is:</p>
      <h4>Eindprijzen</h4>
      <ul>
        <li>Algemeen klassement, plek 1: ${formatCurrency(generalPlaceAmount(1))}</li>
        ${Number(weights.final.general2 || 0) > 0 ? `<li>Algemeen klassement, plek 2: ${formatCurrency(generalPlaceAmount(2))}</li>` : ""}
        ${Number(weights.final.general3 || 0) > 0 ? `<li>Algemeen klassement, plek 3: ${formatCurrency(generalPlaceAmount(3))}</li>` : ""}
        <li>Puntenklassement: ${formatCurrency(finalAmount("points"))}</li>
        <li>Jongerenklassement: ${formatCurrency(finalAmount("youth"))}</li>
        <li>Bergklassement: ${formatCurrency(finalAmount("mountain"))}</li>
      </ul>
      <h4>Dagprijzen per etappe</h4>
      <ul>
        <li>Leider algemeen klassement: ${formatCurrency(dailyAmount("general"))}</li>
        <li>Leider puntenklassement: ${formatCurrency(dailyAmount("points"))}</li>
        <li>Leider jongerenklassement: ${formatCurrency(dailyAmount("youth"))}</li>
        <li>Leider bergklassement: ${formatCurrency(dailyAmount("mountain"))}</li>
        <li>Etappewinnaar in je team: ${formatCurrency(dailyAmount("stageWinner"))}</li>
      </ul>
      <p>Hebben meerdere deelnemers de etappewinnaar in hun team, dan delen zij die prijs. Heeft niemand de etappewinnaar, dan wordt het bedrag opgespaard en toegevoegd aan de prijs voor de winnaar van de laatste etappe.</p>

      <h3>Strategieën</h3>
      <p>Je doel is om de nummer vijf van je team zo hoog mogelijk in de daguitslag te krijgen. Neem bijvoorbeeld zeven of acht renners voor het algemeen klassement op in je startteam. Je kunt daarbij leunen op het jongeren- of bergklassement, of vol voor het algemeen klassement gaan. Buiten die renners ben je vrij in je strategie.</p>
      <ul>
        <li>Met het puntenklassement kun je veel prijzengeld verzamelen, maar als je niet bovenaan staat kan die keuze weinig opleveren.</li>
        <li>Je kunt op de bergtrui inzetten, met het risico dat deze renners bewust veel tijd verliezen in het algemeen klassement.</li>
        <li>Je kunt op de jongerentrui inzetten, maar met weinig jongeren kan één mindere renner je resultaat flink beïnvloeden.</li>
        <li>Je kunt kiezen voor ontsnappers. Een renner die normaal niet bij je beste vijf zit, kan vanuit een succesvolle vlucht opeens veel tijdwinst en een dagprijs pakken.</li>
        <li>Je kunt gaan voor meesterknechten die zo lang mogelijk bij hun kopman blijven. Als dat niet lukt, kunnen ze zich echter ook bewust laten uitzakken.</li>
      </ul>
      <p>Met andere woorden: probeer uit en smeed je eigen tactiek.</p>
    </section>

    <section class="rules-summary">
      <h3>Spelregels</h3>
      <ul>
        <li>Iedere deelnemer selecteert ${formatNumber(STARTER_COUNT)} starters en ${formatNumber(RESERVE_COUNT)} reserves binnen een budget van ${formatNumber(settings.budget)} BC.</li>
        <li>Per etappe tellen voor algemeen, punten en berg de beste ${formatNumber(scoringDepth.general || 5)} actieve renners mee. Voor het jongerenklassement tellen de beste ${formatNumber(scoringDepth.youth || 3)} jongeren mee.</li>
        <li>Een team met minder dan ${formatNumber(scoringDepth.youth || 3)} meetellende jongeren doet die etappe niet mee voor het jongerenklassement en komt onderaan met de toelichting <strong>te weinig renners</strong>.</li>
        <li>De opgetelde officiële tijden van de meetellende renners bepalen de teamtijd in het algemeen klassement.</li>
        <li>DNF, OTL, DSQ en OUT leiden vanaf de volgende etappe tot een automatische vervanging door de eerste beschikbare reserve. DNS geldt vanaf dezelfde etappe.</li>
        <li>Vrij wisselen kan alleen binnen de door de beheerder ingestelde wisselvensters rond rustdagen en uitsluitend tussen de bestaande starters en reserves.</li>
        <li>De totale prijzenpot is de inleg per deelnemer maal het aantal deelnemers. Percentages en gewichten uit Admin bepalen de verdeling over eind- en dagprijzen.</li>
        <li>Gedeelde prijzen worden gelijk verdeeld onder de deelnemers die op die prijs recht hebben.</li>
        <li>Niet uitgekeerd etappewinnaarsgeld wordt gereserveerd voor de winnaar van de laatste etappe.</li>
        <li>Correcties in uitslagen, uitvallers of spelinstellingen kunnen door de beheerder worden verwerkt en leiden tot een herberekening van de stand.</li>
      </ul>
    </section>`;
}

function render() {
  applyRoundConfig();
  els.stake.value = state.settings.stake;
  els.budget.value = state.settings.budget;
  els.stageCount.value = state.settings.stageCount;
  const prizePotSplit = getPrizePotSplit(state);
  if (els.finalPotPercentage) els.finalPotPercentage.value = prizePotSplit.final;
  if (els.dailyPotPercentage) els.dailyPotPercentage.value = prizePotSplit.daily;
  renderRoundIntro();
  renderAdminSettings();
  renderParticipantAccess();
  renderTeams();
  renderStages();
  renderResults();
  renderTeamVisuals();
  renderJerseyLogData();
  renderParticipantTeamsData();
  renderProgressData();
  renderRiderPerformanceData();
  renderSwapLogData();
  renderPrizePotData();
  renderHistoryData();
  renderChartsData();
  renderTourData();
  renderFeedback();
  renderAdminAccess();
  renderAdminOverview();
  renderPossibleErrors();
  renderLogicTests();
  renderAdminLog();
  persistState();
}

function activateTab(tabName) {
  document.querySelectorAll("[data-tab-target]").forEach((button) => {
  if (tabName === "admin") {
    renderRoundIntro();
    renderAdminSettings();
  }
    button.classList.toggle("active", button.dataset.tabTarget === tabName);
  });
  document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.tabPanel === tabName);
  });
}

function migrateState(savedState) {
  const nextState = savedState ? { ...structuredClone(exampleState), ...savedState } : structuredClone(exampleState);
  nextState.settings = normalizeSettings(nextState.settings);
  if (PRICE_VERSION && nextState.priceVersion !== PRICE_VERSION) {
    nextState.priceOverwriteCandidates = { ...(nextState.settings.bcPrices || {}) };
    nextState.settings.bcPrices = {};
    nextState.priceVersion = PRICE_VERSION;
  }
  nextState.manualSwaps = Array.isArray(nextState.manualSwaps) ? nextState.manualSwaps : [];
  applyTeamColorPalette(nextState);
  if (nextState.dataVersion !== DATA_VERSION) {
    nextState.dataVersion = DATA_VERSION;
  }
  return nextState;
}

function applyTeamColorPalette(nextState) {
  if (nextState.teamColorPaletteVersion === TEAM_COLOR_PALETTE_VERSION) return;
  (nextState.teams || []).forEach((team) => {
    const key = team.teamName || team.name;
    const colors = TEAM_COLOR_PALETTE[key];
    if (!colors) return;
    [team.color1, team.color2] = colors;
  });
  nextState.teamColorPaletteVersion = TEAM_COLOR_PALETTE_VERSION;
}

function normalizeSettings(settings = {}) {
  return {
    ...structuredClone(exampleState.settings),
    ...settings,
    bcPrices: settings.bcPrices || {},
    exchangeWindows: normalizeExchangeWindows(settings.exchangeWindows),
    prizePotSplit: normalizePrizePotSplit(settings.prizePotSplit),
    prizeWeights: normalizePrizeWeights(settings.prizeWeights)
  };
}

function normalizeExchangeWindows(windows = []) {
  const fallback = structuredClone(exampleState.settings.exchangeWindows);
  const source = Array.isArray(windows) && windows.length ? windows : fallback;
  return source.map((window, index) => ({
    label: window.label || fallback[index]?.label || `Wisselvenster ${index + 1}`,
    afterStage: Number(window.afterStage ?? fallback[index]?.afterStage ?? 0),
    from: window.from || "",
    until: window.until || ""
  }));
}

function normalizePrizeWeights(prizeWeights = {}) {
  return {
    final: {
      ...DEFAULT_PRIZE_WEIGHTS.final,
      ...(prizeWeights.final || {})
    },
    daily: {
      ...DEFAULT_PRIZE_WEIGHTS.daily,
      ...(prizeWeights.daily || {})
    }
  };
}

function normalizePrizePotSplit(prizePotSplit = {}) {
  return {
    final: Number.isFinite(Number(prizePotSplit.final)) ? Number(prizePotSplit.final) : DEFAULT_PRIZE_POT_SPLIT.final,
    daily: Number.isFinite(Number(prizePotSplit.daily)) ? Number(prizePotSplit.daily) : DEFAULT_PRIZE_POT_SPLIT.daily
  };
}

function renderAdminSettings() {
  state.settings.prizePotSplit = normalizePrizePotSplit(state.settings.prizePotSplit);
  state.settings.prizeWeights = normalizePrizeWeights(state.settings.prizeWeights);
  if (els.introEditor && document.activeElement !== els.introEditor) {
    const savedIntro = sanitizeIntroHtml(state.settings.introHtml || "");
    const currentIntro = document.getElementById("roundIntroContent")?.innerHTML || "";
    els.introEditor.innerHTML = hasVisibleIntroContent(savedIntro) ? savedIntro : sanitizeIntroHtml(currentIntro);
    els.introEditor.dataset.adminPreviousValue = els.introEditor.innerHTML;
    delete els.introEditor.dataset.edited;
  }
  renderPrizeWeightEditor();
  renderBcPriceEditor();
  renderExchangeWindowEditor();
  [els.stake, els.budget, els.stageCount, els.finalPotPercentage, els.dailyPotPercentage].forEach((input) => {
    if (input) input.dataset.adminPreviousValue = input.value;
  });
}

function renderPrizeWeightEditor() {
  if (!els.prizeWeightEditor) return;
  const standings = calculateStandings(state);
  const money = calculateMoney(standings, state);
  els.prizeWeightEditor.innerHTML = renderPrizePotOverview(money, { editable: true });
  els.prizeWeightEditor.querySelectorAll("[data-prize-weight]").forEach((input) => {
    input.dataset.adminPreviousValue = input.value;
  });
}

function renderBcPriceEditor() {
  if (!els.bcPriceEditor) return;
  if (!tourRiders.length) {
    els.bcPriceEditor.textContent = "BC-prijslijst wordt geladen...";
    return;
  }
  els.bcPriceEditor.innerHTML = `
    <table>
      <thead><tr><th>Renner</th><th>Team</th><th>BC-score</th></tr></thead>
      <tbody>
        ${tourRiders.map((rider) => `
          <tr>
            <td>${escapeHtml(rider.displayName)}</td>
            <td>${escapeHtml(rider.team || "")}</td>
            <td><input data-bc-price="${escapeAttr(rider.name)}" type="number" min="0" step="0.001" value="${formatInputNumber(rider.bc || rider.price || 0)}"></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
  els.bcPriceEditor.querySelectorAll("[data-bc-price]").forEach((input) => {
    input.dataset.adminPreviousValue = input.value;
  });
}

function renderExchangeWindowEditor() {
  if (!els.exchangeWindowEditor) return;
  const windows = normalizeExchangeWindows(state.settings.exchangeWindows);
  els.exchangeWindowEditor.innerHTML = `
    <table>
      <thead><tr><th>Naam</th><th>Na etappe</th><th>Open vanaf</th><th>Open tot en met</th></tr></thead>
      <tbody>
        ${windows.map((window, index) => `
          <tr>
            <td><input data-exchange-window="${index}.label" value="${escapeAttr(window.label)}"></td>
            <td><input data-exchange-window="${index}.afterStage" type="number" min="0" step="1" value="${Number(window.afterStage || 0)}"></td>
            <td><input data-exchange-window="${index}.from" type="datetime-local" value="${escapeAttr(window.from || "")}"></td>
            <td><input data-exchange-window="${index}.until" type="datetime-local" value="${escapeAttr(window.until || "")}"></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
  els.exchangeWindowEditor.querySelectorAll("[data-exchange-window]").forEach((input) => {
    input.dataset.adminPreviousValue = input.value;
  });
}

function applyBcPriceOverrides() {
  if (!tourRiders.length) return;
  tourRiders.forEach((rider) => {
    const override = getBcPriceOverride(rider.name);
    if (Number.isFinite(override)) {
      rider.bc = override;
      rider.price = override;
    }
  });
}

function getBcPriceOverride(riderName) {
  const raw = state.settings.bcPrices?.[normalizeName(riderName)];
  if (raw == null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function getPrizeWeightValue(path) {
  const [scope, key] = String(path || "").split(".");
  return Number(state.settings.prizeWeights?.[scope]?.[key] ?? 0);
}

function getPrizeWeights(currentState) {
  return normalizePrizeWeights(currentState.settings?.prizeWeights);
}

function getPrizePotSplit(currentState) {
  return normalizePrizePotSplit(currentState.settings?.prizePotSplit);
}

function sumClassificationWeights(weights) {
  return CLASSIFICATIONS.reduce((sum, classification) => sum + Number(weights?.[classification.id] || 0), 0);
}

function sumFinalPrizeWeights(weights) {
  return sumClassificationWeights(weights) + Number(weights?.general2 || 0) + Number(weights?.general3 || 0);
}

async function loadOfficialStages(options = {}) {
  const stages = [];
  for (const stage of OFFICIAL_STAGE_FILES) {
    const response = await fetch(stage.url);
    if (!response.ok) continue;
    const csv = await response.text();
    stages.push({
      name: stage.name,
      results: importStageCsv(csv),
      importCsv: csv
    });
  }
  if (stages.length > 0) {
    state.stages = stages;
    state.dataVersion = DATA_VERSION;
  }
  if (options.loadTeams) {
    try {
      const response = await fetch(ROUND_FILES.teams || "", { cache: "no-store" });
      if (response.ok) {
        const payload = await response.json();
        state.settings.budget = Number(payload.budget || ROUND_SETTINGS.budget || 20000);
        state.teams = payload.teams || [];
      }
    } catch {
      state.settings.budget = Number(ROUND_SETTINGS.budget || 20000);
    }
  }
  tourRiders = await loadTourRiderList();
  recordOverwrittenPriceWarnings();
  withdrawalRecords = await loadWithdrawalRecords();
  applyWithdrawalRecordsToTourRiders();
}

async function loadTourRiderList() {
  try {
    const [startResponse, bcResponse] = await Promise.all([
      fetch(ROUND_FILES.startlist || "", { cache: "no-store" }),
      fetch(ROUND_FILES.prices || "", { cache: "no-store" })
    ]);
    const startRows = startResponse.ok ? parseDelimitedRows(await startResponse.text()) : [];
    const bcRows = bcResponse.ok ? parseDelimitedRows(await bcResponse.text()) : [];
    const bcByName = new Map();
    const [, ...bcBody] = bcRows;
    bcBody.forEach((row) => {
      const name = row[0] || "";
      if (!name) return;
      bcByName.set(normalizeName(name), {
        bc: parseLocaleNumber(row[1]) || 0,
        rank: row[2] || "",
        bcTeam: row[3] || ""
      });
    });

    const [, ...startBody] = startRows;
    const riders = startBody
      .map((row) => {
        const rawName = row[1] || "";
        const status = parseRiderStatus(rawName);
        const name = stripRiderStatus(rawName);
        if (!name) return null;
        const bc = bcByName.get(normalizeName(name)) || {};
        const priceOverride = getBcPriceOverride(name);
        const price = Number.isFinite(priceOverride) ? priceOverride : (bc.bc || 0);
        return {
          bib: row[0] || "",
          name,
          displayName: fallbackRiderName(name),
          team: row[3] || bc.bcTeam || "",
          youth: isTruthyCell(row[4]) ? "Ja" : "",
          bc: price,
          price,
          basePrice: Number(bc.bc || 0),
          rank: bc.rank || "",
          status
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "nl"));
    return riders;
  } catch {
    return [];
  }
}

async function loadWithdrawalRecords() {
  try {
    const response = await fetch(WITHDRAWAL_FILE);
    if (!response.ok) return [];
    const rows = parseDelimitedRows(await response.text());
    const [, ...body] = rows;
    return body
      .map((row) => {
        const name = row[0] || "";
        const code = String(row[2] || "").toUpperCase();
        const stage = Number(row[3]);
        const effectiveStage = Number(row[4]);
        if (!name || !code || !Number.isFinite(stage)) return null;
        return {
          name,
          displayName: fallbackRiderName(name),
          team: row[1] || "",
          code,
          stage,
          effectiveStage: Number.isFinite(effectiveStage) ? effectiveStage : stage,
          source: row[5] || ""
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function applyWithdrawalRecordsToTourRiders() {
  if (!withdrawalRecords.length || !tourRiders.length) return;
  withdrawalRecords.forEach((record) => {
    const rider = tourRiders.find((item) => riderNamesMatch(normalizeName(item.name), normalizeName(record.name)));
    if (!rider) return;
    const existing = rider.status;
    if (!existing || record.effectiveStage < existing.effectiveStage) {
      rider.status = {
        code: record.code,
        stage: record.stage,
        effectiveStage: record.effectiveStage,
        source: record.source
      };
    }
  });
}

function loadParticipantAccess() {
  try {
    return JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}-participant-access`)) || null;
  } catch {
    return null;
  }
}

function getOrCreateClientId() {
  const key = `${STORAGE_PREFIX}-client-id`;
  let clientId = localStorage.getItem(key);
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem(key, clientId);
  }
  return clientId;
}

function participantMatches(team, access = participantAccess) {
  if (!team || !access) return false;
  return normalizeName(team.name) === normalizeName(access.name)
    && normalizeName(team.teamName) === normalizeName(access.teamName);
}

function openParticipantSelection(createIfMissing) {
  const name = String(els.participantName?.value || "").trim();
  const teamName = String(els.participantTeamName?.value || "").trim();
  if (!name || !teamName) {
    showParticipantAccessStatus("Vul zowel je naam als je teamnaam in.", "error");
    return;
  }
  const existingIndex = state.teams.findIndex((team) => participantMatches(team, { name, teamName }));
  if (existingIndex < 0 && !createIfMissing) {
    showParticipantAccessStatus("Geen selectie gevonden met deze combinatie. Controleer de spelling of maak een nieuwe selectie.", "error");
    return;
  }
  if (existingIndex >= 0 && createIfMissing) {
    showParticipantAccessStatus("Deze combinatie bestaat al. Gebruik ?Selectie ophalen?.", "error");
    return;
  }
  if (existingIndex < 0) {
    state.teams.push({
      name,
      teamName,
      color1: "#1d4ed8",
      color2: "#f97316",
      riders: "",
      reserves: ""
    });
    persistState();
  }
  participantAccess = { name, teamName };
  localStorage.setItem(`${STORAGE_PREFIX}-participant-access`, JSON.stringify(participantAccess));
  persistClientState();
  render();
  showParticipantAccessStatus(existingIndex >= 0 ? "Selectie opgehaald. Je kunt deze hieronder aanpassen." : "Nieuwe selectie aangemaakt. Stel hieronder je ploeg samen.", "success");
}

function renderParticipantAccess() {
  const accessibleTeam = state.teams.find((team) => participantMatches(team));
  if (participantAccess && !accessibleTeam) participantAccess = null;
  if (els.participantName && participantAccess) els.participantName.value = participantAccess.name;
  if (els.participantTeamName && participantAccess) els.participantTeamName.value = participantAccess.teamName;
  els.closeSelection?.classList.toggle("is-hidden", !participantAccess);
  document.getElementById("saveTeamsButton")?.classList.toggle("is-hidden", !participantAccess);
  document.querySelectorAll(".game-change-toggle").forEach((element) => element.classList.toggle("is-hidden", !participantAccess));
  if (!participantAccess) showParticipantAccessStatus(storageSyncError || "Haal je selectie op of maak een nieuwe selectie om te beginnen.", storageSyncError ? "error" : "pending");
}

function showParticipantAccessStatus(message, type = "") {
  if (!els.participantAccessStatus) return;
  els.participantAccessStatus.textContent = message;
  els.participantAccessStatus.className = `save-status ${type ? `save-status-${type}` : ""}`.trim();
}

function renderTeams() {
  els.teams.innerHTML = "";
  if (!participantAccess) {
    els.teams.innerHTML = "<p class=\"hint\">Vul hierboven je naam en teamnaam in om je eigen selectie te openen.</p>";
    return;
  }
  const accessibleEntries = state.teams
    .map((team, index) => ({ team, index }))
    .filter(({ team }) => participantMatches(team));
  if (!accessibleEntries.length) return;
  accessibleEntries.forEach(({ team, index }) => {
    const active = padRiderSlots(parseRiderList(team.riders), STARTER_COUNT);
    const reserve = padRiderSlots(parseRiderList(team.reserves), RESERVE_COUNT);
    const initialBudget = calculateTeamBudgetFromLists(active, reserve);

    const wrapper = document.createElement("article");
    wrapper.className = "team";
    wrapper.innerHTML = `
      <header class="team-selection-header">
        <div class="team-selection-title">
          ${renderTeamKit(teamKey(team))}
          <div>
            <strong>${escapeHtml(`${team.teamName || team.name} (ploegleider: ${team.name})`)}</strong>
          </div>
        </div>
        <div class="team-selection-metrics">
          <div class="team-selection-metric ${initialBudget.overBudget ? "over" : "budget-left"}" data-team-summary="${index}">${formatTeamSelectionSummary(initialBudget)}</div>
          <div class="team-selection-metric" data-active-count="${index}">${initialBudget.activeCount}/${STARTER_COUNT} starters</div>
          <div class="team-selection-metric" data-reserve-count="${index}">${initialBudget.reserveCount}/${RESERVE_COUNT} reserves</div>
          <div class="team-selection-metric ${initialBudget.overBudget ? "over" : "budget-left"}" data-budget-status="${index}">${formatBudgetStatus(initialBudget)}</div>
        </div>
      </header>
      <details class="team-editor">
        <summary>Aanpassen</summary>
        <div class="team-grid">
          <label>
            Deelnemer
            <input data-team-name="${index}" value="${escapeAttr(team.name)}" readonly>
          </label>
          <label>
            Teamnaam
            <input data-team-title="${index}" value="${escapeAttr(team.teamName || "")}" readonly>
          </label>
          <label>
            Kleur 1
            <input data-team-color1="${index}" type="color" value="${escapeAttr(team.color1 || "#f6d32d")}">
          </label>
          <label>
            Kleur 2
            <input data-team-color2="${index}" type="color" value="${escapeAttr(team.color2 || "#ffffff")}">
          </label>
          <p data-color-status="${index}" class="color-status ${validateTeamColors(team.color1, team.color2).valid ? "" : "color-status-error"}">${escapeHtml(validateTeamColors(team.color1, team.color2).message)}</p>
        </div>
        <div class="team-picker-grid">
          <details class="rider-overview-section team-selection-collapsible" open>
            <summary>Startlijst <span data-active-count-inline="${index}">${initialBudget.activeCount}/${STARTER_COUNT} starters</span> <span data-reserve-count-inline="${index}">${initialBudget.reserveCount}/${RESERVE_COUNT} reserves</span></summary>
            ${renderRiderTeamOverview(index, active, reserve)}
          </details>
          <details class="selected-roster-section team-selection-collapsible" open>
            <summary>Geselecteerde ploeg</summary>
            <div class="selected-roster-heading">
              <button type="button" class="secondary clear-team-riders-button" data-clear-team-riders="${index}">Verwijder alle renners uit mijn selectie</button>
            </div>
            <div data-selected-roster="${index}">
              ${renderSelectedRosterPanel(index, active, reserve)}
            </div>
          </details>
        </div>
        <p data-rider-status="${index}" class="rider-status ${validateTeamRidersFromLists(active, reserve).valid ? "" : "rider-status-error"}">${escapeHtml(validateTeamRidersFromLists(active, reserve).message)}</p>
      </details>
    `;
    els.teams.appendChild(wrapper);
    updateTeamRiderAvailability(index);
  });
  renderTeamSelectionMatrix();
}

function renderTeamSelectionMatrix() {
  if (!els.teamSelectionMatrix) return;
  if (!state.teams.length) {
    els.teamSelectionMatrix.innerHTML = "<p class=\"hint\">Nog geen teams.</p>";
    return;
  }
  const rows = buildTeamSelectionMatrixRows();
  if (!rows.length) {
    els.teamSelectionMatrix.innerHTML = "<p class=\"hint\">Nog geen renners gekozen.</p>";
    return;
  }
  const maxCount = Math.max(...rows.map((row) => row.total), 1);
  els.teamSelectionMatrix.innerHTML = `
    <div class="team-selection-matrix-scroll">
      <table>
        <thead>
          <tr>
            <th>Renner</th>
            <th>BC</th>
            <th>Totaal</th>
            ${state.teams.map((team) => `<th class="team-matrix-team-heading" title="${escapeAttr(displayTeamWithManager(team))}"><span>${escapeHtml(displayTeamWithManager(team))}</span></th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => {
            const intensity = row.total / maxCount;
            return `
              <tr>
                <td class="${row.youth ? "rider-choice-youth" : ""}">${escapeHtml(row.displayName)}</td>
                <td>${formatNumber(row.price)}</td>
                <td><span class="selection-count selection-count-${selectionCountClass(intensity)}">${row.total}</span></td>
                ${row.teams.map((cell) => `<td class="matrix-cell matrix-cell-${cell.kind || "empty"}">${cell.label}</td>`).join("")}
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function buildTeamSelectionMatrixRows() {
  const byRider = new Map();
  state.teams.forEach((team, teamIndex) => {
    const active = getCurrentTeamRiders(teamIndex, "rider", team.riders);
    const reserves = getCurrentTeamRiders(teamIndex, "reserve", team.reserves);
    active.forEach((rider) => addMatrixRider(byRider, rider, teamIndex, "starter"));
    reserves.forEach((rider) => addMatrixRider(byRider, rider, teamIndex, "reserve"));
  });
  return [...byRider.values()]
    .map((row) => ({
      ...row,
      teams: state.teams.map((_, index) => row.teams[index] || { kind: "", label: "" }),
      total: row.total || 0
    }))
    .sort((a, b) => {
      const totalCompare = b.total - a.total;
      if (totalCompare) return totalCompare;
      return a.displayName.localeCompare(b.displayName, "nl");
    });
}

function getCurrentTeamRiders(teamIndex, kind, fallbackText) {
  const selector = `[data-team-${kind === "rider" ? "rider" : "reserve"}-choice="${teamIndex}"]`;
  if (document.querySelector(selector)) return readSelectedRidersFromDom(teamIndex, kind);
  return parseRiderList(fallbackText);
}

function addMatrixRider(byRider, rider, teamIndex, kind) {
  if (!rider?.name) return;
  const key = normalizeName(rider.name);
  const existing = byRider.get(key) || {
    name: rider.name,
    displayName: findRiderDisplayName(rider.name),
    price: Number(rider.price || findRiderPrice(rider.name) || 0),
    youth: rider.youth || isYouthRider(rider.name),
    total: 0,
    teams: {}
  };
  existing.total += 1;
  existing.teams[teamIndex] = {
    kind,
    label: kind === "starter" ? "S" : "R"
  };
  byRider.set(key, existing);
}

function findRiderPrice(riderName) {
  const key = normalizeName(riderName);
  const rider = tourRiders.find((item) => normalizeName(item.name) === key);
  if (!rider) return 0;
  return Number(rider.bc || rider.price || 0);
}

function selectionCountClass(intensity) {
  if (intensity >= 0.8) return "high";
  if (intensity >= 0.5) return "medium";
  if (intensity >= 0.25) return "low";
  return "rare";
}

function padRiderSlots(riders, count) {
  return [...riders, ...Array.from({ length: count }, () => ({ name: "", price: 0 }))].slice(0, count);
}

function renderRiderTeamOverview(teamIndex, activeRiders, reserveRiders) {
  const activeNames = new Set(activeRiders.map((rider) => normalizeName(rider.name)).filter(Boolean));
  const reserveNames = new Set(reserveRiders.map((rider) => normalizeName(rider.name)).filter(Boolean));
  const options = riderDropdownOptions();
  const groups = new Map();
  options.forEach((option) => {
    const team = option.team || "Onbekend team";
    if (!groups.has(team)) groups.set(team, []);
    groups.get(team).push(option);
  });

  return `
    <div class="rider-team-overview" data-team-rider-list="${teamIndex}" data-team-reserve-list="${teamIndex}" data-rider-overview="${teamIndex}" data-max-riders="${STARTER_COUNT}" data-max-reserves="${RESERVE_COUNT}">
      ${[...groups.entries()].sort(([teamA], [teamB]) => teamA.localeCompare(teamB, "nl")).map(([team, riders]) => `
        <section class="rider-team-group">
          <h5>${escapeHtml(team)}</h5>
          <table class="rider-team-table">
            <thead><tr><th>S</th><th>R</th><th>Renner</th><th>BC</th></tr></thead>
            <tbody>
              ${riders.map((option) => {
                const key = normalizeName(option.name);
                const youthClass = option.youth === "Ja" ? "rider-choice-youth" : "";
                const statusLabel = riderStatusBadge(option.name);
                return `
                  <tr class="rider-choice ${youthClass} ${statusLabel ? "rider-choice-withdrawn" : ""}" data-choice-label="${teamIndex}">
                    <td><input type="checkbox" data-team-rider-choice="${teamIndex}" data-rider-name="${escapeAttr(option.name)}" data-price="${Number(option.bc || option.price || 0)}" data-youth="${option.youth === "Ja" ? "1" : "0"}" ${activeNames.has(key) ? "checked" : ""}></td>
                    <td><input type="checkbox" data-team-reserve-choice="${teamIndex}" data-rider-name="${escapeAttr(option.name)}" data-price="${Number(option.bc || option.price || 0)}" data-youth="${option.youth === "Ja" ? "1" : "0"}" ${reserveNames.has(key) ? "checked" : ""}></td>
                    <td><span data-choice-text>${escapeHtml(option.displayName || formatRiderName(option.name))}</span>${statusLabel}</td>
                    <td>${formatNumber(Number(option.bc || option.price || 0))}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </section>
      `).join("")}
    </div>
  `;
}

function renderSelectedRosterPanel(teamIndex, activeRiders, reserveRiders) {
  return `
    <div class="selected-roster-grid">
      ${renderRosterList(teamIndex, "rider", "Startteam", activeRiders, STARTER_COUNT)}
      ${renderRosterList(teamIndex, "reserve", "Reserves", reserveRiders, RESERVE_COUNT)}
    </div>
  `;
}

function renderRosterList(teamIndex, kind, title, riders, targetCount) {
  const rows = riders
    .filter((rider) => rider.name)
    .map((rider, index) => ({
      ...rider,
      priority: kind === "reserve" ? (rider.priority || index + 1) : index + 1,
      displayName: findRiderDisplayName(rider.name),
      youth: rider.youth || isYouthRider(rider.name)
    }));

  return `
    <div class="roster-column roster-column-${kind}">
      <h5>${escapeHtml(title)} <span>${rows.length}/${targetCount}</span></h5>
      <div class="roster-list" data-roster-list="${teamIndex}" data-roster-kind="${kind}">
        ${rows.length ? rows.map((rider, index) => renderRosterRow(teamIndex, kind, rider, index + 1)).join("") : "<p class=\"hint roster-empty\">Nog geen renners gekozen.</p>"}
      </div>
    </div>
  `;
}

function renderRosterRow(teamIndex, kind, rider, position) {
  return `
    <div class="roster-row ${rider.youth ? "rider-choice-youth" : ""}" draggable="true" data-roster-team="${teamIndex}" data-roster-kind="${kind}" data-roster-rider="${escapeAttr(rider.name)}" data-price="${Number(rider.price || 0)}" data-youth="${rider.youth ? "1" : "0"}">
      <span class="roster-grip" aria-hidden="true">&#8597;</span>
      <span class="roster-position">${position}</span>
      <span class="roster-name">${escapeHtml(rider.displayName)}</span>
      <span class="roster-price">${formatNumber(Number(rider.price || 0))}</span>
    </div>
  `;
}

function findRiderDisplayName(riderName) {
  const rider = tourRiders.find((item) => normalizeName(item.name) === normalizeName(riderName));
  return rider?.displayName || formatRiderName(riderName);
}

function riderStatusBadge(riderName) {
  const status = getStartlistStatus(riderName);
  if (!status) return "";
  const label = `${status.code}${Number.isFinite(status.stage) ? status.stage : ""}`;
  const title = `${status.code} in etappe ${status.stage}; niet inzetbaar vanaf etappe ${status.effectiveStage}`;
  return ` <span class="rider-status-badge" title="${escapeAttr(title)}">${escapeHtml(label)}</span>`;
}

function riderDropdownOptions() {
  const options = tourRiders.length ? tourRiders : riderFallbackOptions();
  return [...options].sort((a, b) => {
    const surnameCompare = riderSurnameSortKey(a).localeCompare(riderSurnameSortKey(b), "nl");
    if (surnameCompare) return surnameCompare;
    return (a.displayName || formatRiderName(a.name)).localeCompare(b.displayName || formatRiderName(b.name), "nl");
  });
}

function riderSurnameSortKey(rider) {
  return normalizeName(rider.name || rider.displayName || "");
}

function formatRiderDropdownLabel(rider) {
  const name = rider.displayName || formatRiderName(rider.name);
  const price = formatNumber(Number(rider.bc || rider.price || 0));
  return `${name} (${price} BC)`;
}

function getTeamIndexFromControl(control) {
  const attributes = [
    "teamName",
    "teamTitle",
    "teamColor1",
    "teamColor2",
    "teamRiderChoice",
    "teamReserveChoice",
    "teamReservePriority"
  ];
  for (const key of attributes) {
    if (control.dataset[key] != null) return Number(control.dataset[key]);
  }
  return null;
}

function updateTeamBudgetStatus(teamIndex) {
  const active = readSelectedRidersFromDom(teamIndex, "rider");
  const reserves = readSelectedRidersFromDom(teamIndex, "reserve");
  const budget = calculateTeamBudgetFromLists(active, reserves);
  document.querySelectorAll(`[data-budget-status="${teamIndex}"]`).forEach((budgetCell) => {
    budgetCell.textContent = formatBudgetStatus(budget);
    budgetCell.classList.toggle("over", budget.overBudget);
    budgetCell.classList.toggle("budget-left", !budget.overBudget);
  });
  document.querySelectorAll(`[data-active-count="${teamIndex}"]`).forEach((activeCell) => {
    activeCell.textContent = `${budget.activeCount}/${STARTER_COUNT} starters`;
  });
  document.querySelectorAll(`[data-reserve-count="${teamIndex}"]`).forEach((reserveCell) => {
    reserveCell.textContent = `${budget.reserveCount}/${RESERVE_COUNT} reserves`;
  });
  document.querySelectorAll(`[data-team-summary="${teamIndex}"]`).forEach((summaryCell) => {
    summaryCell.textContent = formatTeamSelectionSummary(budget);
    summaryCell.classList.toggle("over", budget.overBudget);
    summaryCell.classList.toggle("budget-left", !budget.overBudget);
  });
  document.querySelectorAll(`[data-active-count-inline="${teamIndex}"]`).forEach((activeInline) => {
    activeInline.textContent = `${budget.activeCount}/${STARTER_COUNT}`;
  });
  document.querySelectorAll(`[data-reserve-count-inline="${teamIndex}"]`).forEach((reserveInline) => {
    reserveInline.textContent = `${budget.reserveCount}/${RESERVE_COUNT}`;
  });
}

function updateAllTeamColorStatus() {
  document.querySelectorAll("[data-color-status]").forEach((item) => {
    updateTeamColorStatus(Number(item.dataset.colorStatus));
  });
}

function updateTeamColorStatus(teamIndex) {
  const color1 = document.querySelector(`[data-team-color1="${teamIndex}"]`)?.value;
  const color2 = document.querySelector(`[data-team-color2="${teamIndex}"]`)?.value;
  const result = validateTeamColors(color1, color2);
  const status = document.querySelector(`[data-color-status="${teamIndex}"]`);
  const input1 = document.querySelector(`[data-team-color1="${teamIndex}"]`);
  const input2 = document.querySelector(`[data-team-color2="${teamIndex}"]`);
  if (status) {
    status.textContent = result.message;
    status.classList.toggle("color-status-error", !result.valid);
  }
  input1?.classList.toggle("input-error", !result.valid);
  input2?.classList.toggle("input-error", !result.valid);
}

function updateAllTeamRiderAvailability() {
  document.querySelectorAll("[data-rider-status]").forEach((item) => {
    updateTeamRiderAvailability(Number(item.dataset.riderStatus));
  });
}

function updateTeamRiderAvailability(teamIndex, options = {}) {
  if (!options.preserveRoster) {
    updateSelectedRosterPanel(teamIndex);
  } else {
    updateRosterPositions(teamIndex);
  }
  const choices = [...document.querySelectorAll(`[data-team-rider-choice="${teamIndex}"], [data-team-reserve-choice="${teamIndex}"]`)];
  const selectedCounts = new Map();
  choices.forEach((choice) => {
    if (!choice.checked) return;
    const key = normalizeName(choice.dataset.riderName);
    if (!key) return;
    selectedCounts.set(key, (selectedCounts.get(key) || 0) + 1);
  });

  const active = readSelectedRidersFromDom(teamIndex, "rider");
  const reserves = readSelectedRidersFromDom(teamIndex, "reserve");
  const budget = calculateTeamBudgetFromLists(active, reserves);
  const activeLimitReached = active.length >= STARTER_COUNT;
  const reserveLimitReached = reserves.length >= RESERVE_COUNT;
  document.querySelectorAll(`[data-choice-label="${teamIndex}"]`).forEach((row) => {
    const activeChoice = row.querySelector(`[data-team-rider-choice="${teamIndex}"]`);
    const reserveChoice = row.querySelector(`[data-team-reserve-choice="${teamIndex}"]`);
    const key = normalizeName(activeChoice?.dataset.riderName || reserveChoice?.dataset.riderName || "");
    const price = Number(activeChoice?.dataset.price || reserveChoice?.dataset.price || 0);
    const selectedAsActive = Boolean(activeChoice?.checked);
    const selectedAsReserve = Boolean(reserveChoice?.checked);
    const selectedHere = selectedAsActive || selectedAsReserve;
    const duplicateChecked = key && selectedCounts.get(key) > 1;
    const alreadyChosenElsewhere = !selectedHere && selectedCounts.has(key);
    const exceedsBudget = !selectedHere && !alreadyChosenElsewhere && budget.totalCost + price > budget.maxBudget;
    const budgetTitle = exceedsBudget
      ? `Met deze renner wordt het budget met ${formatNumber(budget.totalCost + price - budget.maxBudget)} BC overschreden.`
      : "";
    if (activeChoice) {
      activeChoice.disabled = selectedAsReserve || alreadyChosenElsewhere || exceedsBudget;
      activeChoice.classList.toggle("input-error", Boolean(duplicateChecked));
      activeChoice.classList.toggle("choice-limit-reached", activeLimitReached && !selectedAsActive);
      activeChoice.title = budgetTitle || (activeLimitReached && !selectedAsActive
        ? `Er zijn al ${STARTER_COUNT} starters gekozen. Vink daarna een andere starter uit.`
        : "");
    }
    if (reserveChoice) {
      reserveChoice.disabled = selectedAsActive || alreadyChosenElsewhere || exceedsBudget;
      reserveChoice.classList.toggle("input-error", Boolean(duplicateChecked));
      reserveChoice.classList.toggle("choice-limit-reached", reserveLimitReached && !selectedAsReserve);
      reserveChoice.title = budgetTitle || (reserveLimitReached && !selectedAsReserve
        ? `Er zijn al ${RESERVE_COUNT} reserves gekozen. Vink daarna een andere reserve uit.`
        : "");
    }
    row.classList.toggle("rider-choice-disabled", selectedHere || alreadyChosenElsewhere || exceedsBudget);
    row.classList.toggle("rider-choice-over-budget", exceedsBudget);
    row.classList.toggle("rider-choice-duplicate", Boolean(duplicateChecked));
  });

  const result = validateTeamRidersFromLists(active, reserves);
  const status = document.querySelector(`[data-rider-status="${teamIndex}"]`);
  if (status) {
    status.textContent = result.message;
    status.classList.toggle("rider-status-error", !result.valid);
  }
}

function clearTeamRiderSelection(teamIndex) {
  document.querySelectorAll(`[data-team-rider-choice="${teamIndex}"], [data-team-reserve-choice="${teamIndex}"]`).forEach((choice) => {
    choice.checked = false;
    choice.disabled = false;
    choice.classList.remove("input-error");
  });
  updateSelectedRosterPanel(teamIndex);
  updateTeamRiderAvailability(teamIndex, { preserveRoster: true });
  updateTeamBudgetStatus(teamIndex);
  renderTeamSelectionMatrix();
}

function updateSelectedRosterPanel(teamIndex) {
  const container = document.querySelector(`[data-selected-roster="${teamIndex}"]`);
  if (!container) return;
  const active = readSelectedRidersFromCheckboxes(teamIndex, "rider");
  const reserves = readSelectedRidersFromCheckboxes(teamIndex, "reserve");
  const orderedActive = mergeRosterOrder(teamIndex, "rider", active);
  const orderedReserves = mergeRosterOrder(teamIndex, "reserve", reserves);
  container.innerHTML = renderSelectedRosterPanel(teamIndex, orderedActive, orderedReserves);
}

function mergeRosterOrder(teamIndex, kind, riders) {
  const byKey = new Map(riders.map((rider) => [normalizeName(rider.name), rider]));
  const ordered = [];
  document.querySelectorAll(`[data-roster-list="${teamIndex}"][data-roster-kind="${kind}"] [data-roster-rider]`).forEach((row) => {
    const key = normalizeName(row.dataset.rosterRider);
    const rider = byKey.get(key);
    if (!rider) return;
    ordered.push(rider);
    byKey.delete(key);
  });
  return [...ordered, ...byKey.values()];
}

function validateAllTeamColors() {
  return state.teams
    .map((team, index) => {
      const color1 = document.querySelector(`[data-team-color1="${index}"]`)?.value || team.color1;
      const color2 = document.querySelector(`[data-team-color2="${index}"]`)?.value || team.color2;
      const result = validateTeamColors(color1, color2);
      return result.valid ? null : `${displayTeamName(teamKey(team))}: ${result.message}`;
    })
    .filter(Boolean);
}

function validateAllTeamRiders() {
  return state.teams
    .map((team, index) => {
      if (!document.querySelector(`[data-team-name="${index}"]`)) return null;
      const active = readSelectedRidersFromDom(index, "rider");
      const reserves = readSelectedRidersFromDom(index, "reserve");
      const result = validateTeamRidersFromLists(active, reserves);
      return result.valid ? null : `${displayTeamName(teamKey(team))}: ${result.message}`;
    })
    .filter(Boolean);
}

function validateTeamRidersFromLists(active, reserves) {
  if (active.length !== STARTER_COUNT) {
    return { valid: false, message: `Kies precies ${STARTER_COUNT} starters (nu ${active.length}).` };
  }
  if (reserves.length > RESERVE_COUNT) {
    return { valid: false, message: `Kies maximaal ${RESERVE_COUNT} reserves.` };
  }
  const budget = calculateTeamBudgetFromLists(active, reserves);
  if (budget.overBudget) {
    return { valid: false, message: `Je selectie is ${formatNumber(Math.abs(budget.remaining))} BC te duur.` };
  }
  const counts = new Map();
  [...active, ...reserves].forEach((rider) => {
    const key = normalizeName(rider.name);
    if (!key) return;
    const current = counts.get(key) || { name: rider.name, count: 0 };
    current.count += 1;
    counts.set(key, current);
  });
  const duplicates = [...counts.values()].filter((item) => item.count > 1);
  if (duplicates.length) {
    return {
      valid: false,
      message: `Dubbel gekozen: ${duplicates.map((item) => formatRiderName(item.name)).join(", ")}.`
    };
  }
  return { valid: true, message: "" };
}

function validateTeamColors(color1, color2) {
  const category1 = restrictedColorCategory(color1);
  const category2 = restrictedColorCategory(color2);
  if (category1 && category1 === category2) {
    return {
      valid: false,
      message: `Kies niet twee keer ${category1} als teamkleur.`
    };
  }
  return { valid: true, message: "" };
}

function restrictedColorCategory(color) {
  const normalized = normalizeHexColor(color);
  if (normalized === "#ffffff") return "wit";
  if (normalized === "#009a44") return "groen";
  if (["#ffd900", "#f6d32d", "#facc15"].includes(normalized)) return "geel";
  return "";
}

function normalizeHexColor(color) {
  const raw = String(color || "").trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-f]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return raw;
}

function collectPendingTeamChanges() {
  return state.teams.map((team, index) => {
    if (!document.querySelector(`[data-team-name="${index}"]`)) return null;
    const active = readSelectedRidersFromDom(index, "rider");
    const reserves = readSelectedRidersFromDom(index, "reserve");
    const nextRiders = serializeRiderArray(active);
    const nextReserves = serializeRiderArray(reserves);
    const changed = nextRiders !== (team.riders || "") || nextReserves !== (team.reserves || "");
    const newName = document.querySelector(`[data-team-name="${index}"]`)?.value || team.name;
    return {
      teamIndex: index,
      teamName: newName,
      previousName: team.name,
      previousRiders: team.riders || "",
      previousReserves: team.reserves || "",
      previousInitialRiders: team.initialRiders || team.riders || "",
      previousInitialReserves: team.initialReserves || team.reserves || "",
      nextRiders,
      nextReserves,
      changed
    };
  }).filter((change) => change?.changed);
}

function registerManualTeamChanges(changes) {
  if (!changes.length) return;
  state.manualSwaps = Array.isArray(state.manualSwaps) ? state.manualSwaps : [];
  const stage = getManualSwapMoment();
  changes.forEach((change, index) => {
    const team = state.teams[change.teamIndex];
    if (!team) return;
    team.initialRiders = change.previousInitialRiders;
    team.initialReserves = change.previousInitialReserves;
    state.manualSwaps.push({
      id: `manual-${Date.now()}-${change.teamIndex}-${state.manualSwaps.length}-${index}`,
      teamIndex: change.teamIndex,
      teamId: team.id || "",
      teamName: change.teamName,
      afterStage: stage.number,
      stage: stage.label,
      riders: change.nextRiders,
      reserves: change.nextReserves,
      rows: buildManualSwapRows(change, stage.label)
    });
  });
}

function applyRetroactiveTeamChanges(changes) {
  if (!changes.length) return;
  const changedIndexes = new Set(changes.map((change) => change.teamIndex));
  state.manualSwaps = (state.manualSwaps || []).filter((swap) => !changedIndexes.has(Number(swap.teamIndex)));
  changes.forEach((change) => {
    const team = state.teams[change.teamIndex];
    if (!team) return;
    delete team.initialRiders;
    delete team.initialReserves;
  });
}

function getManualSwapMoment() {
  const loadedStages = (state.stages || []).filter((stage) => String(stage.results || "").trim());
  const lastStage = loadedStages
    .sort((a, b) => getStageNumber(a.name) - getStageNumber(b.name))
    .at(-1);
  const number = lastStage ? getStageNumber(lastStage.name) : 1;
  return {
    number,
    label: lastStage ? `Na ${lastStage.name}` : "Voor etappe 2"
  };
}

function isManualSwapAllowedNow() {
  const moment = getManualSwapMoment();
  if (els.restDayOverride?.checked) return true;
  return activeExchangeWindowForMoment(moment);
}

function activeExchangeWindowForMoment(moment) {
  const now = new Date();
  return normalizeExchangeWindows(state.settings.exchangeWindows).some((window) => {
    if (Number(window.afterStage) !== Number(moment.number)) return false;
    if (!window.from || !window.until) return REST_DAY_AFTER_STAGES.includes(moment.number);
    const from = new Date(window.from);
    const until = new Date(window.until);
    if (Number.isNaN(from.getTime()) || Number.isNaN(until.getTime())) return false;
    return now >= from && now <= until;
  });
}

function buildManualSwapRows(change, stageLabel) {
  const previousActive = parseRiderList(change.previousRiders);
  const nextActive = parseRiderList(change.nextRiders);
  const previousKeys = new Set(previousActive.map((rider) => normalizeName(rider.name)));
  const nextKeys = new Set(nextActive.map((rider) => normalizeName(rider.name)));
  const out = previousActive.filter((rider) => !nextKeys.has(normalizeName(rider.name)));
  const incoming = nextActive.filter((rider) => !previousKeys.has(normalizeName(rider.name)));
  const rows = [];
  const rowCount = Math.max(out.length, incoming.length);
  for (let index = 0; index < rowCount; index += 1) {
    rows.push({
      stage: stageLabel,
      teamName: change.teamName,
      type: "manual",
      out: out[index]?.name || "",
      in: incoming[index]?.name || "",
      reason: "Handmatige spelwissel via teamselectie"
    });
  }
  if (!rows.length) {
    rows.push({
      stage: stageLabel,
      teamName: change.teamName,
      type: "manual",
      out: "",
      in: "",
      reason: "Handmatige wijziging in reserves of reserveprioriteit"
    });
  }
  return rows;
}

function serializeRiderArray(riders) {
  return riders
    .map((rider) => `${rider.name}, ${Number(rider.price || getCurrentRiderPrice(rider.name, 0) || 0)}`)
    .join("\n");
}

function readSelectedRidersFromDom(teamIndex, kind) {
  const rosterRows = [...document.querySelectorAll(`[data-roster-list="${teamIndex}"][data-roster-kind="${kind}"] [data-roster-rider]`)];
  if (rosterRows.length) {
    return rosterRows.map((row, index) => ({
      name: row.dataset.rosterRider || "",
      price: Number(row.dataset.price || 0),
      youth: row.dataset.youth === "1",
      priority: kind === "reserve" ? index + 1 : 0
    })).filter((rider) => rider.name);
  }
  return readSelectedRidersFromCheckboxes(teamIndex, kind);
}

function readSelectedRidersFromCheckboxes(teamIndex, kind) {
  const riders = [...document.querySelectorAll(`[data-team-${kind}-choice="${teamIndex}"]:checked`)]
    .map((choice) => ({
      name: choice.dataset.riderName || "",
      price: Number(choice.dataset.price || 0),
      youth: choice.dataset.youth === "1",
      priority: 0
    }))
    .filter((rider) => rider.name);
  return riders;
}

function updateCheckboxesFromRoster(teamIndex) {
  const activeNames = new Set([...document.querySelectorAll(`[data-roster-list="${teamIndex}"][data-roster-kind="rider"] [data-roster-rider]`)]
    .map((row) => normalizeName(row.dataset.rosterRider)));
  const reserveNames = new Set([...document.querySelectorAll(`[data-roster-list="${teamIndex}"][data-roster-kind="reserve"] [data-roster-rider]`)]
    .map((row) => normalizeName(row.dataset.rosterRider)));
  document.querySelectorAll(`[data-team-rider-choice="${teamIndex}"]`).forEach((choice) => {
    choice.checked = activeNames.has(normalizeName(choice.dataset.riderName));
  });
  document.querySelectorAll(`[data-team-reserve-choice="${teamIndex}"]`).forEach((choice) => {
    choice.checked = reserveNames.has(normalizeName(choice.dataset.riderName));
  });
}

function updateRosterPositions(teamIndex) {
  document.querySelectorAll(`[data-roster-list="${teamIndex}"]`).forEach((list) => {
    const kind = list.dataset.rosterKind;
    const targetCount = kind === "rider" ? STARTER_COUNT : RESERVE_COUNT;
    const title = list.closest(".roster-column")?.querySelector("h5 span");
    const rows = [...list.querySelectorAll("[data-roster-rider]")];
    rows.forEach((row, index) => {
      const position = row.querySelector(".roster-position");
      if (position) position.textContent = String(index + 1);
      row.dataset.rosterKind = kind;
    });
    if (title) title.textContent = `${rows.length}/${targetCount}`;
    list.querySelector(".roster-empty")?.remove();
    if (!rows.length) {
      list.innerHTML = "<p class=\"hint roster-empty\">Nog geen renners gekozen.</p>";
    }
  });
}

function setRosterDropTarget(list) {
  document.querySelectorAll(".roster-list-drop-target").forEach((item) => {
    item.classList.toggle("roster-list-drop-target", item === list);
  });
  list.classList.add("roster-list-drop-target");
}

function clearRosterDropTargets() {
  document.querySelectorAll(".roster-list-drop-target").forEach((item) => {
    item.classList.remove("roster-list-drop-target");
  });
}

function getRosterInsertBefore(list, pointerY) {
  const rows = [...list.querySelectorAll("[data-roster-rider]:not(.roster-dragging)")];
  return rows.reduce((closest, row) => {
    const box = row.getBoundingClientRect();
    const offset = pointerY - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, row };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, row: null }).row;
}

function rebalanceRosterLists(teamIndex, targetList, movedRow) {
  if (!movedRow) return;
  const sourceKind = movedRow.dataset.dragSourceKind;
  const targetKind = targetList.dataset.rosterKind;
  if (!sourceKind || sourceKind === targetKind) return;

  const targetMax = targetKind === "rider" ? STARTER_COUNT : RESERVE_COUNT;
  const targetRows = [...targetList.querySelectorAll("[data-roster-rider]")];
  if (targetRows.length <= targetMax) return;

  const sourceList = document.querySelector(`[data-roster-list="${teamIndex}"][data-roster-kind="${sourceKind}"]`);
  if (!sourceList) return;
  sourceList.querySelector(".roster-empty")?.remove();

  const fallback = [...targetRows].reverse().find((row) => row !== movedRow);
  const displaced = movedRow.nextElementSibling?.matches?.("[data-roster-rider]")
    ? movedRow.nextElementSibling
    : fallback;
  if (displaced && displaced !== movedRow) {
    sourceList.appendChild(displaced);
  }
}

function canDropRosterRow(list, row) {
  const kind = list.dataset.rosterKind;
  const max = kind === "rider" ? STARTER_COUNT : RESERVE_COUNT;
  const current = list.querySelectorAll("[data-roster-rider]").length;
  const sourceKind = row.dataset.dragSourceKind;
  return list.contains(row) || current < max || (sourceKind && sourceKind !== kind);
}

function calculateTeamBudgetFromLists(active, reserves) {
  const maxBudget = Number(els.budget.value || state.settings.budget || 0);
  const totalCost = [...active, ...reserves].reduce((sum, rider) => sum + Number(rider.price || 0), 0);
  return {
    maxBudget,
    totalCost,
    remaining: maxBudget - totalCost,
    overBudget: totalCost > maxBudget,
    activeCount: active.filter((rider) => rider.name).length,
    reserveCount: reserves.filter((rider) => rider.name).length,
    youthActiveCount: active.filter((rider) => rider.youth || isYouthRider(rider.name)).length,
    youthReserveCount: reserves.filter((rider) => rider.youth || isYouthRider(rider.name)).length
  };
}

function formatBudgetStatus(budget) {
  const remainingLabel = budget.remaining >= 0
    ? `over: ${formatNumber(budget.remaining)} BC`
    : `tekort: ${formatNumber(Math.abs(budget.remaining))} BC`;
  return `${formatNumber(budget.totalCost)} / ${formatNumber(budget.maxBudget)} BC (${remainingLabel})`;
}

function formatTeamSelectionSummary(budget) {
  const remainingLabel = budget.remaining >= 0
    ? `${formatNumber(budget.remaining)} BC over`
    : `${formatNumber(Math.abs(budget.remaining))} BC tekort`;
  const youthTotal = budget.youthActiveCount + budget.youthReserveCount;
  return `${remainingLabel} | jongeren: ${youthTotal} (${budget.youthActiveCount} start, ${budget.youthReserveCount} reserve)`;
}

function isYouthRider(riderName) {
  const rider = tourRiders.find((item) => normalizeName(item.name) === normalizeName(riderName));
  return rider?.youth === "Ja";
}

function showTeamSaveStatus(message, type) {
  if (!els.teamSaveStatus) return;
  els.teamSaveStatus.textContent = message;
  els.teamSaveStatus.className = `save-status save-status-${type}`;
}

function riderFallbackOptions() {
  const riders = new Map();
  state.teams.forEach((team) => {
    [...parseRiderList(team.riders), ...parseRiderList(team.reserves)].forEach((rider) => {
      if (rider.name) riders.set(normalizeName(rider.name), { ...rider, displayName: formatRiderName(rider.name), bc: rider.price });
    });
  });
  return [...riders.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, "nl"));
}

function renderStages() {
  if (!els.stages) return;
  els.stages.innerHTML = "";
  state.stages.forEach((stage, index) => {
    stage.importCsv = stage.importCsv || "";
    const wrapper = document.createElement("article");
    wrapper.className = "stage";
    wrapper.innerHTML = `
      <div class="stage-grid">
        <label>
          Naam
          <input data-stage-name="${index}" value="${escapeAttr(stage.name)}">
        </label>
      </div>
      <label>
        Resultaten, een renner per regel
        <textarea data-stage-results="${index}">${escapeHtml(stage.results)}</textarea>
      </label>
      <details class="import-box">
        <summary>CSV of geplakte tabel importeren</summary>
        <label>
          CSV/tabel
          <textarea data-stage-csv="${index}" placeholder="renner,general,points,mountain,youth,winner">${escapeHtml(stage.importCsv)}</textarea>
        </label>
        <button type="button" data-import-stage="${index}">Converteer naar resultaten</button>
      </details>
    `;
    els.stages.appendChild(wrapper);
  });
}

function renderResults() {
  saveFromForm();
  persistState();

  const standings = calculateStandings(state);
  const money = calculateMoney(standings, state);

  els.results.innerHTML = "";
  els.results.appendChild(renderStageBar(state.stages));
  els.results.appendChild(renderLeaderAnchors(standings, money));
  els.results.appendChild(renderMoneyStanding(money));
  CLASSIFICATIONS.forEach((classification) => {
    els.results.appendChild(renderStanding(classification.label, standings.total[classification.id], classification));
  });
  bindResultDetailRows();
}

function renderStageBar(stages) {
  const loadedStageNumbers = new Set(stages
    .filter((stage) => stage.results?.trim())
    .map((stage) => getStageNumber(stage.name))
    .filter(Number.isFinite));
  const latestStageNumber = [...loadedStageNumbers].reduce((latest, stageNumber) => Math.max(latest, stageNumber), 0);
  const wrapper = document.createElement("section");
  wrapper.className = "stage-strip";
  wrapper.innerHTML = `
    <div class="stage-strip-title">
      <strong>Etappes</strong>
      <span>${escapeHtml(ROUND_CONFIG.name || "Wielerpool")} &middot; ${formatNumber(Number(ROUND_SETTINGS.stageCount || 0))} etappes</span>
    </div>
    <div class="stage-strip-track">
      ${TOUR_STAGES.map((stage) => renderStageStripItem(stage, {
        loaded: loadedStageNumbers.has(stage.number),
        current: stage.number === latestStageNumber
      })).join("")}
    </div>
  `;
  return wrapper;
}

function renderStageStripItem(stage, status) {
  const title = `Etappe ${stage.number}: ${stage.label} - ${stage.route} - ${stage.km} km`;
  return `
    <article class="stage-strip-item stage-strip-${stage.type} ${status.current ? "stage-strip-current" : ""} ${status.loaded ? "stage-strip-loaded" : "stage-strip-pending"}" title="${escapeAttr(title)}">
      <span>${stage.number}</span>
      ${renderStageProfileIcon(stage.type)}
      <small>${escapeHtml(stage.label)}</small>
    </article>
  `;
}

function renderStageProfileIcon(type) {
  const paths = {
    sprint: '<path d="M1 13 L9 12 L17 13 L25 11 L33 12"></path>',
    flat: '<path d="M1 13 L9 12 L17 13 L25 11 L33 12"></path>',
    hilly: '<path d="M1 14 L8 6 L14 13 L21 5 L27 12 L34 8"></path>',
    mountain: '<path d="M1 15 L8 11 L15 3 L20 11 L27 1 L34 12"></path>',
    "time-trial": '<circle cx="17" cy="9" r="7"></circle><path d="M17 2 V0 M14 0 H20 M17 9 L21 5"></path>'
  };
  return `<svg class="stage-strip-profile" viewBox="0 0 35 17" aria-hidden="true" focusable="false">${paths[type] || paths.flat}</svg>`;
}

function renderLeaderAnchors(standings, money) {
  const wrapper = document.createElement("section");
  wrapper.className = "leader-anchors";
  wrapper.innerHTML = `
    ${renderTeamStandingAnchorCard(money.rows || [])}
    ${CLASSIFICATIONS.map((classification) => renderLeaderAnchorCard(classification, standings.total[classification.id] || [])).join("")}
  `;
  return wrapper;
}

function renderLeaderAnchorCard(classification, rows) {
  const leader = rows[0];
  if (!leader) {
    return `
      <article class="leader-anchor leader-anchor-${classification.id}">
        <div class="leader-anchor-kit">${renderLeaderJersey(classification.id)}</div>
        <div>
          <h3>${escapeHtml(classification.label)}</h3>
          <p class="muted">Nog geen stand</p>
        </div>
      </article>
    `;
  }
  const leaderScore = formatStandingScore(leader, rows, classification);
  const gap = formatLeaderGap(rows, classification);
  return `
    <article class="leader-anchor leader-anchor-${classification.id}">
      <div class="leader-anchor-kit">${renderLeaderJersey(classification.id)}</div>
      <div class="leader-anchor-body">
        <h3>${escapeHtml(classification.label)}</h3>
        <strong>${escapeHtml(displayTeamName(leader.name))}</strong>
        <span>${leaderScore}</span>
        <small>${gap}</small>
      </div>
    </article>
  `;
}

function renderTeamStandingAnchorCard(rows) {
  const leader = rows[0];
  if (!leader) {
    return `
      <article class="leader-anchor leader-anchor-money">
        <div class="leader-anchor-kit">${renderLeaderJersey("money")}</div>
        <div>
          <h3>Ploegen</h3>
          <p class="muted">Nog geen stand</p>
        </div>
      </article>
    `;
  }
  const second = rows[1];
  const gap = second
    ? (leader.value === second.value ? "Gedeeld aan kop" : `${formatCurrency(leader.value - second.value)} voor op nr. 2`)
    : "Geen nummer 2";
  return `
    <article class="leader-anchor leader-anchor-money">
      <div class="leader-anchor-kit">${renderLeaderJersey("money")}</div>
      <div class="leader-anchor-body">
        <h3>Ploegen</h3>
        <strong>${escapeHtml(displayTeamName(leader.name))}</strong>
        <span>${formatCurrency(leader.value)}</span>
        <small>${gap}</small>
      </div>
    </article>
  `;
}

function formatLeaderGap(rows, classification) {
  if (rows.length < 2) return "Geen nummer 2";
  const leader = rows[0];
  const second = rows[1];
  if (leader.value === second.value) return "Gedeeld aan kop";
  const gap = classification.mode === "low" ? second.value - leader.value : leader.value - second.value;
  if (classification.unit === "sec") return `${formatDuration(gap)} voor op nr. 2`;
  return `${formatNumber(gap)} ${classification.unit} voor op nr. 2`;
}

function bindResultDetailRows() {
  els.results.querySelectorAll("[data-detail-kind][data-team]").forEach((row) => {
    row.addEventListener("click", () => openResultDetail(row));
  });
}

function openResultDetail(row) {
  try {
    saveFromForm();
    const standings = calculateStandings(state);
    const money = calculateMoney(standings, state);
    if (row.dataset.detailKind === "classification") {
      renderClassificationDetail(row.dataset.classification, row.dataset.team, standings);
    }
    if (row.dataset.detailKind === "money") {
      renderMoneyDetail(row.dataset.team, money);
    }
  } catch (error) {
    console.error(error);
    els.details.innerHTML = `<p class="error-text">Detail openen mislukt: ${escapeHtml(error.message)}</p>`;
  }
}

let tourDataRendered = false;

async function renderTourData() {
  if (tourDataRendered) {
    await renderWithdrawnRiderData();
    return;
  }
  tourDataRendered = true;
  await Promise.all([
    renderStageDataFiles(),
    renderCombinedRiderData(),
    renderWithdrawnRiderData()
  ]);
}

async function renderStageDataFiles() {
  if (!els.tourResultsData) return;
  els.tourResultsData.innerHTML = "";

  for (const stage of OFFICIAL_STAGE_FILES) {
    const section = document.createElement("section");
    section.className = "data-section";
    section.innerHTML = `<details><summary>${escapeHtml(stage.name)}</summary><div>Laden...</div></details>`;
    els.tourResultsData.appendChild(section);
    await renderCsvFile(stage.url, section.querySelector("div"), `Geen data voor ${stage.name}.`, { addPosition: true, formatRiderNames: true });
  }
}

async function renderCombinedRiderData() {
  if (!els.startlistData) return;
  if (!tourRiders.length) {
    tourRiders = await loadTourRiderList();
  }
  if (!tourRiders.length) {
    els.startlistData.textContent = "Geen startlijst of BC-lijst gevonden.";
    return;
  }
  const rows = [
    ["BIB", "RENNER", "TEAM", "JONGEREN", "BC", "BC RANK"],
    ...tourRiders.map((rider) => [
      rider.bib,
      rider.displayName,
      rider.team,
      rider.youth,
      rider.bc ? String(rider.bc) : "",
      rider.rank
    ])
  ];
  els.startlistData.innerHTML = renderDataTable(rows);
}

async function renderWithdrawnRiderData() {
  if (!els.withdrawnRidersData) return;
  if (!tourRiders.length) {
    tourRiders = await loadTourRiderList();
  }
  if (!withdrawalRecords.length) {
    withdrawalRecords = await loadWithdrawalRecords();
    applyWithdrawalRecordsToTourRiders();
  }
  const byName = new Map();
  tourRiders.filter((rider) => rider.status).forEach((rider) => {
    byName.set(normalizeName(rider.name), {
      name: rider.name,
      displayName: rider.displayName,
      team: rider.team,
      status: rider.status
    });
  });
  withdrawalRecords.forEach((record) => {
    const key = normalizeName(record.name);
    if (byName.has(key)) return;
    byName.set(key, {
      name: record.name,
      displayName: fallbackRiderName(record.name),
      team: record.team,
      status: {
        code: record.code,
        stage: record.stage,
        effectiveStage: record.effectiveStage,
        source: record.source
      }
    });
  });
  const withdrawn = [...byName.values()].sort((a, b) => a.status.stage - b.status.stage || a.displayName.localeCompare(b.displayName, "nl"));
  if (!withdrawn.length) {
    els.withdrawnRidersData.innerHTML = "<p class=\"hint\">Nog geen uitgevallen renners in de startlijst.</p>";
    return;
  }
  const rows = [
    ["RENNER", "REDEN", "ETAPPE", "NIET INZETBAAR VANAF", "GEKOZEN IN TEAMS"],
    ...withdrawn.map((rider) => [
      rider.displayName,
      rider.status.code,
      rider.status.stage === Number.POSITIVE_INFINITY ? "" : `Etappe ${rider.status.stage}`,
      rider.status.effectiveStage === Number.POSITIVE_INFINITY ? "" : `Etappe ${rider.status.effectiveStage}`,
      formatWithdrawnRiderTeamUsage(rider.name)
    ])
  ];
  els.withdrawnRidersData.innerHTML = renderDataTable(rows);
}

function formatWithdrawnRiderTeamUsage(riderName) {
  const usages = [];
  const riderKey = normalizeName(riderName);
  state.teams.forEach((team, index) => {
    addRiderUsage(usages, team, team.riders, riderKey, "starter");
    addRiderUsage(usages, team, team.reserves, riderKey, "reserve");
    addRiderUsage(usages, team, team.initialRiders, riderKey, "basis starter");
    addRiderUsage(usages, team, team.initialReserves, riderKey, "basis reserve");
  });
  if (!usages.length) return "-";
  return [...new Set(usages)].join("; ");
}

function addRiderUsage(usages, team, riderListText, riderKey, role) {
  if (!riderListText) return;
  if (!parseRiderList(riderListText).some((rider) => normalizeName(rider.name) === riderKey)) return;
  usages.push(`${displayTeamName(teamKey(team))} (${role})`);
}

async function renderCsvFile(url, target, emptyMessage, options = {}) {
  if (!target) return;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const rows = parseDelimitedRows(text);
    target.innerHTML = rows.length > 0 ? renderDataTable(rows, options) : escapeHtml(emptyMessage);
  } catch (error) {
    target.textContent = `${emptyMessage} (${error.message})`;
  }
}

function renderDataTable(rows, options = {}) {
  const [headers, ...body] = rows;
  const hiddenColumns = new Set(options.hiddenColumns || []);
  const visibleIndexes = headers
    .map((header, index) => ({ header: header.replace(/^\uFEFF/, ""), index }))
    .filter(({ header }) => !hiddenColumns.has(header.toLowerCase()));
  return `
    <table>
      <thead>
        <tr>${options.addPosition ? "<th>POSITIE</th>" : ""}${visibleIndexes.map(({ header }) => `<th>${escapeHtml(formatDataHeader(header))}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${body.map((row, rowIndex) => `
          <tr>${options.addPosition ? `<td>${rowIndex + 1}</td>` : ""}${visibleIndexes.map(({ index, header }) => `<td>${escapeHtml(formatDataCell(row[index] || "", header, options))}</td>`).join("")}</tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function formatDataHeader(header) {
  return String(header || "").replace(/^\uFEFF/, "").toUpperCase();
}

function formatDataCell(value, header, options = {}) {
  const normalizedHeader = normalizeText(header);
  if (normalizedHeader === "jongeren") return isTruthyCell(value) ? "Ja" : "";
  if (options.formatRiderNames && ["renner", "rider", "name", "naam"].includes(normalizedHeader)) {
    return formatRiderName(value);
  }
  return value;
}

function renderTeamVisuals() {
  if (!els.teamVisuals) return;
  if (state.teams.length === 0) {
    els.teamVisuals.innerHTML = "<p class=\"hint\">Nog geen teams. Voeg teams toe om het peloton te zien.</p>";
    return;
  }
  const standings = calculateStandings(state);
  const leaderTeams = currentLeaderTeamsByClassification(standings);
  els.teamVisuals.innerHTML = state.teams.map((team) => {
    const active = parseRiderList(team.riders).slice(0, STARTER_COUNT);
    const jerseys = leaderTeams.get(teamKey(team)) || [];
    const visualRiders = active
      .map((rider, index) => ({ rider, originalIndex: index, classificationId: jerseys[index] || "" }))
      .sort((a, b) => {
        if (a.classificationId && !b.classificationId) return 1;
        if (!a.classificationId && b.classificationId) return -1;
        return a.originalIndex - b.originalIndex;
      });
    return `
      <article class="visual-team">
        <header>
          ${renderTeamKit(teamKey(team))}
          <strong>${escapeHtml(team.teamName || team.name)}</strong>
        </header>
        <div class="intro-peloton" aria-label="Peloton startteam">
          ${visualRiders.map((entry, index) => renderIntroPelotonRider(team, entry.rider, index, entry.classificationId)).join("")}
        </div>
      </article>
    `;
  }).join("");
}

function currentLeaderTeamsByClassification(standings) {
  const leaders = new Map();
  CLASSIFICATIONS.forEach((classification) => {
    const tiedLeaders = getTiedLeaders(standings.total[classification.id] || [], classification);
    tiedLeaders.forEach((leader) => {
      const current = leaders.get(leader.name) || [];
      current.push(classification.id);
      leaders.set(leader.name, current);
    });
  });
  return leaders;
}

function renderIntroSquadRider(team, rider, index, classificationId) {
  const name = formatRiderName(rider.name);
  const jerseyClass = classificationId ? `intro-rider-jersey intro-rider-jersey-${classificationId}` : "";
  const classificationLabel = CLASSIFICATIONS.find((item) => item.id === classificationId)?.label || "";
  const title = classificationId
    ? `${name} - ${classificationLabel || "leiderstrui"}`
    : name;
  return `
    <li class="intro-list-rider ${jerseyClass}" style="--kit-a:${escapeAttr(team.color1 || "#f6d32d")};--kit-b:${escapeAttr(team.color2 || "#ffffff")}" title="${escapeAttr(title)}">
      <span>${index + 1}</span>
      <strong>${escapeHtml(shortRiderName(name))}</strong>
      ${classificationId ? `<em>${escapeHtml(classificationLabel)}</em>` : ""}
    </li>
  `;
}

function renderIntroPelotonRider(team, rider, index, classificationId) {
  const name = formatRiderName(rider.name);
  const jerseyClass = classificationId ? `intro-rider-jersey intro-rider-jersey-${classificationId}` : "";
  return `
    <span class="intro-peloton-rider intro-peloton-rider-${index + 1} ${jerseyClass}" style="--kit-a:${escapeAttr(team.color1 || "#f6d32d")};--kit-b:${escapeAttr(team.color2 || "#ffffff")}" title="${escapeAttr(name)}">
      <span class="intro-peloton-base" aria-hidden="true"></span>
      <span class="intro-peloton-kit" aria-hidden="true"></span>
    </span>
  `;
}

function shortRiderName(name) {
  const parts = String(name || "").split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name || "";
  return parts.at(-1);
}

function renderJerseyLogData() {
  if (!els.jerseyLogData) return;
  const standings = calculateStandings(state);
  if (!standings.jerseyLog.length) {
    els.jerseyLogData.innerHTML = "Nog geen etappes ingeladen.";
    return;
  }
  els.jerseyLogData.innerHTML = `
    <table>
      <thead><tr><th>Etappe</th>${CLASSIFICATIONS.map((classification) => `<th>${escapeHtml(classification.label)}</th>`).join("")}</tr></thead>
      <tbody>
        ${standings.jerseyLog.map((entry) => `
          <tr>
            <td>${escapeHtml(entry.stage)}</td>
            ${CLASSIFICATIONS.map((classification) => {
              const leaders = entry.classifications[classification.id] || [];
              return `<td class="jersey-cell jersey-${classification.id}">${leaders.length > 1 ? "Gedeeld: " : ""}${escapeHtml(leaders.map((leader) => displayTeamName(leader.name)).join(", ") || "-")}</td>`;
            }).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderParticipantTeamsData() {
  if (!els.participantTeamsData) return;
  if (state.teams.length === 0) {
    els.participantTeamsData.innerHTML = "Nog geen teams.";
    return;
  }
  els.participantTeamsData.innerHTML = state.teams.map((team) => {
    const active = parseRiderList(team.riders);
    const reserves = parseRiderList(team.reserves);
    return `
      <details class="participant-team">
        <summary>${renderTeamKit(teamKey(team))} ${escapeHtml(displayTeamWithManager(team))}</summary>
        <div class="participant-grid">
          <div>
            <h4>Starters</h4>
            <ol>${active.map((rider) => `<li>${escapeHtml(formatRiderName(rider.name))}</li>`).join("")}</ol>
          </div>
          <div>
            <h4>Reserves op prioriteit</h4>
            <ol>${reserves.map((rider) => `<li>${escapeHtml(formatRiderName(rider.name))}</li>`).join("")}</ol>
          </div>
          <div>
            <h4>Wissellog</h4>
            <p class="hint">Nog geen handmatige rustdagwissels geregistreerd.</p>
          </div>
        </div>
      </details>
    `;
  }).join("");
}

function renderProgressData() {
  if (!els.progressData) return;
  saveFromForm();
  const standings = calculateStandings(state);
  if (!standings.progress.length) {
    els.progressData.innerHTML = "Nog geen etappes of teams om door te rekenen.";
    return;
  }

  const stages = [...new Set(standings.progress.map((entry) => entry.stage))];
  els.progressData.innerHTML = stages.map((stage) => {
    const stageRows = standings.progress.filter((entry) => entry.stage === stage);
    return `
      <details class="progress-stage">
        <summary>${escapeHtml(stage)}</summary>
        <div class="progress-stage-grid">
          ${state.teams.map((team) => renderTeamProgress(stageRows, team)).join("")}
        </div>
      </details>
    `;
  }).join("");
}

function renderRiderPerformanceData() {
  if (!els.riderPerformanceData) return;
  saveFromForm();
  const standings = calculateStandings(state);
  if (!state.teams.length || !standings.progress.length) {
    els.riderPerformanceData.innerHTML = "Nog geen rennerprestaties.";
    return;
  }
  const money = calculateMoney(standings, state);
  const statsByTeam = cloneRiderStats(standings.riderStats);
  standings.stageWinners.forEach((stageWinner) => {
    if (!stageWinner.teams.length) return;
    const share = money.stageWinnerPrize / stageWinner.teams.length;
    stageWinner.teams.forEach((teamName) => {
      stageWinner.riders.forEach((riderName) => {
        const stat = ensureRiderStat(statsByTeam, teamName, riderName);
        stat.stageWins += 1;
        stat.stageWinMoney += share;
      });
    });
  });

  els.riderPerformanceData.innerHTML = state.teams.map((team) => {
    const rows = [...(statsByTeam.get(teamKey(team)) || new Map()).values()]
      .sort((a, b) => b.pointsTotal - a.pointsTotal || b.mountainTotal - a.mountainTotal || formatRiderName(a.rider).localeCompare(formatRiderName(b.rider), "nl"));
    return `
      <details class="rider-performance-team">
        <summary>${renderTeamKit(teamKey(team))} ${escapeHtml(displayTeamName(teamKey(team)))}</summary>
        <table>
          <thead>
            <tr>
              <th>Renner</th>
              <th>Status</th>
              <th>Start</th>
              <th>Top 5</th>
              <th>Alg. totaal</th>
              <th>Alg. gem.</th>
              <th>Punten</th>
              <th>Berg</th>
              <th>Jong. totaal</th>
              <th>Jong. gem.</th>
              <th>Zeges</th>
              <th>Euro</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td>${escapeHtml(formatRiderName(row.rider))}</td>
                <td>${escapeHtml(formatRiderPerformanceStatus(row))}</td>
                <td>${row.activeStages}</td>
                <td>${row.generalTopFiveCount}</td>
                <td>${formatDuration(row.generalTotal)}</td>
                <td>${row.generalCount ? formatDuration(row.generalTotal / row.generalCount) : "-"}</td>
                <td>${formatNumber(row.pointsTotal)}</td>
                <td>${formatNumber(row.mountainTotal)}</td>
                <td>${formatDuration(row.youthTotal)}</td>
                <td>${row.youthCount ? formatDuration(row.youthTotal / row.youthCount) : "-"}</td>
                <td>${row.stageWins}</td>
                <td>${formatCurrency(row.stageWinMoney)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </details>
    `;
  }).join("");
}

function renderSwapLogData() {
  if (!els.swapLogData) return;
  saveFromForm();
  const standings = calculateStandings(state);
  const rows = standings.swapLog || [];
  if (!rows.length) {
    els.swapLogData.innerHTML = "<p class=\"hint\">Nog geen wisselingen geregistreerd.</p>";
    return;
  }

  const automaticRows = rows.filter((row) => row.type !== "manual");
  const manualRows = rows.filter((row) => row.type === "manual");
  const manualStages = [...new Set(manualRows.map((row) => row.stage))];
  els.swapLogData.innerHTML = `
    ${automaticRows.length ? `
      <section class="swap-stage">
        <h4>Automatische uitvallers</h4>
        ${renderSwapLogTable(automaticRows, { includeStage: true })}
      </section>
    ` : ""}
    ${manualStages.map((stage) => {
      const stageRows = manualRows.filter((row) => row.stage === stage);
      return `
        <details class="swap-stage" open>
          <summary>${escapeHtml(stage)}</summary>
          ${renderSwapLogTable(stageRows, { includeStage: false })}
        </details>
      `;
    }).join("")}
  `;
}

function renderSwapLogTable(rows, options = {}) {
  const includeStage = Boolean(options.includeStage);
  return `
    <table>
      <thead>
        <tr>${includeStage ? "<th>Etappe</th>" : ""}<th>Team</th><th>Type</th><th>Eruit</th><th>Erin</th><th>Reden</th></tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr class="swap-row swap-${row.type}">
            ${includeStage ? `<td>${escapeHtml(row.stage)}</td>` : ""}
            <td>${renderTeamKit(row.teamName)} ${escapeHtml(displayTeamName(row.teamName))}</td>
            <td>${escapeHtml(row.type === "manual" ? "Handmatig" : "Automatisch")}</td>
            <td>${escapeHtml(formatRiderName(row.out))}</td>
            <td>${escapeHtml(formatRiderName(row.in || ""))}</td>
            <td>${escapeHtml(row.reasonCode || row.reason || "")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function cloneRiderStats(statsByTeam) {
  const clone = new Map();
  statsByTeam.forEach((teamStats, teamName) => {
    clone.set(teamName, new Map([...teamStats.entries()].map(([key, value]) => [key, { ...value }])));
  });
  return clone;
}

function formatRiderPerformanceStatus(row) {
  if (row.reserveWithdrawnStage) {
    return row.reserveWithdrawnReason
      ? `Reserve uitgevallen vanaf ${row.reserveWithdrawnStage} (${row.reserveWithdrawnReason})`
      : `Reserve uitgevallen vanaf ${row.reserveWithdrawnStage}`;
  }
  if (row.initialRole === "reserve") return "Reserve";
  return "Starter";
}

function renderTeamProgress(stageRows, team) {
  const teamRows = stageRows.filter((entry) => entry.teamName === teamKey(team));
  return `
    <article class="progress-team">
      <h3>${renderTeamKit(teamKey(team))} ${escapeHtml(displayTeamName(teamKey(team)))}</h3>
      <div class="progress-classifications">
        ${CLASSIFICATIONS.map((classification) => {
          const entry = teamRows.find((row) => row.classificationId === classification.id);
          return renderClassificationProgress(entry, classification);
        }).join("")}
      </div>
    </article>
  `;
}

function renderClassificationProgress(entry, classification) {
  const rows = entry?.rows || [];
  return `
    <section class="progress-classification progress-${classification.id}">
      <h4>${escapeHtml(classification.label)} <span>${formatClassificationScore(entry?.total ?? Number.NaN, classification)}</span></h4>
      ${entry?.ineligibleReason ? `<p class="hint warning-text">${escapeHtml(entry.ineligibleReason)}</p>` : ""}
      ${rows.length === 0 ? "<p class=\"hint\">Geen meetellende renners.</p>" : `
        <table>
          <thead><tr><th>#</th><th>Renner</th><th>Score</th></tr></thead>
          <tbody>
            ${rows.map((row, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(formatRiderName(row.rider))}</td>
                <td>${formatClassificationScore(row.score, classification)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `}
    </section>
  `;
}

function renderHistoryData() {
  if (!els.historyData) return;
  saveFromForm();
  const standings = calculateStandings(state);
  if (!standings.history.length) {
    els.historyData.innerHTML = "Nog geen tussenstanden.";
    return;
  }
  const moneyTimeline = calculateMoneyTimeline(standings, state);

  els.historyData.innerHTML = standings.history.map((snapshot, index) => `
    <details class="history-stage" ${snapshot.stage === standings.history[standings.history.length - 1].stage ? "open" : ""}>
      <summary>${escapeHtml(snapshot.stage)}</summary>
      <div class="history-grid">
        ${renderHistoryMoney(moneyTimeline[index])}
        ${CLASSIFICATIONS.map((classification) => renderHistoryClassification(snapshot, classification)).join("")}
      </div>
    </details>
  `).join("");
}

function renderHistoryClassification(snapshot, classification) {
  const rows = snapshot.classifications[classification.id] || [];
  const base = classification.mode === "low" ? rows.find((row) => Number.isFinite(row.value))?.value || 0 : 0;
  return `
    <section class="history-classification history-${classification.id}">
      <h3>${escapeHtml(classification.label)}</h3>
      <table>
        <thead><tr><th>#</th><th>Team</th><th>Score</th></tr></thead>
        <tbody>
          ${rows.map((row, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${renderTeamKit(row.name)} ${escapeHtml(displayTeamName(row.name))}</td>
              <td>${classification.mode === "low" ? formatDuration(row.value - base) : formatClassificationScore(row.value, classification)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderHistoryMoney(snapshot) {
  const rows = snapshot?.rows || [];
  return `
    <section class="history-classification history-money">
      <h3>Ploegen</h3>
      <table>
        <thead><tr><th>#</th><th>Team</th><th>Bedrag</th></tr></thead>
        <tbody>
          ${rows.map((row, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${renderTeamKit(row.name)} ${escapeHtml(displayTeamName(row.name))}</td>
              <td>${formatCurrency(row.value)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderChartsData() {
  if (!els.chartsData) return;
  saveFromForm();
  const standings = calculateStandings(state);
  if (!standings.history.length) {
    els.chartsData.innerHTML = "Nog geen grafiekdata.";
    return;
  }
  const selectedTeams = selectedChartTeams(standings);
  const moneyTimeline = calculateMoneyTimeline(standings, state);
  els.chartsData.innerHTML = `
    <div class="chart-controls">
      <div class="chart-actions">
        <button type="button" data-chart-action="top5">Top 5 algemeen</button>
        <button type="button" data-chart-action="all">Alles</button>
        <button type="button" data-chart-action="none">Leeg</button>
      </div>
      <details class="chart-team-picker-wrapper">
        <summary>Teams in grafieken (${selectedTeams.length}/${state.teams.length})</summary>
        <div class="chart-team-picker">
          ${state.teams.map((team) => `
            <label>
              <input type="checkbox" data-chart-team="${escapeAttr(teamKey(team))}" ${selectedTeams.includes(teamKey(team)) ? "checked" : ""}>
              ${renderChartColor(team)} ${escapeHtml(displayTeamName(teamKey(team)))}
            </label>
          `).join("")}
        </div>
      </details>
    </div>
    ${renderMoneyChart(moneyTimeline, selectedTeams)}
    ${CLASSIFICATIONS.map((classification) => renderPositionChart(standings.history, classification, selectedTeams)).join("")}
  `;
}

function renderPositionChart(history, classification, selectedTeams) {
  const width = 520;
  const height = 150;
  const pad = 18;
  const maxRank = Math.max(1, state.teams.length);
  const stages = history.map((snapshot) => snapshot.stage);
  const visibleTeams = state.teams.filter((team) => selectedTeams.includes(teamKey(team)));
  const xFor = (index) => stages.length === 1 ? pad : pad + (index * (width - pad * 2)) / (stages.length - 1);
  const yFor = (rank) => pad + ((rank - 1) * (height - pad * 2)) / Math.max(maxRank - 1, 1);
  const rankByStage = history.map((snapshot) => {
    const rows = snapshot.classifications[classification.id] || [];
    return new Map(rows.map((row) => [row.name, row.rank]));
  });
  const lines = visibleTeams.map((team) => {
    const points = rankByStage
      .map((ranks, index) => {
        const rank = ranks.get(teamKey(team));
        return rank ? `${xFor(index)},${yFor(rank)}` : null;
      })
      .filter(Boolean)
      .join(" ");
    if (!points) return "";
    const color = team.color1 || "#0072ce";
    return `<polyline points="${points}" fill="none" stroke="${escapeAttr(color)}" stroke-width="1.8"><title>${escapeHtml(displayTeamName(teamKey(team)))}</title></polyline>`;
  }).join("");

  return `
    <details class="chart-card chart-${classification.id}" data-chart-id="${classification.id}" ${isChartOpen(classification.id) ? "open" : ""}>
      <summary>${escapeHtml(classification.label)} - positie per etappe</summary>
      ${visibleTeams.length === 0 ? "<p class=\"hint\">Selecteer teams om lijnen te tonen.</p>" : ""}
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeAttr(classification.label)} positie per etappe">
        <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" />
        <line x1="${pad}" y1="${pad}" x2="${width - pad}" y2="${pad}" />
        <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" />
        <text x="2" y="${pad + 3}">1</text>
        <text x="2" y="${height - pad + 3}">${maxRank}</text>
        ${stages.map((stage, index) => `<text x="${xFor(index) - 10}" y="${height - 3}">${escapeHtml(stage.replace("Etappe ", "E"))}</text>`).join("")}
        ${lines}
      </svg>
      <div class="chart-legend">
        ${visibleTeams.map((team) => `<span>${renderChartColor(team)} ${escapeHtml(displayTeamName(teamKey(team)))}</span>`).join("")}
      </div>
    </details>
  `;
}

function renderMoneyChart(timeline, selectedTeams) {
  const width = 520;
  const height = 150;
  const pad = 18;
  const visibleTeams = state.teams.filter((team) => selectedTeams.includes(teamKey(team)));
  const maxValue = Math.max(1, ...timeline.flatMap((stage) => stage.rows.map((row) => row.value)));
  const stages = timeline.map((stage) => stage.stage);
  const xFor = (index) => stages.length === 1 ? pad : pad + (index * (width - pad * 2)) / (stages.length - 1);
  const yFor = (value) => height - pad - (value * (height - pad * 2)) / maxValue;
  const moneyByStage = timeline.map((stage) => new Map(stage.rows.map((row) => [row.name, row.value])));
  const lines = visibleTeams.map((team) => {
    const points = moneyByStage
      .map((moneyMap, index) => {
        const value = moneyMap.get(teamKey(team));
        return Number.isFinite(value) ? `${xFor(index)},${yFor(value)}` : null;
      })
      .filter(Boolean)
      .join(" ");
    if (!points) return "";
    return `<polyline points="${points}" fill="none" stroke="${escapeAttr(team.color1 || "#0072ce")}" stroke-width="1.8"><title>${escapeHtml(displayTeamName(teamKey(team)))}</title></polyline>`;
  }).join("");

  return `
    <details class="chart-card chart-money" data-chart-id="money" ${isChartOpen("money") ? "open" : ""}>
      <summary>Ploegenklassement - bedrag per etappe</summary>
      ${visibleTeams.length === 0 ? "<p class=\"hint\">Selecteer teams om lijnen te tonen.</p>" : ""}
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Ploegenklassement bedrag per etappe">
        <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" />
        <line x1="${pad}" y1="${pad}" x2="${width - pad}" y2="${pad}" />
        <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" />
        <text x="2" y="${pad + 3}">${escapeHtml(formatCurrency(maxValue))}</text>
        <text x="2" y="${height - pad + 3}">&euro;0</text>
        ${stages.map((stage, index) => `<text x="${xFor(index) - 10}" y="${height - 3}">${escapeHtml(stage.replace("Etappe ", "E"))}</text>`).join("")}
        ${lines}
      </svg>
      <div class="chart-legend">
        ${visibleTeams.map((team) => `<span>${renderChartColor(team)} ${escapeHtml(displayTeamName(teamKey(team)))}</span>`).join("")}
      </div>
    </details>
  `;
}

function defaultChartTeams(standings) {
  return (standings.total.general || []).slice(0, 5).map((row) => row.name);
}

function selectedChartTeams(standings) {
  if (!Array.isArray(state.chartTeams)) {
    state.chartTeams = defaultChartTeams(standings);
  }
  const existing = new Set(state.teams.map(teamKey));
  state.chartTeams = state.chartTeams.filter((teamName) => existing.has(teamName));
  return state.chartTeams;
}

function getOpenChartIds() {
  return [...document.querySelectorAll("#chartsData [data-chart-id][open]")]
    .map((chart) => chart.dataset.chartId);
}

function isChartOpen(chartId) {
  return Array.isArray(state.openCharts) && state.openCharts.includes(chartId);
}

function renderChartColor(team) {
  return `<span class="chart-color" style="--chart-color:${escapeAttr(team.color1 || "#0072ce")}"></span>`;
}

function calculateStandings(currentState) {
  const totals = emptyScores();
  const dayWins = emptyScores();
  const details = emptyDetails();
  const progress = [];
  const riderStats = new Map();
  const swapLog = [];
  const appliedManualSwaps = new Set();
  const stageWinners = [];
  const dayWinDetails = [];
  const snapshots = [];
  const rosters = currentState.teams.map((team, index) => ({
    teamIndex: index,
    teamId: team.id || "",
    participantName: team.name,
    teamName: teamKey(team),
    active: parseRiderList(getInitialTeamRidersForCalculation(currentState, team, index)),
    reserves: parseRiderList(getInitialTeamReservesForCalculation(currentState, team, index)),
    pendingWithdrawals: new Map()
  }));

  currentState.teams.forEach((team) => {
    const key = teamKey(team);
    Object.values(totals).forEach((table) => table.set(key, 0));
    Object.values(dayWins).forEach((table) => table.set(key, 0));
    Object.values(details).forEach((table) => table.set(key, []));
    riderStats.set(key, new Map());
    parseRiderList(team.riders).forEach((rider) => initializeRiderStat(riderStats, key, rider.name, "starter"));
    parseRiderList(team.reserves).forEach((rider) => initializeRiderStat(riderStats, key, rider.name, "reserve"));
  });

  currentState.stages.forEach((stage) => {
    const stageResults = parseStageResults(stage.results);
    const stageScores = emptyScores();
    const winnerNames = findStageWinners(stageResults);
    const normalizedWinnerNames = winnerNames.map(normalizeName);
    const winnerTeams = [];

    rosters.forEach((rosterState) => {
      applyManualSwapsBeforeStage(rosterState, currentState, stage.name, swapLog, appliedManualSwaps);
      markWithdrawnReserves(rosterState, stageResults, stage.name, riderStats);
      replaceWithdrawnRiders(rosterState, stageResults, stage.name, swapLog, riderStats);
      rosterState.active.forEach((rider) => recordRiderActive(riderStats, rosterState.teamName, rider.name));
      if (rosterState.active.some((rider) => normalizedWinnerNames.includes(normalizeName(rider.name)))) {
        winnerTeams.push(rosterState.teamName);
      }
      CLASSIFICATIONS.forEach((classification) => {
        const scored = scoreTeamForStage(rosterState.active, stageResults, classification, stage.name);
        const score = scored.total;
        scored.rows.forEach((row) => recordRiderScore(riderStats, rosterState.teamName, row, classification));
        progress.push({
          stage: stage.name,
          teamName: rosterState.teamName,
          classificationId: classification.id,
          classificationLabel: classification.label,
          total: score,
          rows: scored.rows,
          ineligibleReason: scored.ineligibleReason || ""
        });
        stageScores[classification.id].set(rosterState.teamName, score);
        details[classification.id].set(rosterState.teamName, [
          ...details[classification.id].get(rosterState.teamName),
          ...scored.rows
        ]);
        totals[classification.id].set(
          rosterState.teamName,
          addScore(totals[classification.id].get(rosterState.teamName), score, classification)
        );
      });
      scheduleImportedWithdrawals(rosterState, stageResults, stage.name);
    });

    const totalTablesAfterStage = mapToSortedTables(totals);
    const leadersByClassification = {};
    CLASSIFICATIONS.forEach((classification) => {
      const leaders = getTiedLeaders(totalTablesAfterStage[classification.id], classification);
      leadersByClassification[classification.id] = leaders;
      leaders.forEach((leader) => {
        dayWins[classification.id].set(leader.name, dayWins[classification.id].get(leader.name) + 1);
        dayWinDetails.push({
          teamName: leader.name,
          classificationId: classification.id,
          classificationLabel: classification.label,
          stage: stage.name,
          score: leader.value,
          shareCount: leaders.length,
          sharedWith: leaders.map((item) => item.name)
        });
      });
    });
    snapshots.push({
      stage: stage.name,
      total: addRanksToTables(totalTablesAfterStage),
      leaders: leadersByClassification
    });
    stageWinners.push({
      stage: stage.name,
      riders: winnerNames,
      teams: [...new Set(winnerTeams)]
    });
  });
  appendPendingManualSwapRows(currentState, swapLog, appliedManualSwaps);

  const total = mapToSortedTables(totals);
  const previous = snapshots.length > 1 ? snapshots[snapshots.length - 2].total : null;
  CLASSIFICATIONS.forEach((classification) => {
    const leaders = getTiedLeaders(total[classification.id], classification);
    const currentBase = classification.mode === "low" ? total[classification.id].find((item) => Number.isFinite(item.value))?.value || 0 : 0;
    const previousBase = classification.mode === "low" ? previous?.[classification.id].find((item) => Number.isFinite(item.value))?.value || 0 : 0;
    total[classification.id] = total[classification.id].map((row, index) => {
      const previousRowIndex = previous?.[classification.id].findIndex((item) => item.name === row.name);
      const previousRow = previousRowIndex == null || previousRowIndex < 0 ? null : previous[classification.id][previousRowIndex];
      const currentDisplayValue = classification.mode === "low" ? row.value - currentBase : row.value;
      const previousDisplayValue = previousRow ? (classification.mode === "low" ? previousRow.value - previousBase : previousRow.value) : currentDisplayValue;
      return {
        ...row,
        delta: previousRowIndex == null || previousRowIndex < 0 ? 0 : previousRowIndex + 1 - (index + 1),
        scoreDelta: Number.isFinite(currentDisplayValue) && Number.isFinite(previousDisplayValue) ? currentDisplayValue - previousDisplayValue : 0,
        leaderShared: leaders.some((leader) => leader.name === row.name) && leaders.length > 1,
        leaderCount: leaders.length
      };
    });
  });

  return {
    total,
    dayWins: mapToSortedTables(dayWins, { mode: "high" }),
    details,
    progress,
    swapLog,
    stageWinners,
    dayWinDetails,
    riderStats,
    history: snapshots.map((snapshot) => ({
      stage: snapshot.stage,
      classifications: snapshot.total
    })),
    jerseyLog: snapshots.map((snapshot) => ({
      stage: snapshot.stage,
      classifications: Object.fromEntries(CLASSIFICATIONS.map((classification) => [
        classification.id,
        snapshot.leaders[classification.id] || []
      ]))
    }))
  };
}

function scoreTeamForStage(roster, stageResults, classification, stageName) {
  const riderScores = roster
    .map((rider) => ({
      rider: rider.name,
      score: findRiderResult(stageResults, rider.name)?.[classification.id]
    }))
    .filter((entry) => Number.isFinite(entry.score));

  if (riderScores.length === 0) {
    return {
      total: classification.mode === "low" ? Number.POSITIVE_INFINITY : 0,
      rows: [],
      ineligibleReason: classification.id === "youth" ? "te weinig renners" : ""
    };
  }

  const sorted = riderScores.sort((a, b) => classification.mode === "low" ? a.score - b.score : b.score - a.score);
  const used = sorted.slice(0, scoringDepth(classification));
  if (GAME_LOGIC.requiresFullScoreCount(classification.id) && used.length < scoringDepth(classification)) {
    return {
      total: Number.POSITIVE_INFINITY,
      rows: used.map((entry) => ({
        rider: entry.rider,
        stage: stageName,
        score: entry.score
      })),
      ineligibleReason: `te weinig geldige renners (${used.length}/${scoringDepth(classification)})`
    };
  }
  return {
    total: used.reduce((sum, entry) => sum + entry.score, 0),
    rows: used.map((entry) => ({
      rider: entry.rider,
      stage: stageName,
      score: entry.score
    })),
    ineligibleReason: ""
  };
}

function scoringDepth(classification) {
  return GAME_LOGIC.scoringDepth(classification.id, ROUND_SETTINGS);
}

function recordRiderActive(riderStats, teamName, riderName) {
  const stat = ensureRiderStat(riderStats, teamName, riderName);
  stat.activeStages += 1;
}

function initializeRiderStat(riderStats, teamName, riderName, role) {
  if (!riderName) return;
  const stat = ensureRiderStat(riderStats, teamName, riderName);
  if (!stat.initialRole || stat.initialRole === "reserve") {
    stat.initialRole = role;
  }
}

function recordRiderScore(riderStats, teamName, row, classification) {
  const stat = ensureRiderStat(riderStats, teamName, row.rider);
  if (classification.id === "general") {
    stat.generalTotal += row.score;
    stat.generalCount += 1;
    stat.generalTopFiveCount += 1;
  }
  if (classification.id === "points") {
    stat.pointsTotal += row.score;
  }
  if (classification.id === "mountain") {
    stat.mountainTotal += row.score;
  }
  if (classification.id === "youth") {
    stat.youthTotal += row.score;
    stat.youthCount += 1;
  }
}

function ensureRiderStat(riderStats, teamName, riderName) {
  const teamStats = riderStats.get(teamName) || new Map();
  riderStats.set(teamName, teamStats);
  const key = normalizeName(riderName);
  if (!teamStats.has(key)) {
    teamStats.set(key, {
      rider: riderName,
      activeStages: 0,
      generalTopFiveCount: 0,
      generalTotal: 0,
      generalCount: 0,
      pointsTotal: 0,
      mountainTotal: 0,
      youthTotal: 0,
      youthCount: 0,
      stageWins: 0,
      stageWinMoney: 0,
      initialRole: "",
      reserveWithdrawnStage: "",
      reserveWithdrawnReason: ""
    });
  }
  return teamStats.get(key);
}

function addScore(total, score, classification) {
  if (classification.mode === "low" && (!Number.isFinite(total) || !Number.isFinite(score))) {
    return Number.POSITIVE_INFINITY;
  }
  return total + score;
}

function getInitialTeamRidersForCalculation(currentState, team, index) {
  return teamHasManualSwaps(currentState, team, index) ? (team.initialRiders || team.riders || "") : (team.riders || "");
}

function getInitialTeamReservesForCalculation(currentState, team, index) {
  return teamHasManualSwaps(currentState, team, index) ? (team.initialReserves || team.reserves || "") : (team.reserves || "");
}

function swapMatchesTeam(swap, team, teamIndex) {
  if (swap.teamId && team?.id) return swap.teamId === team.id;
  if (swap.teamName && team?.name && normalizeName(swap.teamName) === normalizeName(team.name)) return true;
  return Number(swap.teamIndex) === Number(teamIndex);
}

function teamHasManualSwaps(currentState, team, teamIndex) {
  return (currentState.manualSwaps || []).some((swap) => swapMatchesTeam(swap, team, teamIndex));
}

function applyManualSwapsBeforeStage(rosterState, currentState, stageName, swapLog, appliedManualSwaps) {
  const stageNumber = getStageNumber(stageName);
  const swaps = (currentState.manualSwaps || [])
    .filter((swap) => swapMatchesTeam(swap, { id: rosterState.teamId, name: rosterState.participantName }, rosterState.teamIndex))
    .filter((swap) => !appliedManualSwaps.has(swap.id))
    .filter((swap) => stageNumber > Number(swap.afterStage || 0))
    .sort((a, b) => Number(a.afterStage || 0) - Number(b.afterStage || 0));

  swaps.forEach((swap) => {
    rosterState.active = parseRiderList(swap.riders || "");
    rosterState.reserves = parseRiderList(swap.reserves || "");
    appliedManualSwaps.add(swap.id);
    getManualSwapRows(swap, rosterState.teamName).forEach((row) => swapLog.push(row));
  });
}

function appendPendingManualSwapRows(currentState, swapLog, appliedManualSwaps) {
  (currentState.manualSwaps || []).forEach((swap) => {
    if (appliedManualSwaps.has(swap.id)) return;
    const team = swap.teamId
      ? currentState.teams.find((item) => item.id === swap.teamId)
      : currentState.teams[Number(swap.teamIndex)];
    getManualSwapRows(swap, team?.name || swap.teamName).forEach((row) => swapLog.push(row));
  });
}

function getManualSwapRows(swap, fallbackTeamName) {
  const rows = Array.isArray(swap.rows) && swap.rows.length ? swap.rows : [{
    stage: swap.stage || `Na etappe ${swap.afterStage}`,
    teamName: fallbackTeamName,
    type: "manual",
    out: "",
    in: "",
    reason: "Handmatige spelwissel via teamselectie"
  }];
  return rows.map((row) => ({
    ...row,
    stage: row.stage || swap.stage || `Na etappe ${swap.afterStage}`,
    teamName: fallbackTeamName || row.teamName || swap.teamName,
    type: "manual"
  }));
}

function markWithdrawnReserves(rosterState, stageResults, stageName, riderStats) {
  rosterState.reserves.forEach((rider) => {
    const withdrawal = getWithdrawalInfo(rider.name, stageResults, stageName, "Reserve");
    if (!withdrawal.withdrawn) return;
    const stat = ensureRiderStat(riderStats, rosterState.teamName, rider.name);
    if (!stat.reserveWithdrawnStage) {
      stat.reserveWithdrawnStage = stageName;
      stat.reserveWithdrawnReason = withdrawal.reason;
    }
  });
}

function replaceWithdrawnRiders(rosterState, stageResults, stageName, swapLog, riderStats) {
  rosterState.active = rosterState.active.map((rider) => {
    const scheduled = rosterState.pendingWithdrawals.get(normalizeName(rider.name));
    const withdrawal = scheduled && getStageNumber(stageName) >= scheduled.effectiveStage
      ? { withdrawn: true, code: scheduled.code, reason: scheduled.reason }
      : getWithdrawalInfo(rider.name, stageResults, stageName, "Startrenner");
    if (!withdrawal.withdrawn) return rider;
    rosterState.pendingWithdrawals.delete(normalizeName(rider.name));
    const replacement = nextAvailableReserve(rosterState, stageResults, stageName, riderStats);
    if (!replacement) {
      swapLog.push({
        stage: stageName,
        teamName: rosterState.teamName,
        type: "automatic",
        out: rider.name,
        in: "",
        reason: `${withdrawal.reason}; geen beschikbare reserve`,
        reasonCode: withdrawal.code || "DNF"
      });
      return rider;
    }
    swapLog.push({
      stage: stageName,
      teamName: rosterState.teamName,
      type: "automatic",
      out: rider.name,
      in: replacement.name,
      reason: `${withdrawal.reason}; eerstvolgende beschikbare reserve ingezet`,
      reasonCode: withdrawal.code || "DNF"
    });
    return replacement;
  });
}

function scheduleImportedWithdrawals(rosterState, stageResults, stageName) {
  const stageNumber = getStageNumber(stageName);
  [...rosterState.active, ...rosterState.reserves].forEach((rider) => {
    const result = findRiderResult(stageResults, rider.name);
    if (!result?.withdrawn) return;
    const code = String(result.withdrawalCode || "DNF").toUpperCase();
    const effectiveStage = GAME_LOGIC.withdrawalEffectiveStage(code, stageNumber);
    if (effectiveStage <= stageNumber) return;
    rosterState.pendingWithdrawals.set(normalizeName(rider.name), {
      code,
      effectiveStage,
      reason: `Startrenner ${code} in etappe ${stageNumber}`
    });
  });
}

function nextAvailableReserve(rosterState, stageResults, stageName, riderStats) {
  for (let index = 0; index < rosterState.reserves.length; index += 1) {
    const candidate = rosterState.reserves[index];
    const scheduled = rosterState.pendingWithdrawals.get(normalizeName(candidate.name));
    const withdrawal = scheduled && getStageNumber(stageName) >= scheduled.effectiveStage
      ? { withdrawn: true, code: scheduled.code, reason: scheduled.reason }
      : getWithdrawalInfo(candidate.name, stageResults, stageName, "Reserve");
    if (withdrawal.withdrawn) {
      const stat = ensureRiderStat(riderStats, rosterState.teamName, candidate.name);
      if (!stat.reserveWithdrawnStage) {
        stat.reserveWithdrawnStage = stageName;
        stat.reserveWithdrawnReason = withdrawal.reason;
      }
      continue;
    }
    rosterState.reserves.splice(index, 1);
    return candidate;
  }
  return null;
}

function getWithdrawalInfo(riderName, stageResults, stageName, roleLabel = "Renner") {
  const stageNumber = getStageNumber(stageName);
  const status = getStartlistStatus(riderName);
  const result = findRiderResult(stageResults, riderName);
  if (result?.withdrawn) {
    const code = String(result.withdrawalCode || "DNF").toUpperCase();
    const effectiveStage = GAME_LOGIC.withdrawalEffectiveStage(code, stageNumber);
    return {
      withdrawn: stageNumber >= effectiveStage,
      code,
      effectiveStage,
      reason: `${roleLabel} ${code} volgens etappedata`
    };
  }
  if (status && Number.isFinite(status.effectiveStage) && stageNumber >= status.effectiveStage) {
    return {
      withdrawn: true,
      code: status.code,
      reason: `${roleLabel} ${status.code} vanaf etappe ${status.effectiveStage} volgens startlijst`
    };
  }
  return { withdrawn: false, reason: "" };
}

function getStartlistStatus(riderName) {
  const rider = tourRiders.find((item) => normalizeName(item.name) === normalizeName(stripRiderStatus(riderName)));
  if (rider?.status) return rider.status;
  const riderKey = normalizeName(stripRiderStatus(riderName));
  const withdrawal = withdrawalRecords.find((record) => riderNamesMatch(riderKey, normalizeName(record.name)));
  return withdrawal ? {
    code: withdrawal.code,
    stage: withdrawal.stage,
    effectiveStage: withdrawal.effectiveStage,
    source: withdrawal.source
  } : null;
}

function calculateMoney(standings, currentState) {
  const teams = currentState.teams.map(teamKey);
  const money = new Map(teams.map((team) => [team, 0]));
  const details = new Map(teams.map((team) => [team, []]));
  const pot = teams.length * Number(currentState.settings.stake || 0);
  const prizePotSplit = getPrizePotSplit(currentState);
  const finalPot = pot * (prizePotSplit.final / 100);
  const dayPot = pot * (prizePotSplit.daily / 100);
  const prizeWeights = getPrizeWeights(currentState);
  const finalClassificationWeight = sumFinalPrizeWeights(prizeWeights.final);
  const dailyClassificationWeight = sumClassificationWeights(prizeWeights.daily);
  const dayWeight = dailyClassificationWeight + Number(prizeWeights.daily.stageWinner || 0);
  const stageCount = Number(currentState.settings.stageCount || 1);
  const loadedStageCount = currentState.stages.filter((stage) => stage.results.trim()).length;
  const finalPotUnlocked = loadedStageCount >= stageCount;
  const prizeBreakdown = {
    final: CLASSIFICATIONS.map((classification) => ({
      classificationId: classification.id,
      label: classification.label,
      amount: finalClassificationWeight ? finalPot * (Number(prizeWeights.final[classification.id] || 0) / finalClassificationWeight) : 0
    })),
    daily: CLASSIFICATIONS.map((classification) => ({
      classificationId: classification.id,
      label: classification.label,
      amount: dayWeight ? (dayPot * (Number(prizeWeights.daily[classification.id] || 0) / dayWeight)) / stageCount : 0
    })),
    finalGeneralPlaces: getGeneralFinalPlacePrizes(prizeWeights, finalPot, finalClassificationWeight),
    stageWinner: dayWeight ? (dayPot * (Number(prizeWeights.daily.stageWinner || 0) / dayWeight)) / stageCount : 0
  };
  let reservedStageWinnerMoney = 0;
  let reservedDailyMoney = 0;
  const loadedStageNames = currentState.stages.filter((stage) => stage.results.trim()).map((stage) => stage.name);

  CLASSIFICATIONS.forEach((classification) => {
    if (classification.id === "general") {
      if (finalPotUnlocked) {
        distributeGeneralFinalPrizes({
          rows: standings.total.general || [],
          prizeWeights,
          finalPot,
          finalClassificationWeight,
          money,
          details
        });
      }
    } else {
      const finalWinners = getTiedLeaders(standings.total[classification.id], classification);
      const finalPrize = prizeBreakdown.final.find((item) => item.classificationId === classification.id)?.amount || 0;
      if (finalWinners.length > 0 && finalPotUnlocked) {
        const finalShare = finalPrize / finalWinners.length;
        finalWinners.forEach((finalWinner) => {
          ensureMoneyTeam(money, details, finalWinner.name);
          money.set(finalWinner.name, money.get(finalWinner.name) + finalShare);
          details.get(finalWinner.name).push({
            type: "Eindprijs",
            source: classification.label,
            classificationId: classification.id,
            amount: finalShare,
            note: finalWinners.length > 1 ? `Gedeelde winnaar eindklassement met ${finalWinners.map((item) => displayTeamName(item.name)).join(", ")}` : "Winnaar eindklassement"
          });
        });
      }
    }

    const dayPrize = prizeBreakdown.daily.find((item) => item.classificationId === classification.id)?.amount || 0;
    const classificationDayEntries = standings.dayWinDetails.filter((entry) => entry.classificationId === classification.id);
    classificationDayEntries
      .forEach((entry) => {
        const share = GAME_LOGIC.splitPrize(dayPrize, entry.shareCount || 1);
        ensureMoneyTeam(money, details, entry.teamName);
        money.set(entry.teamName, money.get(entry.teamName) + share);
        details.get(entry.teamName).push({
          type: "Dagprijs",
          source: `${entry.stage} - ${classification.label}`,
          classificationId: classification.id,
          amount: share,
          note: `${entry.shareCount > 1 ? "Gedeelde leiderstrui" : "Leiderstrui"} na ${entry.stage} met score ${formatClassificationScore(entry.score, classification)}${entry.shareCount > 1 ? `; gedeeld met ${entry.sharedWith.map(displayTeamName).join(", ")}` : ""}`
        });
      });
    loadedStageNames.forEach((stageName) => {
      if (!classificationDayEntries.some((entry) => entry.stage === stageName)) reservedDailyMoney += dayPrize;
    });
  });

  const stageWinnerPrize = prizeBreakdown.stageWinner;
  const finalStageWinner = standings.stageWinners.find((entry) => getStageNumber(entry.stage) === stageCount);
  standings.stageWinners.forEach((stageWinner) => {
    if (stageWinner.teams.length === 0) {
      reservedStageWinnerMoney += stageWinnerPrize;
      return;
    }
    const share = GAME_LOGIC.splitPrize(stageWinnerPrize, stageWinner.teams.length);
    stageWinner.teams.forEach((teamName) => {
      ensureMoneyTeam(money, details, teamName);
      money.set(teamName, money.get(teamName) + share);
      details.get(teamName).push({
        type: "Etappewinnaar",
        source: stageWinner.stage,
        classificationId: "stage-winner",
        amount: share,
        note: `${stageWinner.riders.map(formatRiderName).join(", ")} gekozen${stageWinner.teams.length > 1 ? `; gedeeld met ${stageWinner.teams.map(displayTeamName).join(", ")}` : ""}`
      });
    });
  });
  const rolloverMoney = reservedStageWinnerMoney + reservedDailyMoney;
  const rolloverRecipients = finalStageWinner?.teams.length
    ? finalStageWinner.teams
    : (finalStageWinner ? getTiedLeaders(standings.total.general || [], CLASSIFICATIONS[0]).map((row) => row.name) : []);
  if (rolloverRecipients.length && rolloverMoney > 0) {
    const share = GAME_LOGIC.splitPrize(rolloverMoney, rolloverRecipients.length);
    rolloverRecipients.forEach((teamName) => {
      ensureMoneyTeam(money, details, teamName);
      money.set(teamName, money.get(teamName) + share);
      details.get(teamName).push({
        type: "Etappewinnaar",
        source: "Opgespaarde etappewinnaarspot",
        classificationId: "stage-winner",
        amount: share,
        note: finalStageWinner?.teams.length
          ? `Niet-uitgekeerde dagprijzen naar teams met de winnaar van de laatste etappe${rolloverRecipients.length > 1 ? `; gedeeld met ${rolloverRecipients.map(displayTeamName).join(", ")}` : ""}`
          : `Niemand had de winnaar van de laatste etappe; doorgeschoven naar ${rolloverRecipients.length > 1 ? "de gedeelde winnaars" : "de winnaar"} van het algemeen klassement`
      });
    });
    reservedStageWinnerMoney = 0;
    reservedDailyMoney = 0;
  }

  const rows = [...money.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const moneyTimeline = calculateMoneyTimeline(standings, currentState);
  const previousRows = moneyTimeline.length > 1 ? moneyTimeline[moneyTimeline.length - 2].rows : [];
  const rowsWithDelta = rows.map((row, index) => {
    const previousIndex = previousRows.findIndex((item) => item.name === row.name);
    const previousRow = previousIndex >= 0 ? previousRows[previousIndex] : null;
    return {
      ...row,
      delta: previousIndex >= 0 ? previousIndex + 1 - (index + 1) : 0,
      scoreDelta: previousRow ? row.value - previousRow.value : 0
    };
  });
  const assignedMoney = rows.reduce((sum, row) => sum + row.value, 0);
  const dayMoneyPerStage = dayPot / stageCount;
  const remainingStageMoney = Math.max(stageCount - loadedStageCount, 0) * dayMoneyPerStage;
  const remainingFinalMoney = finalPotUnlocked ? 0 : finalPot;
  const accountedMoney = assignedMoney + reservedStageWinnerMoney + reservedDailyMoney + remainingStageMoney + remainingFinalMoney;

  return {
    rows: rowsWithDelta,
    details,
    pot,
    assignedMoney,
    finalPotUnlocked,
    remainingStageMoney,
    remainingFinalMoney,
    accountedMoney,
    reservedStageWinnerMoney,
    reservedDailyMoney,
    stageWinnerPrize,
    prizeBreakdown
  };
}

function ensureMoneyTeam(money, details, teamName) {
  if (!money.has(teamName)) money.set(teamName, 0);
  if (!details.has(teamName)) details.set(teamName, []);
}

function distributeGeneralFinalPrizes({ rows, prizeWeights, finalPot, finalClassificationWeight, money, details }) {
  const placePrizes = getGeneralFinalPlacePrizes(prizeWeights, finalPot, finalClassificationWeight);
  const payablePlaces = placePrizes.filter((item) => item.amount > 0);
  if (!payablePlaces.length || !rows?.length) return;
  const prizeGroups = getPrizeGroupsForPlaces(rows, payablePlaces.map((item) => item.place));
  prizeGroups.forEach((group) => {
    const groupPrizes = payablePlaces.filter((item) => group.places.includes(item.place));
    const groupAmount = groupPrizes.reduce((sum, item) => sum + item.amount, 0);
    if (!groupAmount || !group.rows.length) return;
    const share = groupAmount / group.rows.length;
    const placeText = group.places.length === 1
      ? `plek ${group.places[0]}`
      : `plekken ${group.places.join(", ")}`;
    group.rows.forEach((row) => {
      ensureMoneyTeam(money, details, row.name);
      money.set(row.name, money.get(row.name) + share);
      details.get(row.name).push({
        type: "Eindprijs",
        source: `Algemeen ${placeText}`,
        classificationId: "general",
        amount: share,
        note: group.rows.length > 1
          ? `Gedeelde eindprijs algemeen ${placeText} met ${group.rows.map((item) => displayTeamName(item.name)).join(", ")}`
          : `Eindprijs algemeen ${placeText}`
      });
    });
  });
}

function getGeneralFinalPlacePrizes(prizeWeights, finalPot, finalClassificationWeight) {
  return [
    { place: 1, key: "general", label: "Algemeen plek 1" },
    { place: 2, key: "general2", label: "Algemeen plek 2" },
    { place: 3, key: "general3", label: "Algemeen plek 3" }
  ].map((item) => ({
    ...item,
    weight: Number(prizeWeights.final[item.key] || 0),
    amount: finalClassificationWeight ? finalPot * (Number(prizeWeights.final[item.key] || 0) / finalClassificationWeight) : 0
  }));
}

function getPrizeGroupsForPlaces(rows, places) {
  const finiteRows = (rows || []).filter((row) => Number.isFinite(row.value));
  const groups = [];
  let index = 0;
  while (index < finiteRows.length) {
    const value = finiteRows[index].value;
    const tiedRows = [];
    while (index < finiteRows.length && finiteRows[index].value === value) {
      tiedRows.push(finiteRows[index]);
      index += 1;
    }
    const from = index - tiedRows.length + 1;
    const until = index;
    const groupPlaces = places.filter((place) => place >= from && place <= until);
    if (groupPlaces.length) groups.push({ rows: tiedRows, places: groupPlaces });
  }
  return groups;
}

function calculateMoneyTimeline(standings, currentState) {
  const teams = currentState.teams.map(teamKey);
  const money = new Map(teams.map((team) => [team, 0]));
  const pot = teams.length * Number(currentState.settings.stake || 0);
  const dayPot = pot * (getPrizePotSplit(currentState).daily / 100);
  const prizeWeights = getPrizeWeights(currentState);
  const dailyClassificationWeight = sumClassificationWeights(prizeWeights.daily);
  const dayWeight = dailyClassificationWeight + Number(prizeWeights.daily.stageWinner || 0);
  const stageCount = Number(currentState.settings.stageCount || 1);
  const stageWinnerPrize = dayWeight ? (dayPot * (Number(prizeWeights.daily.stageWinner || 0) / dayWeight)) / stageCount : 0;
  const timeline = [];
  let reservedRolloverMoney = 0;

  currentState.stages
    .filter((stage) => stage.results.trim())
    .forEach((stage) => {
      CLASSIFICATIONS.forEach((classification) => {
        const dayPrize = dayWeight ? (dayPot * (Number(prizeWeights.daily[classification.id] || 0) / dayWeight)) / stageCount : 0;
        const entries = standings.dayWinDetails.filter((entry) => entry.stage === stage.name && entry.classificationId === classification.id);
        if (!entries.length) reservedRolloverMoney += dayPrize;
        entries
          .forEach((entry) => {
            const share = GAME_LOGIC.splitPrize(dayPrize, entry.shareCount || 1);
            money.set(entry.teamName, money.get(entry.teamName) + share);
          });
      });

      const stageWinner = standings.stageWinners.find((entry) => entry.stage === stage.name);
      if (stageWinner?.teams.length) {
        const share = GAME_LOGIC.splitPrize(stageWinnerPrize, stageWinner.teams.length);
        stageWinner.teams.forEach((teamName) => {
          money.set(teamName, money.get(teamName) + share);
        });
      } else {
        reservedRolloverMoney += stageWinnerPrize;
      }
      if (getStageNumber(stage.name) === stageCount && reservedRolloverMoney > 0) {
        const recipients = stageWinner?.teams.length
          ? stageWinner.teams
          : getTiedLeaders(standings.total.general || [], CLASSIFICATIONS[0]).map((row) => row.name);
        const share = GAME_LOGIC.splitPrize(reservedRolloverMoney, recipients.length);
        recipients.forEach((teamName) => money.set(teamName, money.get(teamName) + share));
        if (recipients.length) reservedRolloverMoney = 0;
      }

      timeline.push({
        stage: stage.name,
        rows: [...money.entries()]
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .map((row, index) => ({ ...row, rank: index + 1 }))
      });
    });

  return timeline;
}

function emptyScores() {
  return Object.fromEntries(CLASSIFICATIONS.map((item) => [item.id, new Map()]));
}

function emptyDetails() {
  return Object.fromEntries(CLASSIFICATIONS.map((item) => [item.id, new Map()]));
}

function mapToSortedTables(scoreMaps, fallbackClassification) {
  return Object.fromEntries(CLASSIFICATIONS.map((classification) => {
    const sorter = fallbackClassification || classification;
    return [classification.id, sortEntries(scoreMaps[classification.id], sorter).map(([name, value]) => ({ name, value }))];
  }));
}

function addRanksToTables(tables) {
  return Object.fromEntries(CLASSIFICATIONS.map((classification) => [
    classification.id,
    (tables[classification.id] || []).map((row, index) => ({ ...row, rank: index + 1 }))
  ]));
}

function getTiedLeaders(rows, classification) {
  if (!rows?.length || !Number.isFinite(rows[0].value)) return [];
  const best = rows[0].value;
  return rows.filter((row) => row.value === best && Number.isFinite(row.value));
}

function sortEntries(map, classification) {
  return [...map.entries()].sort((a, b) => {
    if (a[1] === b[1]) return a[0].localeCompare(b[0], "nl");
    return classification.mode === "low" ? a[1] - b[1] : b[1] - a[1];
  });
}

function renderStanding(title, rows, classification) {
  const wrapper = document.createElement("section");
  wrapper.className = `standing standing-${classification.id}`;
  wrapper.innerHTML = `
    <h3>${escapeHtml(title)}</h3>
    <table>
      <thead><tr><th>#</th><th></th><th>Team</th><th>Score</th><th>Pos.</th><th>Score &Delta;</th></tr></thead>
      <tbody>
        ${rows.map((row, index) => `
          <tr class="clickable-row ${index === 0 ? "leader-row" : ""}" data-detail-kind="classification" data-classification="${classification.id}" data-team="${escapeAttr(row.name)}">
            <td>${index + 1}</td>
            <td>${index === 0 ? renderClassificationKit(classification.id) : renderTeamKit(row.name)}</td>
            <td>
              <button type="button" class="detail-open">${escapeHtml(displayTeamName(row.name))}</button>
            </td>
            <td>${formatStandingScore(row, rows, classification)}</td>
            <td>${formatDelta(row.delta)}</td>
            <td>${formatScoreDelta(row.scoreDelta, classification)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
  return wrapper;
}

function renderMoneyStanding(rows) {
  const wrapper = document.createElement("section");
  wrapper.className = "standing standing-money";
  wrapper.innerHTML = `
    <h3>Ploegenklassement</h3>
    <table>
      <thead><tr><th>#</th><th></th><th>Team</th><th>Bedrag</th><th>Pos.</th><th>Bedrag &Delta;</th></tr></thead>
      <tbody>
        ${rows.rows.map((row, index) => `
          <tr class="clickable-row" data-detail-kind="money" data-team="${escapeAttr(row.name)}">
            <td>${index + 1}</td>
            <td>${renderTeamKit(row.name)}</td>
            <td>${escapeHtml(displayTeamName(row.name))}</td>
            <td>${formatCurrency(row.value)}</td>
            <td>${formatDelta(row.delta)}</td>
            <td>${formatMoneyDelta(row.scoreDelta)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
  return wrapper;
}

function renderPrizePotData() {
  if (!els.prizePotData) return;
  saveFromForm();
  const standings = calculateStandings(state);
  const money = calculateMoney(standings, state);
  const prizePotSplit = getPrizePotSplit(state);
  els.prizePotData.innerHTML = `
    <div class="prize-pot-summary">
      <article><strong>Totale pot</strong><span>${formatCurrency(money.pot)}</span></article>
      <article><strong>Dagpot (${formatNumber(prizePotSplit.daily)}%)</strong><span>${formatCurrency(money.pot * prizePotSplit.daily / 100)}</span></article>
      <article><strong>Eindpot (${formatNumber(prizePotSplit.final)}%)</strong><span>${formatCurrency(money.pot * prizePotSplit.final / 100)}</span></article>
      <article><strong>Nu toegewezen</strong><span>${formatCurrency(money.assignedMoney)}</span></article>
    </div>
    <p class="hint">De dagpot wordt per etappe verdeeld. De eindpot wordt pas na etappe ${formatNumber(Number(state.settings.stageCount || 1))} uitgekeerd. Gelijke standen delen de prijs.</p>
    ${renderPrizePotOverview(money)}
    ${renderPrizeBreakdown(money, { open: true })}
    <section class="prize-rules">
      <h3>Regels prijzengeld</h3>
      <ul>
        <li>Dagprijzen voor klassementen gaan naar de leider van het poolklassement na de etappe; gedeelde leiders delen de pot.</li>
        <li>De etappewinnaarspot gaat naar teams met de echte etappewinnaar in het actieve team; meerdere teams delen de pot.</li>
        <li>Heeft niemand de etappewinnaar gekozen, dan wordt die spot opgespaard voor de winnaar van de laatste etappe.</li>
        <li>De eindpot wordt pas na de laatste etappe uitgekeerd; gelijke eindstanden delen de eindprijs.</li>
      </ul>
    </section>
  `;
}

function renderPrizePotOverview(money, options = {}) {
  const prizeWeights = getPrizeWeights(state);
  const finalWeight = sumFinalPrizeWeights(prizeWeights.final);
  const dailyClassificationWeight = sumClassificationWeights(prizeWeights.daily);
  const dailyTotalWeight = dailyClassificationWeight + Number(prizeWeights.daily.stageWinner || 0);
  const stageCount = Number(state.settings.stageCount || 1);
  const finalItems = money.prizeBreakdown?.final || [];
  const dailyItems = money.prizeBreakdown?.daily || [];
  const rows = [
    ...CLASSIFICATIONS.flatMap((classification) => {
      const finalAmount = finalItems.find((item) => item.classificationId === classification.id)?.amount || 0;
      const dailyAmount = dailyItems.find((item) => item.classificationId === classification.id)?.amount || 0;
      const baseRow = {
        className: moneyDetailRowClass({ classificationId: classification.id }),
        label: classification.label,
        finalKey: `final.${classification.id}`,
        dailyKey: `daily.${classification.id}`,
        finalWeight: Number(prizeWeights.final[classification.id] || 0),
        dailyWeight: Number(prizeWeights.daily[classification.id] || 0),
        finalAmount,
        dailyAmount,
        totalDailyAmount: dailyAmount * stageCount,
        note: "Dagprijs voor leider; eindprijs voor eindwinnaar."
      };
      if (classification.id !== "general") return [baseRow];
      return [
        { ...baseRow, label: "Algemeen plek 1", note: "Eindprijs voor nummer 1 algemeen; dagprijs voor leider algemeen." },
        {
          ...baseRow,
          label: "Algemeen plek 2",
          finalKey: "final.general2",
          dailyKey: "",
          finalWeight: Number(prizeWeights.final.general2 || 0),
          dailyWeight: 0,
          finalAmount: getPrizeAmountByKey(money, "final.general2"),
          dailyAmount: 0,
          totalDailyAmount: 0,
          note: "Alleen eindprijs voor nummer 2 algemeen."
        },
        {
          ...baseRow,
          label: "Algemeen plek 3",
          finalKey: "final.general3",
          dailyKey: "",
          finalWeight: Number(prizeWeights.final.general3 || 0),
          dailyWeight: 0,
          finalAmount: getPrizeAmountByKey(money, "final.general3"),
          dailyAmount: 0,
          totalDailyAmount: 0,
          note: "Alleen eindprijs voor nummer 3 algemeen."
        }
      ];
    }),
    {
      className: "detail-money-stage-winner",
      label: "Etappewinnaar",
      finalKey: "",
      dailyKey: "daily.stageWinner",
      finalWeight: 0,
      dailyWeight: Number(prizeWeights.daily.stageWinner || 0),
      finalAmount: 0,
      dailyAmount: money.prizeBreakdown?.stageWinner || 0,
      totalDailyAmount: (money.prizeBreakdown?.stageWinner || 0) * stageCount,
      note: "Niet gekozen? Dan opgespaard voor de winnaar van de laatste etappe."
    }
  ];
  const totalDailyAmount = rows.reduce((sum, row) => sum + row.totalDailyAmount, 0);
  const totalFinalAmount = rows.reduce((sum, row) => sum + row.finalAmount, 0);
  const finalWeightLabel = finalWeight ? formatNumber(finalWeight) : "-";
  const dailyWeightLabel = dailyTotalWeight ? formatNumber(dailyTotalWeight) : "-";
  return `
    <section class="prize-pot-overview">
      <h3>Overzicht verdeling</h3>
      <table>
        <thead>
          <tr>
            <th>Onderdeel</th>
            <th>Eindweging</th>
            <th>Eindbedrag</th>
            <th>Dagweging</th>
            <th>Per etappe</th>
            <th>Dagpot totaal</th>
            <th>Uitleg</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr class="${row.className}">
              <td>${escapeHtml(row.label)}</td>
              <td>${renderWeightCell(row.finalKey, row.finalWeight, finalWeightLabel, options)}</td>
              <td>${formatCurrency(row.finalAmount)}</td>
              <td>${renderWeightCell(row.dailyKey, row.dailyWeight, dailyWeightLabel, options)}</td>
              <td>${formatCurrency(row.dailyAmount)}</td>
              <td>${formatCurrency(row.totalDailyAmount)}</td>
              <td>${escapeHtml(row.note)}</td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot>
          <tr>
            <th>Totaal</th>
            <th>${finalWeightLabel}</th>
            <th>${formatCurrency(totalFinalAmount)}</th>
            <th>${dailyWeightLabel}</th>
            <th>${formatCurrency(totalDailyAmount / stageCount)}</th>
            <th>${formatCurrency(totalDailyAmount)}</th>
            <th>Eindprijzen samen: ${formatCurrency(totalFinalAmount)}. Dagprijzen samen: ${formatCurrency(totalDailyAmount)}. Totaal: ${formatCurrency(totalFinalAmount + totalDailyAmount)}.</th>
          </tr>
        </tfoot>
      </table>
    </section>
  `;
}

function getPrizeAmountByKey(money, key) {
  if (key === "final.general2") return money.prizeBreakdown?.finalGeneralPlaces?.find((item) => item.place === 2)?.amount || 0;
  if (key === "final.general3") return money.prizeBreakdown?.finalGeneralPlaces?.find((item) => item.place === 3)?.amount || 0;
  return 0;
}

function renderWeightCell(key, weight, totalLabel, options = {}) {
  if (!key) return "-";
  if (!options.editable) return formatWeightShare(weight, totalLabel);
  return `
    <span class="weight-edit-cell">
      <input data-prize-weight="${escapeAttr(key)}" type="number" min="0" step="0.5" value="${formatInputNumber(weight)}">
      <span>/ ${escapeHtml(totalLabel)}</span>
    </span>
  `;
}

function formatWeightShare(weight, totalLabel) {
  const numericWeight = Number(weight || 0);
  if (!numericWeight) return "-";
  return `${formatNumber(numericWeight)} / ${totalLabel}`;
}

function renderPrizeBreakdown(money, options = {}) {
  const daily = money.prizeBreakdown?.daily || [];
  const final = [
    ...(money.prizeBreakdown?.final || []).map((item) => item.classificationId === "general" ? { ...item, label: "Algemeen plek 1" } : item),
    ...(money.prizeBreakdown?.finalGeneralPlaces || [])
      .filter((item) => item.place > 1)
      .map((item) => ({
        classificationId: "general",
        label: item.label,
        amount: item.amount
      }))
  ];
  return `
    <details class="money-breakdown" ${options.open ? "open" : ""}>
      <summary>Prijzenschema</summary>
      <table>
        <thead><tr><th>Prijs</th><th>Wanneer</th><th>Bedrag</th><th>Toelichting</th></tr></thead>
        <tbody>
          ${daily.map((item) => `
            <tr class="${moneyDetailRowClass({ classificationId: item.classificationId })}">
              <td>${escapeHtml(item.label)}</td>
              <td>Per etappe</td>
              <td>${formatCurrency(item.amount)}</td>
              <td>Leider van het poolklassement ${escapeHtml(item.label.toLowerCase())} na die etappe.</td>
            </tr>
          `).join("")}
          <tr class="detail-money-stage-winner">
            <td>Etappewinnaar</td>
            <td>Per etappe</td>
            <td>${formatCurrency(money.prizeBreakdown?.stageWinner || 0)}</td>
            <td>Voor teams met de echte etappewinnaar in het actieve team; gedeeld als meerdere teams hem hebben. Niet gekozen? Dan naar de winnaar van de laatste etappe.</td>
          </tr>
          ${final.map((item) => `
            <tr class="${moneyDetailRowClass({ classificationId: item.classificationId })}">
              <td>${escapeHtml(item.label)}</td>
              <td>Na etappe ${formatNumber(Number(state.settings.stageCount || 1))}</td>
              <td>${formatCurrency(item.amount)}</td>
              <td>${item.classificationId === "general" ? `${escapeHtml(item.label)} in het eindklassement algemeen` : `Winnaar van het eindklassement ${escapeHtml(item.label.toLowerCase())}`}; gedeeld bij gelijke stand.</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </details>
  `;
}

function saveFromForm() {
  state.settings.stake = Number(els.stake.value || 0);
  state.settings.budget = Number(els.budget.value || 0);
  state.settings.stageCount = Number(els.stageCount.value || 1);
  state.settings.prizePotSplit = {
    final: Number(els.finalPotPercentage?.value ?? state.settings.prizePotSplit?.final ?? DEFAULT_PRIZE_POT_SPLIT.final),
    daily: Number(els.dailyPotPercentage?.value ?? state.settings.prizePotSplit?.daily ?? DEFAULT_PRIZE_POT_SPLIT.daily)
  };
  state.settings.prizeWeights = readPrizeWeightsFromForm();
  state.settings.bcPrices = readBcPricesFromForm();
  state.settings.exchangeWindows = readExchangeWindowsFromForm();

  state.teams.forEach((team, index) => {
    if (!document.querySelector(`[data-team-name="${index}"]`)) return;
    team.name = document.querySelector(`[data-team-name="${index}"]`)?.value || team.name;
    team.teamName = document.querySelector(`[data-team-title="${index}"]`)?.value || team.teamName || "";
    team.color1 = document.querySelector(`[data-team-color1="${index}"]`)?.value || team.color1 || "#f6d32d";
    team.color2 = document.querySelector(`[data-team-color2="${index}"]`)?.value || team.color2 || "#ffffff";
    team.riders = serializeSelectedRiders(`[data-team-rider-choice="${index}"]:checked`, team.riders);
    team.reserves = serializeSelectedRiders(`[data-team-reserve-choice="${index}"]:checked`, team.reserves);
  });

  state.stages.forEach((stage, index) => {
    stage.name = document.querySelector(`[data-stage-name="${index}"]`)?.value || stage.name;
    stage.results = document.querySelector(`[data-stage-results="${index}"]`)?.value ?? stage.results ?? "";
    stage.importCsv = document.querySelector(`[data-stage-csv="${index}"]`)?.value ?? stage.importCsv ?? "";
  });
}

function readBcPricesFromForm() {
  const prices = {};
  document.querySelectorAll("[data-bc-price]").forEach((input) => {
    const key = normalizeName(input.dataset.bcPrice || "");
    if (!key) return;
    const value = Number(input.value || 0);
    const rider = tourRiders.find((item) => normalizeName(item.name) === key);
    if (!rider || value !== Number(rider.basePrice || 0)) prices[key] = value;
  });
  return prices;
}

function recordOverwrittenPriceWarnings() {
  const candidates = state.priceOverwriteCandidates || {};
  Object.entries(candidates).forEach(([riderName, previousPrice]) => {
    const rider = tourRiders.find((item) => normalizeName(item.name) === normalizeName(riderName));
    if (!rider || Number(previousPrice) === Number(rider.basePrice || 0)) return;
    recordImportWarning(
      "BC-prijs overschreven",
      `${rider.displayName}: handmatige prijs ${formatNumber(Number(previousPrice))} BC is door de nieuwe prijslijst vervangen door ${formatNumber(Number(rider.basePrice || 0))} BC.`,
      `price-overwrite-${PRICE_VERSION}-${rider.name}-${previousPrice}-${rider.basePrice}`
    );
  });
  delete state.priceOverwriteCandidates;
}

function readExchangeWindowsFromForm() {
  const windows = normalizeExchangeWindows(state.settings.exchangeWindows);
  document.querySelectorAll("[data-exchange-window]").forEach((input) => {
    const [rawIndex, field] = input.dataset.exchangeWindow.split(".");
    const index = Number(rawIndex);
    if (!windows[index]) return;
    windows[index][field] = field === "afterStage" ? Number(input.value || 0) : input.value;
  });
  return windows;
}

function readPrizeWeightsFromForm() {
  const prizeWeights = normalizePrizeWeights(state.settings.prizeWeights);
  document.querySelectorAll("[data-prize-weight]").forEach((input) => {
    const [scope, key] = String(input.dataset.prizeWeight || "").split(".");
    if (!scope || !key) return;
    prizeWeights[scope][key] = Number(input.value || 0);
  });
  return prizeWeights;
}

function serializeSelectedRiders(selector, fallback) {
  const teamMatch = selector.match(/data-team-(rider|reserve)-choice="(\d+)"/);
  if (teamMatch) {
    const [, kind, teamIndex] = teamMatch;
    const rosterSelector = `[data-roster-list="${teamIndex}"][data-roster-kind="${kind}"] [data-roster-rider]`;
    const rosterRows = [...document.querySelectorAll(rosterSelector)];
    if (rosterRows.length) {
      return rosterRows
        .map((row) => `${row.dataset.rosterRider}, ${Number(row.dataset.price || 0)}`)
        .join("\n");
    }
  }
  const choices = [...document.querySelectorAll(selector)];
  if (!choices.length) return "";
  return choices
    .map((choice) => {
      const name = choice.dataset.riderName;
      if (!name) return "";
      const price = Number(choice.dataset.price || 0);
      return `${name}, ${price}`;
    })
    .filter(Boolean)
    .join("\n");
}

function parseRiderList(value) {
  return value.split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, price = "0"] = line.split(",").map((part) => part.trim());
      return { name, price: getCurrentRiderPrice(name, Number(price) || 0) };
    });
}

function getCurrentRiderPrice(riderName, fallback = 0) {
  const rider = tourRiders.find((item) => normalizeName(item.name) === normalizeName(riderName));
  return Number(rider?.bc ?? rider?.price ?? fallback) || 0;
}

function getStageNumber(name) {
  const match = String(name || "").match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}

function parseStageResults(value) {
  const results = new Map();
  value.split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [rawName, ...pairs] = line.split(",").map((part) => part.trim());
      const scores = {};
      scores.name = rawName;
      pairs.forEach((pair) => {
        const [key, rawValue] = pair.split("=").map((part) => part.trim());
        if (["out", "dnf", "dns", "otl", "dsq"].includes(key) && ["1", "true", "ja", "yes"].includes(String(rawValue).toLowerCase())) {
          scores.withdrawn = true;
          scores.withdrawalCode = key.toUpperCase();
          return;
        }
        if (key === "winner" && ["1", "true", "ja", "yes"].includes(String(rawValue).toLowerCase())) {
          scores.winner = true;
          return;
        }
        const value = Number(rawValue);
        if (CLASSIFICATIONS.some((item) => item.id === key) && Number.isFinite(value)) {
          scores[key] = value;
        }
      });
      results.set(normalizeName(rawName), scores);
    });
  return results;
}

function mergeStageResultText(existingText, incomingText) {
  const merged = new Map(parseStageResults(existingText));
  parseStageResults(incomingText).forEach((scores, key) => {
    const current = merged.get(key) || { name: scores.name };
    merged.set(key, {
      ...current,
      ...scores,
      name: current.name || scores.name
    });
  });
  return formatStageResults(merged);
}

function formatStageResults(results) {
  return [...results.values()].map((scores) => {
    const pairs = [];
    CLASSIFICATIONS.forEach((classification) => {
      if (Number.isFinite(scores[classification.id])) {
        pairs.push(`${classification.id}=${scores[classification.id]}`);
      }
    });
    if (scores.winner) pairs.push("winner=1");
    if (scores.withdrawn) pairs.push(`${String(scores.withdrawalCode || "DNF").toLowerCase()}=1`);
    return `${scores.name}, ${pairs.join(", ")}`;
  }).join("\n");
}

function findRiderResult(stageResults, riderName) {
  const key = normalizeName(riderName);
  const exact = stageResults.get(key);
  if (exact) return exact;

  for (const [resultName, result] of stageResults.entries()) {
    if (riderNamesMatch(key, resultName)) return result;
  }
  return null;
}

function riderNamesMatch(rosterName, resultName) {
  if (rosterName === resultName) return true;
  if (resultName.startsWith(`${rosterName} `)) return true;
  if (rosterName.startsWith(`${resultName} `)) return true;
  return false;
}

function findStageWinners(stageResults) {
  const explicit = [...stageResults.entries()]
    .filter(([, scores]) => scores.winner)
    .map(([, scores]) => scores.name);
  if (explicit.length > 0) return explicit;
  const generalRows = [...stageResults.entries()]
    .filter(([, scores]) => Number.isFinite(scores.general))
    .sort((a, b) => a[1].general - b[1].general);
  return generalRows.length > 0 ? [generalRows[0][1].name] : [];
}

function renderClassificationDetail(classificationId, teamName, standings, options = {}) {
  const classification = CLASSIFICATIONS.find((item) => item.id === classificationId);
  const stages = [...new Set(standings.progress.map((entry) => entry.stage))];
  const riders = classificationDetailRiders(standings);
  const mode = options.mode || "team";
  const selectedTeam = options.selectedTeam || teamName;
  const selectedStage = options.selectedStage || stages[stages.length - 1] || "";
  const selectedRider = options.selectedRider || riders[0]?.name || "";
  els.details.innerHTML = `
    <div class="classification-detail detail-theme-${classification.id} ${mode === "rider" ? "classification-detail-rider-mode" : ""}" data-classification-detail-root="${escapeAttr(classification.id)}" data-current-team="${escapeAttr(teamName)}">
      <h3>${escapeHtml(displayTeamName(teamName))} - ${escapeHtml(classification.label)}</h3>
      ${renderClassificationDetailControls(classification, mode, selectedTeam, selectedStage, selectedRider, stages, riders)}
      ${mode === "stage"
        ? renderClassificationStageDetail(classification, standings, selectedStage)
        : mode === "rider"
          ? renderClassificationRiderDetail(standings, selectedRider, stages)
          : renderClassificationTeamDetail(classification, standings, selectedTeam)}
    </div>
  `;
  els.details.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderClassificationDetailControls(classification, mode, selectedTeam, selectedStage, selectedRider, stages, riders) {
  return `
    <div class="classification-detail-controls">
      <label>
        Weergave
        <select data-classification-detail-control data-detail-progress-mode>
          <option value="team" ${mode === "team" ? "selected" : ""}>Overzicht per deelnemer</option>
          <option value="stage" ${mode === "stage" ? "selected" : ""}>Overzicht per etappe</option>
          <option value="rider" ${mode === "rider" ? "selected" : ""}>Overzicht per renner</option>
        </select>
      </label>
      <label class="${mode === "team" ? "" : "is-hidden"}">
        Deelnemer
        <select data-classification-detail-control data-detail-progress-team>
          ${state.teams.map((team) => `<option value="${escapeAttr(teamKey(team))}" ${teamKey(team) === selectedTeam ? "selected" : ""}>${escapeHtml(displayTeamName(teamKey(team)))}</option>`).join("")}
        </select>
      </label>
      <label class="${mode === "stage" ? "" : "is-hidden"}">
        Etappe
        <select data-classification-detail-control data-detail-progress-stage>
          ${stages.map((stage) => `<option value="${escapeAttr(stage)}" ${stage === selectedStage ? "selected" : ""}>${escapeHtml(stage)}</option>`).join("")}
        </select>
      </label>
      <label class="${mode === "rider" ? "" : "is-hidden"}">
        Renner
        <select data-classification-detail-control data-detail-progress-rider>
          ${riders.map((rider) => `<option value="${escapeAttr(rider.name)}" ${rider.name === selectedRider ? "selected" : ""}>${escapeHtml(formatRiderName(rider.name))}</option>`).join("")}
        </select>
      </label>
      <span class="hint">${escapeHtml(classification.label)}: ${classification.id === "youth" ? "3" : "5"} meetellende renners per team per etappe.</span>
    </div>
  `;
}

function classificationDetailRiders(standings) {
  const riders = new Map();
  standings.progress.forEach((entry) => {
    entry.rows.forEach((row) => {
      if (!row.rider) return;
      const key = normalizeName(row.rider);
      if (!riders.has(key)) riders.set(key, { name: row.rider });
    });
  });
  return [...riders.values()]
    .sort((a, b) => formatRiderName(a.name).localeCompare(formatRiderName(b.name), "nl"));
}

function renderClassificationTeamDetail(classification, standings, teamName) {
  const rows = standings.progress
    .filter((entry) => entry.teamName === teamName && entry.classificationId === classification.id);
  if (!rows.length) return "<p>Geen meetellende renners gevonden.</p>";
  return `
    <div class="classification-progress-detail classification-progress-detail-team">
      ${rows.map((entry) => `
        <section class="progress-classification progress-${classification.id}">
          <h4>${escapeHtml(entry.stage)} <span>${formatClassificationScore(entry.total, classification)}</span></h4>
          ${renderProgressRowsTable(entry.rows, classification)}
        </section>
      `).join("")}
    </div>
  `;
}

function renderClassificationStageDetail(classification, standings, stageName) {
  const rows = standings.progress
    .filter((entry) => entry.stage === stageName && entry.classificationId === classification.id);
  if (!rows.length) return "<p>Geen meetellende renners gevonden.</p>";
  return `
    <div class="progress-stage-grid classification-progress-detail-stage">
      ${state.teams.map((team) => {
        const entry = rows.find((row) => row.teamName === teamKey(team));
        return `
          <article class="progress-team">
            <h3>${renderTeamKit(teamKey(team))} ${escapeHtml(displayTeamName(teamKey(team)))}</h3>
            ${renderClassificationProgress(entry, classification)}
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderClassificationRiderDetail(standings, riderName, stages) {
  if (!riderName) return "<p>Geen renner gekozen.</p>";
  const riderKey = normalizeName(riderName);
  const rows = stages.map((stage) => {
    const stageEntries = standings.progress.filter((entry) => entry.stage === stage);
    const teams = new Set();
    const scores = {};
    CLASSIFICATIONS.forEach((classification) => {
      const matches = stageEntries
        .filter((entry) => entry.classificationId === classification.id)
        .map((entry) => {
          const match = entry.rows.find((row) => riderNamesMatch(riderKey, normalizeName(row.rider)));
          if (match) teams.add(entry.teamName);
          return match;
        })
        .filter(Boolean);
      const score = matches.find((match) => Number.isFinite(match.score))?.score;
      scores[classification.id] = score;
    });
    return { stage, teams: [...teams], scores };
  });
  return `
    <div class="classification-progress-detail classification-progress-detail-rider">
      <table>
        <thead>
          <tr>
            <th>Etappe</th>
            <th>Algemeen</th>
            <th>Punten</th>
            <th>Jongeren</th>
            <th>Berg</th>
            <th>Meetellend bij</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.stage)}</td>
              ${CLASSIFICATIONS.map((classification) => `
                <td class="detail-score-${classification.id} ${Number.isFinite(row.scores[classification.id]) ? "detail-score-strong" : ""}">
                  ${Number.isFinite(row.scores[classification.id]) ? formatClassificationScore(row.scores[classification.id], classification) : "-"}
                </td>
              `).join("")}
              <td>${row.teams.length ? escapeHtml(row.teams.map(displayTeamName).join(", ")) : "-"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderProgressRowsTable(rows, classification) {
  return rows.length === 0 ? "<p class=\"hint\">Geen meetellende renners.</p>" : `
    <table>
      <thead><tr><th>#</th><th>Renner</th><th>Score</th></tr></thead>
      <tbody>
        ${rows.map((row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(formatRiderName(row.rider))}</td>
            <td>${formatClassificationScore(row.score, classification)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function totalRowsByRider(rows, classification) {
  const totals = new Map();
  rows.forEach((row) => {
    if (!Number.isFinite(row.score)) return;
    totals.set(row.rider, (totals.get(row.rider) || 0) + row.score);
  });
  return [...totals.entries()]
    .map(([rider, total]) => ({ rider, total }))
    .sort((a, b) => {
      if (a.total === b.total) return formatRiderName(a.rider).localeCompare(formatRiderName(b.rider), "nl");
      return classification.mode === "low" ? a.total - b.total : b.total - a.total;
    });
}

function renderMoneyDetail(teamName, money) {
  const rows = money.details.get(teamName) || [];
  els.details.innerHTML = `
    <h3>${escapeHtml(displayTeamName(teamName))} - ploegenklassement</h3>
    ${rows.length === 0 ? "<p>Nog geen prijzengeld.</p>" : `
      <table class="detail-table detail-money-table">
        <thead><tr><th>Type</th><th>Bron</th><th>Bedrag</th><th>Toelichting</th></tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr class="${moneyDetailRowClass(row)}">
              <td>${escapeHtml(row.type)}</td>
              <td>${escapeHtml(row.source)}</td>
              <td>${formatCurrency(row.amount)}</td>
              <td>${escapeHtml(row.note)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `}
  `;
  els.details.scrollIntoView({ behavior: "smooth", block: "start" });
}

function isStrongDetailRow(rows, row, classification) {
  const finite = rows
    .map((entry) => entry.score)
    .filter((score) => Number.isFinite(score));
  if (finite.length === 0 || !Number.isFinite(row.score)) return false;
  const sorted = [...finite].sort((a, b) => classification.mode === "low" ? a - b : b - a);
  const cutoff = sorted[Math.min(4, sorted.length - 1)];
  return classification.mode === "low" ? row.score <= cutoff : row.score >= cutoff;
}

function moneyDetailRowClass(row) {
  if (row.classificationId === "stage-winner" || row.type === "Etappewinnaar") return "detail-money-stage-winner";
  if (row.classificationId === "general") return "detail-money-general";
  if (row.classificationId === "points") return "detail-money-points";
  if (row.classificationId === "mountain") return "detail-money-mountain";
  if (row.classificationId === "youth") return "detail-money-youth";
  const source = normalizeText(row.source);
  if (source.includes("algemeen")) return "detail-money-general";
  if (source.includes("punten")) return "detail-money-points";
  if (source.includes("berg")) return "detail-money-mountain";
  if (source.includes("jongeren")) return "detail-money-youth";
  return "";
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseDelimitedRows(value) {
  return value.split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => splitDelimitedLine(line));
}

function splitDelimitedLine(line) {
  const delimiter = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
  return line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""));
}

function buildHeaderIndex(headers) {
  const aliases = {
    name: ["renner", "rider", "name", "naam"],
    general: ["general", "algemeen", "tijd", "time", "gc"],
    points: ["points", "punten", "point"],
    mountain: ["mountain", "berg", "kom"],
    youth: ["youth", "jongeren", "jongere"],
    winner: ["winner", "winnaar", "stagewinner", "etappewinnaar"],
    withdrawn: ["dnf", "dns", "out", "uitgevallen", "withdrawn"]
  };
  return Object.fromEntries(Object.entries(aliases).map(([key, names]) => [
    key,
    headers.findIndex((header) => names.includes(header))
  ]));
}

function parseCsvScoreRow(row, headerIndex, hasHeader, rowIndex) {
  const nameIndex = hasHeader ? headerIndex.name : 0;
  const name = row[nameIndex]?.trim();
  if (!name) return null;

  const scores = {};
  const mapping = hasHeader
    ? { general: headerIndex.general, points: headerIndex.points, mountain: headerIndex.mountain, youth: headerIndex.youth, winner: headerIndex.winner, withdrawn: headerIndex.withdrawn }
    : { general: 1, points: 2, mountain: 3, youth: 4, winner: 5, withdrawn: 6 };

  CLASSIFICATIONS.forEach((classification) => {
    const index = mapping[classification.id];
    if (index < 0 || index == null) return;
    const score = parseScoreCell(row[index], classification.mode);
    if (Number.isFinite(score)) scores[classification.id] = score;
    else if (String(row[index] ?? "").trim()) recordImportWarning(
      "Ongeldige uitslagwaarde",
      `${name}: '${String(row[index]).trim()}' is geen geldige waarde voor ${classification.label} en is niet als 0 ingelezen.`,
      `${name}-${classification.id}-${row[index]}`
    );
  });

  const winnerIndex = mapping.winner;
  if (winnerIndex >= 0 && isTruthyCell(row[winnerIndex])) {
    scores.winner = true;
  } else if (!hasHeader && rowIndex === 0 && Number.isFinite(scores.general)) {
    scores.winner = true;
  }

  const withdrawnIndex = mapping.withdrawn;
  if (withdrawnIndex >= 0 && isTruthyCell(row[withdrawnIndex])) {
    scores.withdrawn = true;
    scores.withdrawalCode = "DNF";
  }

  return { name, scores };
}

function parseScoreCell(value, mode) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return GAME_LOGIC.parseTimeValue(raw);
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase();
}

function isTruthyCell(value) {
  return ["1", "true", "ja", "yes", "y", "x", "winnaar", "winner"].includes(String(value || "").trim().toLowerCase());
}

function importStageCsv(value) {
  const rows = parseDelimitedRows(value);
  if (rows.length === 0) return "";
  const headers = rows[0].map(normalizeHeader);
  const hasHeader = headers.some((header) => ["renner", "rider", "name", "naam"].includes(header));
  const headerIndex = buildHeaderIndex(headers);
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const lines = new Map();

  dataRows.forEach((row, rowIndex) => {
    const imported = parseCsvScoreRow(row, headerIndex, hasHeader, rowIndex);
    if (!imported?.name) return;
    const key = normalizeName(imported.name);
    lines.set(key, {
      name: imported.name,
      scores: {
        ...(lines.get(key)?.scores || {}),
        ...imported.scores
      }
    });
  });

  return [...lines.values()].map(({ name, scores }) => {
    const pairs = [];
    CLASSIFICATIONS.forEach((classification) => {
      if (Number.isFinite(scores[classification.id])) {
        pairs.push(`${classification.id}=${scores[classification.id]}`);
      }
    });
    if (scores.winner) pairs.push("winner=1");
    if (scores.withdrawn) pairs.push(`${String(scores.withdrawalCode || "DNF").toLowerCase()}=1`);
    return `${name}, ${pairs.join(", ")}`;
  }).join("\n");
}

function mergeImportedScores(target, importedRows) {
  importedRows.forEach((row) => {
    const key = normalizeName(row.name);
    const current = target.get(row.name) || target.get(key) || {};
    target.delete(key);
    target.set(row.name, { ...current, ...row.scores });
  });
}

function parseHtmlClassification(html, classificationId, isTimeResult) {
  if (!html.trim()) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rows = [...doc.querySelectorAll("tr")]
    .map((row) => {
      const cells = [...row.children].map((cell) => cell.textContent.replace(/\s+/g, " ").trim()).filter(Boolean);
      return (cells.length > 0 ? cells.join(" ") : row.textContent).replace(/\s+/g, " ").trim();
    })
    .filter(Boolean);

  let validIndex = 0;
  return rows.map((text) => {
    const name = extractRiderName(text);
    if (!name) return null;
    const score = isTimeResult ? extractTimeGap(text, validIndex) : extractLastInteger(text);
    if (!Number.isFinite(score)) {
      recordImportWarning(
        "HTML-import zonder tijd",
        `${name}: geen herkenbaar tijdsverschil gevonden voor ${classificationId}; de renner is niet met 0 seconden ingeladen.`,
        `${classificationId}-${name}-${text}`
      );
      return null;
    }
    const isWinner = classificationId === "general" && validIndex === 0;
    validIndex += 1;
    return {
      name,
      scores: {
        [classificationId]: score,
        ...(isWinner ? { winner: true } : {})
      }
    };
  }).filter(Boolean);
}

function extractRiderName(rowText) {
  const withoutPosition = rowText.replace(/^\d+\s+/, "");
  const match = withoutPosition.match(/([A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ' .-]{2,}?)(?:\s{2,}|\s[A-Z]{2,3}\b|\s\d|\s\+)/u);
  return (match?.[1] || "").trim();
}

function extractTimeGap(rowText, rowIndex) {
  if (rowIndex === 0) return 0;
  const plus = rowText.match(/\+(\d{1,2}:\d{2}(?::\d{2})?|\d+)/);
  if (!plus) return null;
  return parseTimeToSeconds(plus[1]);
}

function extractLastInteger(rowText) {
  const matches = rowText.match(/\b\d+\b/g);
  if (!matches) return null;
  return Number(matches[matches.length - 1]);
}

function parseTimeToSeconds(value) {
  const parts = value.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return Number(value);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function normalizeName(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatRiderName(value) {
  const raw = stripRiderStatus(value);
  if (!raw) return "";
  const known = tourRiders.find((rider) => normalizeName(rider.name) === normalizeName(raw));
  return known?.displayName || fallbackRiderName(raw);
}

function stripRiderStatus(value) {
  return String(value || "").replace(/\s*\((?:DNS|DNF|OTL|DSQ|DNP|OUT)\s*#?\d*\)\s*$/i, "").trim();
}

function parseRiderStatus(value) {
  const match = String(value || "").match(/\((DNS|DNF|OTL|DSQ|DNP|OUT)\s*#?(\d+)?\)/i);
  if (!match) return null;
  const code = match[1].toUpperCase();
  const stage = Number(match[2]) || Number.POSITIVE_INFINITY;
  const effectiveStage = ["DNF", "OTL", "DSQ", "OUT"].includes(code) ? stage + 1 : stage;
  return {
    code,
    stage,
    effectiveStage
  };
}

function formatCqName(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^([A-ZÄÖÜÀ-ÖØ-Þ' .-]+)\s+(.+)$/u);
  if (!match) return fallbackRiderName(raw);
  return `${titleCaseName(match[2])} ${titleCaseName(match[1])}`.replace(/\s+/g, " ").trim();
}

function fallbackRiderName(value) {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return value;
  const given = parts.slice(-1).join(" ");
  const family = parts.slice(0, -1).join(" ");
  return `${titleCaseName(given)} ${titleCaseName(family)}`;
}

function titleCaseName(value) {
  return String(value || "")
    .toLowerCase()
    .split(/(\s+|-|')/)
    .map((part) => /^[a-zà-öø-ÿ]/iu.test(part) ? part.charAt(0).toUpperCase() + part.slice(1) : part)
    .join("")
    .replace(/\bVan\b/g, "van")
    .replace(/\bDer\b/g, "der")
    .replace(/\bDe\b/g, "de")
    .replace(/\bDel\b/g, "del");
}

function teamKey(team) {
  return GAME_LOGIC.teamKey(team);
}

function getTeamByName(teamName) {
  return state.teams.find((team) => teamKey(team) === teamName)
    || state.teams.find((team) => team.name === teamName)
    || {};
}

function displayTeamName(teamName) {
  const team = getTeamByName(teamName);
  return team.teamName || team.name || teamName;
}

function displayTeamWithManager(team) {
  const teamName = team?.teamName || team?.name || "-";
  return `${teamName} (ploegleider: ${team?.name || "-"})`;
}

function kitStyle(team) {
  const color1 = team.color1 || "#f6d32d";
  const color2 = team.color2 || "#ffffff";
  return `--kit-a:${escapeAttr(color1)};--kit-b:${escapeAttr(color2)};`;
}

function renderTeamKit(teamName) {
  const team = getTeamByName(teamName);
  return `<span class="kit-swatch" style="${kitStyle(team)}" title="${escapeAttr(displayTeamName(teamName))}"></span>`;
}

function renderClassificationKit(classificationId) {
  return `<span class="kit-swatch classification-swatch classification-swatch-${classificationId}" title="${escapeAttr(CLASSIFICATIONS.find((item) => item.id === classificationId)?.label || "")}"></span>`;
}

function renderLeaderJersey(classificationId) {
  const title = classificationId === "money"
    ? "Ploegenklassement"
    : CLASSIFICATIONS.find((item) => item.id === classificationId)?.label || "";
  return `
    <span class="leader-jersey leader-jersey-${classificationId}" title="${escapeAttr(title)}">
      <span class="leader-jersey-body"></span>
    </span>
  `;
}

function formatStandingScore(row, rows, classification) {
  if (!Number.isFinite(row.value) && classification.id === "youth") return "te weinig renners";
  if (classification.unit === "sec" && classification.mode === "low") {
    const base = rows.find((item) => Number.isFinite(item.value))?.value || 0;
    return formatDuration(row.value - base);
  }
  return formatClassificationScore(row.value, classification);
}

function formatClassificationScore(value, classification) {
  if (!Number.isFinite(value)) return "geen score";
  if (classification.unit === "sec") return formatDuration(value);
  return `${formatNumber(value)} ${classification.unit}`;
}

function formatDuration(value) {
  if (!Number.isFinite(value)) return "geen score";
  const sign = value < 0 ? "-" : "";
  const seconds = Math.abs(Math.round(value));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) return `${sign}${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  return `${sign}${minutes}:${String(rest).padStart(2, "0")}`;
}

function formatDelta(delta) {
  if (!delta) return "-";
  return delta > 0 ? `<span class="delta-up">&#9650; ${delta}</span>` : `<span class="delta-down">&#9660; ${Math.abs(delta)}</span>`;
}

function formatScoreDelta(delta, classification) {
  if (!Number.isFinite(delta) || delta === 0) return "-";
  const direction = classification.unit === "sec"
    ? (delta < 0 ? "good" : "bad")
    : (delta > 0 ? "good" : "bad");
  if (classification.unit === "sec") {
    return `<span class="score-delta score-delta-${direction}">${delta > 0 ? "+" : "-"}${formatDuration(Math.abs(delta))}</span>`;
  }
  return `<span class="score-delta score-delta-${direction}">${delta > 0 ? "+" : "-"}${formatNumber(Math.abs(delta))} ${classification.unit}</span>`;
}

function formatMoneyDelta(delta) {
  if (!Number.isFinite(delta) || delta === 0) return "-";
  const direction = delta > 0 ? "good" : "bad";
  return `<span class="score-delta score-delta-${direction}">${delta > 0 ? "+" : "-"}${formatCurrency(Math.abs(delta))}</span>`;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "geen score";
  return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 3 }).format(value);
}

function formatInputNumber(value) {
  if (!Number.isFinite(Number(value))) return "";
  return String(Number(value));
}

function parseLocaleNumber(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return value;
  return Number(String(value).replace(/\./g, "").replace(",", ".")) || 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: ROUND_CONFIG.currency || "EUR" }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function hasVisibleIntroContent(value) {
  const parsed = new DOMParser().parseFromString(String(value || ""), "text/html");
  return Boolean(parsed.body.textContent.trim());
}

function sanitizeIntroHtml(value) {
  const documentFragment = new DOMParser().parseFromString(`<div>${String(value || "")}</div>`, "text/html");
  const root = documentFragment.body.firstElementChild;
  const allowedTags = new Set(["SECTION", "H2", "H3", "H4", "P", "UL", "OL", "LI", "STRONG", "EM", "BR"]);
  root.querySelectorAll("script, style, iframe, object, embed").forEach((element) => element.remove());
  [...root.querySelectorAll("*")].forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const allowedClass = element.classList.contains("intro-copy") ? "intro-copy" : element.classList.contains("rules-summary") ? "rules-summary" : "";
    [...element.attributes].forEach((attribute) => element.removeAttribute(attribute.name));
    if (allowedClass) element.className = allowedClass;
  });
  return root.innerHTML;
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

async function submitFeedback() {
  const message = els.feedbackMessage?.value.trim() || "";
  const subject = els.feedbackSubject?.value.trim() || "";
  if (!message) {
    showFeedbackStatus("Niet opgeslagen: vul feedback in.", "error");
    return;
  }
  const item = {
    id: `feedback-${Date.now()}`,
    createdAt: new Date().toISOString(),
    name: els.feedbackName?.value.trim() || "",
    team: els.feedbackTeam?.value || "",
    type: els.feedbackType?.value || "Feedback",
    subject: subject || "(geen onderwerp)",
    message
  };
  if (POOL_STORAGE.mode === "api") {
    try {
      const saved = await POOL_STORAGE.api.submitFeedback(item);
      runtimeRevision = Number(saved?.revision || runtimeRevision);
    } catch (error) {
      showFeedbackStatus("Feedback kon niet online worden opgeslagen. Probeer het opnieuw.", "error");
      return;
    }
  }
  feedbackItems.unshift(item);
  persistFeedback();
  els.feedbackSubject.value = "";
  els.feedbackMessage.value = "";
  renderFeedback();
  showFeedbackStatus("Feedback opgeslagen.", "success");
}

function renderFeedback() {
  renderFeedbackTeamOptions();
  if (!els.feedbackList) return;
  if (!feedbackItems.length) {
    els.feedbackList.innerHTML = "<p class=\"hint\">Nog geen feedback.</p>";
    return;
  }
  const rows = [
    ["DATUM", "NAAM", "TEAM", "TYPE", "ONDERWERP", "FEEDBACK"],
    ...feedbackItems.map((item) => [
      formatFeedbackDate(item.createdAt),
      item.name || "-",
      item.team || "-",
      item.type || "-",
      item.subject || "-",
      item.message || ""
    ])
  ];
  els.feedbackList.innerHTML = renderDataTable(rows);
}

function renderFeedbackTeamOptions() {
  if (!els.feedbackTeam) return;
  const selected = els.feedbackTeam.value;
  els.feedbackTeam.innerHTML = `
    <option value="">Geen team gekozen</option>
    ${state.teams.map((team) => {
      const name = displayTeamName(teamKey(team));
      return `<option value="${escapeAttr(name)}" ${name === selected ? "selected" : ""}>${escapeHtml(name)}</option>`;
    }).join("")}
  `;
}

function exportFeedbackCsv() {
  if (!feedbackItems.length) {
    showFeedbackStatus("Geen feedback om te exporteren.", "pending");
    return;
  }
  const rows = [
    ["createdAt", "name", "team", "type", "subject", "message"],
    ...feedbackItems.map((item) => [
      item.createdAt || "",
      item.name || "",
      item.team || "",
      item.type || "",
      item.subject || "",
      item.message || ""
    ])
  ];
  const csv = rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `wielerpool-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showFeedbackStatus("Feedback geexporteerd.", "success");
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function showFeedbackStatus(message, type = "pending") {
  if (!els.feedbackStatus) return;
  els.feedbackStatus.textContent = message;
  els.feedbackStatus.className = `save-status save-status-${type}`;
}

function formatFeedbackDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function unlockAdmin() {
  if ((els.adminPassword?.value || "") !== ADMIN_PASSWORD) {
    if (els.adminLoginStatus) {
      els.adminLoginStatus.textContent = "Onjuist wachtwoord.";
      els.adminLoginStatus.className = "save-status save-status-error";
    }
    return;
  }
  adminUnlocked = true;
  sessionStorage.setItem(`${STORAGE_PREFIX}-admin-unlocked`, "1");
  recordAdminLog("Admin", "Admin geopend", "Adminpaneel geopend in deze browsersessie.");
  queueRuntimeSync();
  renderAdminAccess();
  renderAdminLog();
}

function renderAdminAccess() {
  els.adminLoginPanel?.classList.toggle("is-hidden", adminUnlocked);
  els.adminContent?.classList.toggle("is-hidden", !adminUnlocked);
}

function renderAdminOverview() {
  if (!els.adminOverviewData) return;
  const loadedStages = state.stages.filter((stage) => String(stage.results || "").trim()).length;
  const participantRows = state.teams.map((team) => `
    <tr>
      <td><input data-admin-team-name="${escapeAttr(teamKey(team))}" value="${escapeAttr(team.name || "")}" aria-label="Deelnemersnaam"></td>
      <td><input data-admin-team-title="${escapeAttr(teamKey(team))}" value="${escapeAttr(team.teamName || "")}" aria-label="Teamnaam"></td>
    </tr>
  `).join("");
  const windows = normalizeExchangeWindows(state.settings.exchangeWindows);
  const openWindow = windows.find((window) => {
    const from = new Date(window.from);
    const until = new Date(window.until);
    const now = new Date();
    return window.from && window.until && !Number.isNaN(from.getTime()) && !Number.isNaN(until.getTime()) && now >= from && now <= until;
  });
  els.adminOverviewData.innerHTML = `
    <div class="admin-overview-grid">
      <article><strong>Instellingen</strong><span>${formatCurrency(Number(state.settings.stake || 0))} inleg | ${formatNumber(Number(state.settings.budget || 0))} BC | ${formatNumber(Number(state.settings.stageCount || 0))} etappes</span></article>
      <article><strong>Importstatus</strong><span>${formatNumber(loadedStages)} etappes ingeladen, laatste: ${escapeHtml(lastLoadedStageName() || "-")}</span></article>
      <article><strong>Wisselvenster</strong><span>${openWindow ? `${escapeHtml(openWindow.label)} is open` : "Geen venster open"}</span></article>
      <article><strong>Feedback</strong><span>${formatNumber(feedbackItems.length)} inzendingen</span></article>
      <article><strong>Adminlog</strong><span>${formatNumber(adminLogItems.length)} wijzigingen</span></article>
      <article><strong>Herberekenen</strong><span>Gebruik Stand > Herbereken vanaf etappe 2 na team- of regelwijzigingen.</span></article>
    </div>
    <details class="admin-participants admin-collapsible">
      <summary>Deelnemers (${formatNumber(state.teams.length)})</summary>
      ${participantRows ? `
        <div class="data-table">
          <table>
            <thead><tr><th>Naam</th><th>Teamnaam</th></tr></thead>
            <tbody>${participantRows}</tbody>
          </table>
        </div>
      ` : '<p class="hint">Nog geen deelnemers aangemeld.</p>'}
    </details>
  `;
}

function lastLoadedStageName() {
  return state.stages
    .filter((stage) => String(stage.results || "").trim())
    .sort((a, b) => getStageNumber(a.name) - getStageNumber(b.name))
    .at(-1)?.name || "";
}

async function saveAdminChanges() {
  const splitError = validatePrizePotSplitForm();
  if (splitError) {
    showAdminSaveStatus(splitError, "error");
    return;
  }
  const changes = collectAdminChanges();
  if (els.introEditor?.dataset.edited === "1") {
    const before = state.settings.introHtml || "Standaardtekst";
    state.settings.introHtml = sanitizeIntroHtml(els.introEditor.innerHTML);
    changes.push({ category: "Intro", action: "Introtekst aangepast", before, after: "Aangepaste tekst" });
  }
  const emptyTeamIdentity = [...document.querySelectorAll("[data-admin-team-name], [data-admin-team-title]")].some((input) => !String(input.value || "").trim());
  if (emptyTeamIdentity) {
    showAdminSaveStatus("Deelnemersnaam en teamnaam mogen niet leeg zijn.", "error");
    return;
  }
  const teamIdentityChanges = collectTeamIdentityChanges();
  const teamsBeforeSave = structuredClone(state.teams);
  saveFromForm();
  teamIdentityChanges.forEach(({ team, name, teamName }) => {
    team.name = name;
    team.teamName = teamName;
  });
  if (POOL_STORAGE.mode === "api" && teamIdentityChanges.length) {
    try {
      for (const { team } of teamIdentityChanges) Object.assign(team, await POOL_STORAGE.api.saveTeamSelection(team));
    } catch (error) {
      state.teams = teamsBeforeSave;
      showAdminSaveStatus(error.message || "Team- of deelnemersnaam niet opgeslagen; bestaande teamgegevens zijn ongewijzigd gebleven.", "error");
      return;
    }
    try {
      await refreshRuntimeMetadata();
    } catch (error) {
      console.warn("Naam opgeslagen, maar de Adminlog kon niet direct worden ververst.", error);
    }
  }
  teamIdentityChanges.forEach(({ team, beforeName }) => {
    (state.manualSwaps || []).filter((swap) => (team.id && swap.teamId === team.id) || (!swap.teamId && normalizeName(swap.teamName) === normalizeName(beforeName)))
      .forEach((swap) => { swap.teamName = team.name; });
  });
  if (participantAccess) {
    const accessibleTeam = teamIdentityChanges.find(({ beforeName, beforeTeamName }) => participantMatches({ name: beforeName, teamName: beforeTeamName }));
    if (accessibleTeam) {
      participantAccess = { name: accessibleTeam.team.name, teamName: accessibleTeam.team.teamName };
      localStorage.setItem(`${STORAGE_PREFIX}-participant-access`, JSON.stringify(participantAccess));
      persistClientState();
    }
  }
  const archivedErrorCount = archiveCheckedPossibleErrors();
  persistState();
  applyBcPriceOverrides();
  changes.forEach((change) => {
    recordAdminLog(change.category, change.action, `${change.before} -> ${change.after}`);
  });
  renderTeams();
  tourDataRendered = false;
  renderRoundIntro();
  renderTourData();
  renderResults();
  renderPrizePotData();
  renderRiderPerformanceData();
  renderHistoryData();
  renderChartsData();
  renderAdminSettings();
  renderAdminOverview();
  renderPossibleErrors();
  renderAdminLog();
  showAdminSaveStatus(changes.length || teamIdentityChanges.length || archivedErrorCount ? "Adminwijzigingen opgeslagen." : "Geen adminwijzigingen om op te slaan.", "success");
}

function validatePrizePotSplitForm() {
  const finalPercentage = Number(els.finalPotPercentage?.value);
  const dailyPercentage = Number(els.dailyPotPercentage?.value);
  if (!Number.isFinite(finalPercentage) || !Number.isFinite(dailyPercentage) || finalPercentage < 0 || dailyPercentage < 0) {
    return "De percentages voor eindklassementen en dagprijzen moeten 0 of hoger zijn.";
  }
  if (Math.abs(finalPercentage + dailyPercentage - 100) > 0.000001) {
    return "De percentages voor eindklassementen en dagprijzen moeten samen precies 100% zijn.";
  }
  return "";
}

function collectAdminChanges() {
  return [...document.querySelectorAll('[data-tab-panel="admin"] input, [data-tab-panel="admin"] select, [data-tab-panel="admin"] textarea')]
    .filter((control) => control.id !== "adminPasswordInput" && !control.matches("[data-error-acknowledgement], [data-admin-team-name], [data-admin-team-title]"))
    .map((control) => ({
      control,
      before: control.dataset.adminPreviousValue ?? control.defaultValue ?? "",
      after: control.value
    }))
    .filter((change) => change.before !== change.after)
    .map((change) => ({
      category: adminLogCategoryForControl(change.control),
      action: adminLogLabelForControl(change.control),
      before: change.before,
      after: change.after
    }));
}

function showAdminSaveStatus(message, type = "pending") {
  if (!els.adminSaveStatus) return;
  els.adminSaveStatus.textContent = message;
  els.adminSaveStatus.className = `save-status save-status-${type}`;
}

function recordAdminLog(category, action, detail) {
  adminLogItems.unshift({
    createdAt: new Date().toISOString(),
    category,
    action,
    detail
  });
  persistAdminLog();
  renderAdminLog();
}

function renderAdminLog() {
  if (!els.adminLogData) return;
  if (!adminLogItems.length) {
    els.adminLogData.innerHTML = "<p class=\"hint\">Nog geen adminwijzigingen.</p>";
    return;
  }
  adminLogItems = adminLogItems.filter((item) => !isNoisyAdminLogItem(item));
  const rows = [
    ["DATUM", "CATEGORIE", "ACTIE", "DETAIL"],
    ...adminLogItems.map((item) => [
      formatFeedbackDate(item.createdAt),
      item.category,
      item.action,
      item.detail
    ])
  ];
  els.adminLogData.innerHTML = renderDataTable(rows);
}

function adminLogCategoryForControl(control) {
  if (control.id === "stakeInput" || control.id === "budgetInput" || control.id === "stageCountInput") return "Instellingen";
  if (control.id === "finalPotPercentageInput" || control.id === "dailyPotPercentageInput") return "Prijzenpot";
  if (control.dataset.prizeWeight) return "Prijzenschema";
  if (control.dataset.exchangeWindow) return "Wisselvensters";
  if (control.dataset.bcPrice) return "BC-prijzen";
  return "Admin";
}

function adminLogLabelForControl(control) {
  if (control.id === "stakeInput") return "Inleg per deelnemer";
  if (control.id === "budgetInput") return "BC-budget";
  if (control.id === "stageCountInput") return "Aantal etappes";
  if (control.id === "finalPotPercentageInput") return "Percentage eindklassementen";
  if (control.id === "dailyPotPercentageInput") return "Percentage dagprijzen";
  if (control.dataset.prizeWeight) return `Prijzenschema ${control.dataset.prizeWeight}`;
  if (control.dataset.exchangeWindow) return `Wisselvenster ${control.dataset.exchangeWindow}`;
  if (control.dataset.bcPrice) return `BC-prijs ${control.dataset.bcPrice}`;
  return control.id || "Adminveld";
}

function exportAdminLogCsv() {
  if (!adminLogItems.length) return;
  const rows = [
    ["createdAt", "category", "action", "detail"],
    ...adminLogItems.map((item) => [item.createdAt, item.category, item.action, item.detail])
  ];
  const csv = rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
  downloadTextFile(`wielerpool-adminlog-${new Date().toISOString().slice(0, 10)}.csv`, `\ufeff${csv}`, "text/csv;charset=utf-8");
}

async function saveAccessibleTeamToApi() {
  if (POOL_STORAGE.mode !== "api") return;
  const team = state.teams.find((item) => participantMatches(item));
  if (!team) throw new Error("Geen actieve selectie.");
  const teamIndex = state.teams.indexOf(team);
  const saved = await POOL_STORAGE.api.saveTeamSelection({
    ...team,
    manualSwaps: (state.manualSwaps || []).filter((swap) => swapMatchesTeam(swap, team, teamIndex))
  });
  Object.assign(team, saved);
  mergeRemoteManualSwaps([saved]);
  persistState();
}

function isNoisyAdminLogItem(item) {
  return item?.category === "Admin" && item?.action === "Adminveld" && /(?:^|\s)->\s*on\s*$/i.test(String(item.detail || ""));
}

function collectTeamIdentityChanges() {
  return state.teams.map((team) => {
    const name = String(document.querySelector(`[data-admin-team-name="${CSS.escape(teamKey(team))}"]`)?.value || team.name).trim();
    const teamName = String(document.querySelector(`[data-admin-team-title="${CSS.escape(teamKey(team))}"]`)?.value || team.teamName).trim();
    return { team, name, teamName, beforeName: team.name, beforeTeamName: team.teamName };
  }).filter((change) => change.name && change.teamName && (change.name !== change.beforeName || change.teamName !== change.beforeTeamName));
}

function archiveCheckedPossibleErrors() {
  state.settings.archivedPossibleErrors = state.settings.archivedPossibleErrors || {};
  const checked = [...document.querySelectorAll("[data-error-acknowledgement]:checked")];
  checked.forEach((checkbox) => {
    state.settings.archivedPossibleErrors[checkbox.dataset.errorAcknowledgement] = new Date().toISOString();
  });
  state.settings.errorAcknowledgements = {};
  return checked.length;
}

function mergeRemoteManualSwaps(remoteTeams) {
  const remoteTeamIds = new Set(remoteTeams.map((team) => String(team.id || "")).filter(Boolean));
  const retained = (state.manualSwaps || []).filter((swap) => !swap.teamId || !remoteTeamIds.has(String(swap.teamId)));
  const received = remoteTeams.flatMap((team) => (team.manualSwaps || []).map((swap) => ({
    ...swap,
    teamId: team.id || swap.teamId || "",
    teamName: swap.teamName || team.name
  })));
  state.manualSwaps = [...new Map([...retained, ...received].map((swap) => [swap.id, swap])).values()];
}

async function syncTeamsFromApi() {
  if (POOL_STORAGE.mode !== "api") return;
  const localTeams = Array.isArray(state.teams) ? structuredClone(state.teams) : [];
  showAppLoadingStatus("Teams worden geladen…");
  try {
    let remoteTeams = await POOL_STORAGE.api.listTeams();
    const migrationKey = STORAGE_PREFIX + "-api-team-migration-v1";
    if (ROUND_CONFIG.id === "vuelta-2026" && localStorage.getItem(migrationKey) !== "1") {
      const missingTeams = localTeams.filter((localTeam) =>
        localTeam.name && localTeam.teamName
        && !remoteTeams.some((remoteTeam) => participantMatches(remoteTeam, { name: localTeam.name, teamName: localTeam.teamName }))
      );
      for (const team of missingTeams) {
        await POOL_STORAGE.api.saveTeamSelection(team);
      }
      localStorage.setItem(migrationKey, "1");
      if (missingTeams.length) remoteTeams = await POOL_STORAGE.api.listTeams();
    }
    mergeRemoteManualSwaps(remoteTeams);
    state.teams = remoteTeams;
    storageSyncError = "";
    persistState();
  } catch (error) {
    storageSyncError = "Online teams konden niet worden geladen. Ververs de pagina zodra de verbinding hersteld is.";
    console.warn("Online teams konden niet worden geladen; lokale opslag blijft actief.", error);
  } finally {
    hideAppLoadingStatus();
  }
}

function renderPossibleErrors() {
  if (!els.possibleErrorsData) return;
  const issues = [...(state.importWarnings || [])];
  GAME_LOGIC.selfTest().filter((result) => !result.passed).forEach((result) => issues.push({
    id: `logic-test-${normalizeName(result.name)}`,
    category: "Mislukte rekentest",
    message: `${result.name} is mislukt. Controleer de spelberekening voordat je verdergaat.`
  }));
  if (state.stages.some((stage) => stage.results?.trim()) && state.teams.length) {
    const standings = calculateStandings(state);
    standings.progress.filter((entry) => entry.ineligibleReason).forEach((entry) => issues.push({
      id: `score-${normalizeName(entry.teamName)}-${getStageNumber(entry.stage)}-${entry.classificationId}-${entry.ineligibleReason}`,
      category: "Onvolledige score",
      message: `${displayTeamName(entry.teamName)} – ${entry.stage} – ${entry.classificationLabel}: ${entry.ineligibleReason}.`
    }));
    const money = calculateMoney(standings, state);
    if (Math.abs(money.accountedMoney - money.pot) > 0.005) issues.push({
      id: `prize-pot-${money.accountedMoney}-${money.pot}`,
      category: "Prijzenpot klopt niet",
      message: `De berekening verantwoordt ${formatMoney(money.accountedMoney)}, terwijl de prijzenpot ${formatMoney(money.pot)} is.`
    });
  }
  const unique = [...new Map(issues.map((issue) => [issue.id, issue])).values()];
  const archived = state.settings.archivedPossibleErrors || {};
  const visible = unique.filter((issue) => !archived[issue.id]);
  if (!visible.length) {
    els.possibleErrorsData.innerHTML = '<p class="save-status save-status-success">Geen mogelijke fouten gevonden.</p>';
    return;
  }
  els.possibleErrorsData.innerHTML = `<div class="possible-errors-list">${visible.map((issue) => {
    return `<label class="possible-error"><input type="checkbox" data-error-acknowledgement="${escapeAttr(issue.id)}"><span><strong>${escapeHtml(issue.category || "Controle")}</strong><br>${escapeHtml(issue.message)}</span></label>`;
  }).join("")}</div>`;
}

function renderLogicTests() {
  if (!els.logicTestsData) return;
  els.logicTestsData.innerHTML = renderDataTable([
    ["TEST", "STATUS"],
    ...GAME_LOGIC.selfTest().map((result) => [result.name, result.passed ? "Geslaagd" : "MISLUKT"])
  ]);
}

function recordImportWarning(category, message, identity) {
  state.importWarnings = Array.isArray(state.importWarnings) ? state.importWarnings : [];
  const id = `import-${normalizeName(`${identity}-${message}`)}`;
  if (!state.importWarnings.some((warning) => warning.id === id)) state.importWarnings.push({ id, category, message });
}

async function syncRuntimeFromApi() {
  if (POOL_STORAGE.mode !== "api") return false;
  try {
    const remote = await POOL_STORAGE.api.getRuntimeState();
    if (remote?.state && Object.keys(remote.state).length) {
      runtimeRevision = Number(remote.revision || 0);
      state = migrateState({ ...remote.state, teams: state.teams });
      feedbackItems = Array.isArray(remote.feedback) ? remote.feedback : [];
      adminLogItems = Array.isArray(remote.adminLog) ? remote.adminLog : [];
      POOL_STORAGE.saveState(state);
      POOL_STORAGE.saveFeedback(feedbackItems);
      POOL_STORAGE.saveAdminLog(adminLogItems);
    }
    return true;
  } catch (error) {
    console.warn("Online rondegegevens konden niet worden geladen; lokale opslag blijft actief.", error);
    return false;
  }
}

async function refreshRuntimeMetadata() {
  if (POOL_STORAGE.mode !== "api") return;
  const remote = await POOL_STORAGE.api.getRuntimeState();
  runtimeRevision = Number(remote?.revision || runtimeRevision);
  adminLogItems = Array.isArray(remote?.adminLog) ? remote.adminLog.filter((item) => !isNoisyAdminLogItem(item)) : adminLogItems;
  feedbackItems = Array.isArray(remote?.feedback) ? remote.feedback : feedbackItems;
  POOL_STORAGE.saveAdminLog(adminLogItems);
  POOL_STORAGE.saveFeedback(feedbackItems);
}

function hasMeaningfulLocalRuntimeData() {
  return Boolean(
    state.stages?.length
    || state.manualSwaps?.length
    || state.settings?.introHtml
    || Object.keys(state.settings?.bcPrices || {}).length
    || feedbackItems.length
    || adminLogItems.length
    || Number(state.settings?.stake) !== Number(ROUND_SETTINGS.stake ?? 10)
    || Number(state.settings?.budget) !== Number(ROUND_SETTINGS.budget ?? 20000)
    || JSON.stringify(state.settings?.prizePotSplit) !== JSON.stringify(normalizePrizePotSplit(ROUND_SETTINGS.prizePotSplit))
    || JSON.stringify(state.settings?.prizeWeights) !== JSON.stringify(normalizePrizeWeights(ROUND_SETTINGS.prizeWeights))
    || JSON.stringify(state.settings?.exchangeWindows) !== JSON.stringify(normalizeExchangeWindows(ROUND_CONFIG.exchangeWindows))
  );
}

async function syncClientStateFromApi() {
  if (POOL_STORAGE.mode !== "api") return;
  try {
    const remote = await POOL_STORAGE.api.getClientState(CLIENT_ID);
    if (remote?.participantAccess) {
      participantAccess = remote.participantAccess;
      localStorage.setItem(`${STORAGE_PREFIX}-participant-access`, JSON.stringify(participantAccess));
    } else {
      await persistClientState();
    }
  } catch (error) {
    console.warn("Online browserstatus kon niet worden geladen; lokale toegang blijft actief.", error);
  }
}

function queueRuntimeSync() {
  if (POOL_STORAGE.mode !== "api" || !runtimeSyncReady || !adminUnlocked) return;
  clearTimeout(runtimeSyncTimer);
  runtimeSyncTimer = setTimeout(saveRuntimeSnapshot, 300);
}

async function saveRuntimeSnapshot() {
  const runtimeState = structuredClone(state);
  delete runtimeState.teams;
  try {
    const saved = await POOL_STORAGE.api.saveRuntimeState({ state: runtimeState, feedback: feedbackItems, adminLog: adminLogItems, revision: runtimeRevision }, ADMIN_PASSWORD);
    runtimeRevision = Number(saved?.revision || runtimeRevision + 1);
  } catch (error) {
    if (error.status === 409) {
      runtimeSyncReady = false;
      await syncRuntimeFromApi();
      runtimeSyncReady = true;
      render();
      showAdminSaveStatus("Niet opgeslagen: de online ronde was intussen gewijzigd en is opnieuw geladen.", "error");
      return;
    }
    console.warn("Online rondegegevens konden niet worden opgeslagen; de lokale kopie is behouden.", error);
  }
}

async function persistClientState() {
  if (POOL_STORAGE.mode !== "api") return;
  try {
    await POOL_STORAGE.api.saveClientState(CLIENT_ID, { participantAccess, uiState: {} });
  } catch (error) {
    console.warn("Online browserstatus kon niet worden opgeslagen.", error);
  }
}

function showAppLoadingStatus(message) {
  if (!els.appLoadingStatus) return;
  els.appLoadingStatus.textContent = message;
  els.appLoadingStatus.classList.remove("is-hidden");
}

function hideAppLoadingStatus() {
  if (!els.appLoadingStatus) return;
  els.appLoadingStatus.classList.add("is-hidden");
  els.appLoadingStatus.textContent = "";
}

function persistState() {
  POOL_STORAGE.saveState(state);
  queueRuntimeSync();
}

function loadState() {
  return POOL_STORAGE.getState();
}

function persistFeedback() {
  POOL_STORAGE.saveFeedback(feedbackItems);
  queueRuntimeSync();
}

function loadFeedback() {
  const parsed = POOL_STORAGE.getFeedback();
  return Array.isArray(parsed) ? parsed : [];
}

function persistAdminLog() {
  POOL_STORAGE.saveAdminLog(adminLogItems);
  queueRuntimeSync();
}

function loadAdminLog() {
  const parsed = POOL_STORAGE.getAdminLog();
  return Array.isArray(parsed) ? parsed.filter((item) => !isNoisyAdminLogItem(item)) : [];
}

function downloadTextFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

(async function startApp() {
  applyRoundConfig();
  renderRoundIntro();
  const runtimeAvailable = await syncRuntimeFromApi();
  await syncClientStateFromApi();
  await loadOfficialStages();
  await syncTeamsFromApi();
  render();
  runtimeSyncReady = runtimeAvailable;
})();

