(function registerPoolStorage(global) {
  function createPoolStorage(options) {
    const roundId = options.roundId;
    const prefix = options.prefix || `wielerpool-${roundId}`;
    const roundConfig = structuredClone(options.roundConfig || {});
    const apiBase = options.apiBase || "http://127.0.0.1:3000/api/v1";
    const mode = options.mode === "api" ? "api" : "local";

    function key(suffix) {
      return `${prefix}-${suffix}`;
    }

    function readJson(suffix, fallback) {
      try {
        const currentValue = localStorage.getItem(key(suffix));
        if (currentValue != null) return JSON.parse(currentValue);

        if (roundId === "tour-2026") {
          const legacyValue = localStorage.getItem(`wielerpool-${suffix}`);
          if (legacyValue != null) {
            localStorage.setItem(key(suffix), legacyValue);
            return JSON.parse(legacyValue);
          }
        }
        return structuredClone(fallback);
      } catch {
        return structuredClone(fallback);
      }
    }

    function writeJson(suffix, value) {
      localStorage.setItem(key(suffix), JSON.stringify(value));
      return value;
    }

    return Object.freeze({
      mode,
      roundId,
      getRound: () => structuredClone(roundConfig),
      getState: () => readJson("state", null),
      saveState: (state) => writeJson("state", state),
      getFeedback: () => readJson("feedback", []),
      saveFeedback: (items) => writeJson("feedback", items),
      getAdminLog: () => readJson("admin-log", []),
      saveAdminLog: (items) => writeJson("admin-log", items),
      getStandings: () => readJson("standings", null),
      saveStandings: (standings) => writeJson("standings", standings),
      saveTeam: (teamIndex, team) => {
        const state = readJson("state", { teams: [] }) || { teams: [] };
        state.teams = Array.isArray(state.teams) ? state.teams : [];
        state.teams[teamIndex] = structuredClone(team);
        writeJson("state", state);
        return structuredClone(team);
      },
      api: Object.freeze({
        getRound: () => request(`/rounds/${encodeURIComponent(roundId)}`),
        getParticipants: () => request(`/rounds/${encodeURIComponent(roundId)}/participants`),
        getRiders: () => request(`/rounds/${encodeURIComponent(roundId)}/riders`)
        ,listTeams: () => request("/rounds/" + encodeURIComponent(roundId) + "/teams")
        ,saveTeamSelection: (team) => send("/rounds/" + encodeURIComponent(roundId) + "/teams", team)
        ,getRuntimeState: () => request("/rounds/" + encodeURIComponent(roundId) + "/runtime-state")
        ,saveRuntimeState: (payload, adminPassword) => send("/rounds/" + encodeURIComponent(roundId) + "/runtime-state", payload, "PUT", { "X-Admin-Password": adminPassword })
        ,submitFeedback: (item) => send("/rounds/" + encodeURIComponent(roundId) + "/runtime-state/feedback", item)
        ,getClientState: (clientId) => request("/rounds/" + encodeURIComponent(roundId) + "/client-state/" + encodeURIComponent(clientId))
        ,saveClientState: (clientId, payload) => send("/rounds/" + encodeURIComponent(roundId) + "/client-state/" + encodeURIComponent(clientId), payload, "PUT")
      }),
      remove: (suffix) => localStorage.removeItem(key(suffix))
    });

    async function request(path) {
      const response = await fetch(`${apiBase}${path}`, { credentials: "include" });
      if (!response.ok) throw new Error(`API-fout ${response.status}`);
      return response.json();
    }

    async function send(path, body, method = "POST", extraHeaders = {}) {
      const response = await fetch(apiBase + path, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json", ...extraHeaders },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const error = new Error("API-fout " + response.status);
        error.status = response.status;
        throw error;
      }
      return response.json();
    }
  }

  global.createPoolStorage = createPoolStorage;
})(window);
