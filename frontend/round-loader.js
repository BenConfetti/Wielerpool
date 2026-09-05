const APP_ASSET_VERSION = "20260905-1";

(async function loadRound() {
  const params = new URLSearchParams(window.location.search);
  const pathRoundId = {
    tour2026: "tour-2026",
    vuelta2026: "vuelta-2026"
  }[window.location.pathname.split("/").filter(Boolean)[0]];
  const roundId = params.get("round") || pathRoundId || "tour-2026";
  try {
    const response = await fetch(`../rounds/${encodeURIComponent(roundId)}.json`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Rondeconfig niet gevonden (${response.status})`);
    window.ROUND_CONFIG = await response.json();
    window.ROUND_ID = window.ROUND_CONFIG.id;
    await loadRoundScript("./storage.js");
    await loadRoundScript("./game-logic.js");
    await loadRoundScript("./app.js");
  } catch (error) {
    document.body.innerHTML = `<main class="layout"><section class="panel"><h1>Ronde kon niet worden geladen</h1><p>${escapeLoaderText(error.message)}</p><p>Controleer <code>?round=${escapeLoaderText(roundId)}</code>.</p></section></main>`;
  }
})();

function loadRoundScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${src}?v=${encodeURIComponent(APP_ASSET_VERSION)}`;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Script kon niet worden geladen: ${src}`));
    document.body.appendChild(script);
  });
}

function escapeLoaderText(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
