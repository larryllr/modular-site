const frame = document.querySelector("#godot-frame");
const focusButton = document.querySelector("#focus-game");
const reloadButton = document.querySelector("#reload-game");
const fullscreenButton = document.querySelector("#fullscreen-game");
const statusText = document.querySelector("#frame-status");
const shell = document.querySelector(".game-frame-shell");
const packSelect = document.querySelector("#pack-select");
const levelSelect = document.querySelector("#level-select");
const startSelectedButton = document.querySelector("#start-selected-game");
const startCustomLevelButton = document.querySelector("#start-custom-level");
let manifest = null;
let selectedPackId = "";
let selectedLevelId = "";
const keyLabels = {
  ArrowLeft: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
  ArrowUp: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
  ArrowDown: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
  ArrowRight: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
  KeyC: { key: "c", code: "KeyC", keyCode: 67 },
  KeyX: { key: "x", code: "KeyX", keyCode: 88 },
  KeyZ: { key: "z", code: "KeyZ", keyCode: 90 },
  Space: { key: " ", code: "Space", keyCode: 32 }
};

async function loadManifestStatus() {
  try {
    const response = await fetch("/api/game/manifest", { cache: "no-store" });
    if (!response.ok) throw new Error("manifest unavailable");
    manifest = await response.json();
    renderPrelaunchChoices();
    const activePack = (manifest.assetPacks || []).find((pack) => pack.id === selectedPackId)
      || (manifest.assetPacks || []).find((pack) => pack.enabled && pack.default)
      || (manifest.assetPacks || []).find((pack) => pack.enabled);
    const activeLevel = (manifest.levels || []).find((level) => level.id === selectedLevelId)
      || (manifest.levels || []).find((level) => level.default)
      || (manifest.levels || [])[0];
    const customPck = activePack?.assets?.["game.bundle.pck"];
    statusText.textContent = customPck
      ? `已选择后台 PCK：${activePack.name || "素材包"} · 关卡：${activeLevel?.name || "默认"}`
      : `已选择：${activePack?.name || "内置素材包"} · ${activeLevel?.name || "默认关卡"}。可在后台上传 game.bundle.pck 覆盖。`;
  } catch {
    statusText.textContent = "Godot 游戏已嵌入，后台素材状态读取失败。";
  }
}

function renderPrelaunchChoices() {
  if (!manifest || !packSelect || !levelSelect) return;
  const packs = (manifest.assetPacks || []).filter((pack) => pack.enabled !== false);
  const levels = (manifest.levels || []).filter((level) => level.enabled !== false);
  selectedPackId = selectedPackId || manifest.defaultAssetPackId || packs[0]?.id || "";
  selectedLevelId = selectedLevelId || manifest.defaultLevelId || levels[0]?.id || "";
  packSelect.replaceChildren(...packs.map((pack) => new Option(pack.name || pack.id, pack.id, false, pack.id === selectedPackId)));
  levelSelect.replaceChildren(...levels.map((level) => new Option(`${level.name || level.id} · ${level.difficulty || "默认"}`, level.id, false, level.id === selectedLevelId)));
}

function selectedGameUrl(mode = "godot") {
  const base = mode === "custom"
    ? "/llr-mariorun/custom.html"
    : frame?.dataset.gameSrc || "/llr-mariorun/godot/index.html";
  const url = new URL(base, window.location.origin);
  if (selectedPackId) url.searchParams.set("pack", selectedPackId);
  if (selectedLevelId) url.searchParams.set("level", selectedLevelId);
  url.searchParams.set("locale", "zh_CN");
  if (mode === "custom") url.searchParams.set("autostart", "1");
  return `${url.pathname}${url.search}`;
}

function startSelectedGame(mode = "godot") {
  if (!frame) return;
  selectedPackId = packSelect?.value || selectedPackId;
  selectedLevelId = levelSelect?.value || selectedLevelId;
  frame.src = selectedGameUrl(mode);
  document.body.classList.add("game-has-launched");
  statusText.textContent = mode === "custom" ? "正在载入后台关卡试玩模式…" : "正在载入完整 Godot 游戏…";
  loadManifestStatus();
  focusGame();
}

function focusGame() {
  frame?.focus();
  try {
    const canvas = frame?.contentDocument?.querySelector("canvas");
    canvas?.focus();
  } catch {
    // The frame is same-origin in production; ignore if a browser blocks access.
  }
}

function emitKey(code, type) {
  const target = frame?.contentWindow;
  const details = keyLabels[code];
  if (!target || !details) return;
  const base = {
    key: details.key,
    code: details.code,
    bubbles: true,
    cancelable: true
  };
  const event = new KeyboardEvent(type, base);
  Object.defineProperty(event, "keyCode", { get: () => details.keyCode });
  Object.defineProperty(event, "which", { get: () => details.keyCode });
  target.dispatchEvent(event);
  try {
    const documentEvent = new KeyboardEvent(type, base);
    Object.defineProperty(documentEvent, "keyCode", { get: () => details.keyCode });
    Object.defineProperty(documentEvent, "which", { get: () => details.keyCode });
    const canvasEvent = new KeyboardEvent(type, base);
    Object.defineProperty(canvasEvent, "keyCode", { get: () => details.keyCode });
    Object.defineProperty(canvasEvent, "which", { get: () => details.keyCode });
    frame.contentDocument?.dispatchEvent(documentEvent);
    frame.contentDocument?.querySelector("canvas")?.dispatchEvent(canvasEvent);
  } catch {
    // Same-origin focus fallback above is best-effort.
  }
}

function bindVirtualControls() {
  document.querySelectorAll(".virtual-controls button[data-key]").forEach((button) => {
    const code = button.dataset.key;
    const press = (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.classList.add("is-pressed");
      focusGame();
      emitKey(code, "keydown");
    };
    const release = (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.classList.remove("is-pressed");
      emitKey(code, "keyup");
    };
    button.addEventListener("pointerdown", (event) => {
      button.setPointerCapture?.(event.pointerId);
      press(event);
    });
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", (event) => {
      button.classList.remove("is-pressed");
      emitKey(code, "keyup");
    });
    button.addEventListener("contextmenu", (event) => event.preventDefault());
    button.addEventListener("selectstart", (event) => event.preventDefault());
  });
}

async function requestLandscapeFullscreen() {
  document.body.classList.add("is-forced-landscape");
  await (document.documentElement.requestFullscreen?.() || shell?.requestFullscreen?.());
  try {
    await screen.orientation?.lock?.("landscape");
  } catch {
    statusText.textContent = "浏览器不允许锁定横屏，已启用横屏兼容显示。";
  }
  focusGame();
}

focusButton?.addEventListener("click", focusGame);
packSelect?.addEventListener("change", () => {
  selectedPackId = packSelect.value;
  loadManifestStatus();
});
levelSelect?.addEventListener("change", () => {
  selectedLevelId = levelSelect.value;
  loadManifestStatus();
});
startSelectedButton?.addEventListener("click", () => startSelectedGame("godot"));
startCustomLevelButton?.addEventListener("click", () => startSelectedGame("custom"));
frame?.addEventListener("load", () => {
  focusGame();
  loadManifestStatus();
});
reloadButton?.addEventListener("click", () => {
  if (frame) frame.src = frame.src === "about:blank" ? selectedGameUrl() : frame.src;
});
fullscreenButton?.addEventListener("click", async () => {
  if (frame?.src === "about:blank") startSelectedGame();
  await requestLandscapeFullscreen();
});
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) {
    document.body.classList.remove("is-forced-landscape");
    screen.orientation?.unlock?.();
  }
});

bindVirtualControls();
loadManifestStatus();
