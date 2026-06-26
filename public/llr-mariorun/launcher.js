const frame = document.querySelector("#godot-frame");
const focusButton = document.querySelector("#focus-game");
const reloadButton = document.querySelector("#reload-game");
const fullscreenButton = document.querySelector("#fullscreen-game");
const statusText = document.querySelector("#frame-status");
const shell = document.querySelector(".game-frame-shell");
const packSelect = document.querySelector("#pack-select");
const designerLevelSelect = document.querySelector("#designer-level-select");
const startSelectedButton = document.querySelector("#start-selected-game");
const resetGameDataButtons = document.querySelectorAll("[data-reset-game-data]");
const deleteLocalDesignerLevelsButton = document.querySelector("#delete-local-designer-levels");
const importDesignerLevelInput = document.querySelector("#import-designer-level");
const deleteSelectedDesignerLevelButton = document.querySelector("#delete-selected-designer-level");
const adminAssetEditorLink = document.querySelector("[data-admin-asset-editor]");
const designerLevelStatus = document.querySelector("[data-designer-level-status]");
const adminTokenKey = "cloudflare-modular-site.admin-token";
const localDesignerLevelsKey = "llr-mariorun.local-designer-levels.v1";
let manifest = null;
let selectedPackId = "";
let selectedDesignerLevelId = "";
let fullscreenOrientationLocked = false;
let runtimeReloadTimer = 0;
const inputResetHandlers = new Set();
const joystick = document.querySelector("[data-joystick]");
const joystickKnob = document.querySelector(".joystick-knob");
const touchControlsQuery = window.matchMedia?.("(hover: none), (pointer: coarse)");
const keyLabels = {
  KeyA: { key: "a", code: "KeyA", keyCode: 65 },
  KeyD: { key: "d", code: "KeyD", keyCode: 68 },
  KeyS: { key: "s", code: "KeyS", keyCode: 83 },
  KeyW: { key: "w", code: "KeyW", keyCode: 87 },
  ArrowLeft: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
  ArrowUp: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
  ArrowDown: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
  ArrowRight: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
  KeyC: { key: "c", code: "KeyC", keyCode: 67 },
  KeyX: { key: "x", code: "KeyX", keyCode: 88 },
  KeyZ: { key: "z", code: "KeyZ", keyCode: 90 },
  Space: { key: " ", code: "Space", keyCode: 32 }
};
const movementKeyAliases = {
  ArrowLeft: ["ArrowLeft", "KeyA"],
  ArrowRight: ["ArrowRight", "KeyD"],
  ArrowUp: ["ArrowUp", "KeyW"],
  ArrowDown: ["ArrowDown", "KeyS"]
};

function shouldShowTouchControls() {
  return Boolean(touchControlsQuery?.matches || navigator.maxTouchPoints > 0 || window.innerWidth <= 900);
}

function syncInputMode() {
  document.body.classList.toggle("has-touch-controls", shouldShowTouchControls());
  document.body.classList.toggle("has-desktop-controls", !shouldShowTouchControls());
}

async function loadManifestStatus() {
  try {
    const response = await fetch("/api/game/manifest", { cache: "no-store" });
    if (!response.ok) throw new Error("manifest unavailable");
    manifest = await response.json();
    renderPrelaunchChoices();
    renderDesignerLevelChoices();
    const activePack = (manifest.assetPacks || []).find((pack) => pack.id === selectedPackId)
      || (manifest.assetPacks || []).find((pack) => pack.enabled && pack.default)
      || (manifest.assetPacks || []).find((pack) => pack.enabled);
    const customPck = activePack?.assets?.["game.bundle.pck"];
    statusText.textContent = customPck
      ? `PCK：${activePack.name || "素材包"}`
      : `素材：${activePack?.name || "内置素材包"}`;
  } catch {
    statusText.textContent = "Godot 游戏已嵌入，后台素材状态读取失败。";
  }
}

async function revealAdminAssetEditorLink() {
  if (!adminAssetEditorLink) return;
  const token = localStorage.getItem(adminTokenKey);
  if (!token) return;

  try {
    const response = await fetch("/api/admin/game", {
      cache: "no-store",
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) return;
    adminAssetEditorLink.hidden = false;
  } catch {
    adminAssetEditorLink.hidden = true;
  }
}

function renderPrelaunchChoices() {
  if (!manifest || !packSelect) return;
  const packs = (manifest.assetPacks || []).filter((pack) => pack.enabled !== false);
  selectedPackId = selectedPackId || manifest.defaultAssetPackId || packs[0]?.id || "";
  packSelect.replaceChildren(...packs.map((pack) => new Option(pack.name || pack.id, pack.id, false, pack.id === selectedPackId)));
}

function readLocalDesignerLevels() {
  try {
    const levels = JSON.parse(localStorage.getItem(localDesignerLevelsKey) || "[]");
    return Array.isArray(levels)
      ? levels.filter((level) => level?.id && level?.designerCode && level?.name)
      : [];
  } catch {
    return [];
  }
}

function writeLocalDesignerLevels(levels) {
  localStorage.setItem(localDesignerLevelsKey, JSON.stringify(levels.slice(0, 60)));
}

function publicDesignerLevels() {
  return (manifest?.levels || []).filter((level) => level?.designerSource === "sm63-redux" && level?.designerCode);
}

function allDesignerLevels() {
  return [
    ...publicDesignerLevels().map((level) => ({ ...level, scope: "public" })),
    ...readLocalDesignerLevels().map((level) => ({ ...level, scope: "local" }))
  ];
}

function renderDesignerLevelChoices() {
  if (!designerLevelSelect) return;
  const levels = allDesignerLevels();
  selectedDesignerLevelId = selectedDesignerLevelId && levels.some((level) => level.id === selectedDesignerLevelId)
    ? selectedDesignerLevelId
    : "";
  const options = [
    new Option("空白设计器关卡", "", false, selectedDesignerLevelId === "")
  ];
  for (const level of levels) {
    const prefix = level.scope === "public" ? "公开" : "我的";
    options.push(new Option(`${prefix} · ${level.name || level.id}`, level.id, false, level.id === selectedDesignerLevelId));
  }
  designerLevelSelect.replaceChildren(...options);
  updateDesignerLevelDeleteButton();
  updateDesignerLevelStatus();
}

function selectedDesignerLevel() {
  return allDesignerLevels().find((level) => level.id === selectedDesignerLevelId) || null;
}

function updateDesignerLevelStatus(message = "") {
  if (!designerLevelStatus) return;
  const selected = selectedDesignerLevel();
  designerLevelStatus.textContent = message || (selected
    ? `已选择「${selected.name}」。点击“开始完整游戏”，进入主菜单后选择 Level Designer，会自动载入这个关卡。`
    : "未选择设计器关卡；点击“开始完整游戏”，主菜单选择 Level Designer 会打开空白编辑器。也可以先导入关卡文件。");
}

function updateDesignerLevelDeleteButton() {
  if (!deleteSelectedDesignerLevelButton) return;
  const selected = selectedDesignerLevel();
  deleteSelectedDesignerLevelButton.hidden = !(selected?.scope === "public" && localStorage.getItem(adminTokenKey));
}

function selectedGameUrl(options = {}) {
  const base = frame?.dataset.gameSrc || "/llr-mariorun/godot/index.html";
  const url = new URL(base, window.location.origin);
  if (selectedPackId) url.searchParams.set("pack", selectedPackId);
  if (selectedDesignerLevelId) url.searchParams.set("designerLevel", selectedDesignerLevelId);
  url.searchParams.set("locale", "zh_CN");
  if (!shouldShowTouchControls()) url.searchParams.set("perf", "desktop");
  if (options.cacheBust) url.searchParams.set("run", String(Date.now()));
  return `${url.pathname}${url.search}`;
}

function setGameStatus(message) {
  if (statusText) statusText.textContent = message;
}

function isFrameBlank() {
  if (!frame) return true;
  const rawSrc = frame.getAttribute("src") || "";
  return rawSrc === "" || rawSrc === "about:blank" || frame.src === "about:blank";
}

function loadGameRuntime(options = {}) {
  if (!frame) return;
  selectedPackId = packSelect?.value || selectedPackId;
  frame.src = selectedGameUrl(options);
  document.body.classList.add("game-has-launched");
  setGameStatus(options.status || "正在载入完整 Godot 游戏…");
  loadManifestStatus();
  focusGame();
}

function startSelectedGame() {
  loadGameRuntime({ cacheBust: true });
}

function recoverGameRuntime(message = "正在重建游戏运行时…") {
  if (!frame) return;
  resetVirtualInputs();
  window.clearTimeout(runtimeReloadTimer);
  document.body.classList.add("game-has-launched");
  setGameStatus(message);
  frame.src = "about:blank";
  runtimeReloadTimer = window.setTimeout(() => {
    loadGameRuntime({
      cacheBust: true,
      status: "正在重新载入 Godot 游戏…"
    });
  }, 120);
}

function deleteDatabase(name) {
  return new Promise((resolve) => {
    if (!name || !window.indexedDB) {
      resolve(false);
      return;
    }
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve(true);
    request.onerror = () => resolve(false);
    request.onblocked = () => resolve(false);
  });
}

async function resetGameData() {
  if (!confirm("确定重置游戏存档？这会清除当前浏览器里的 Story Mode 进度、Godot 本地存档和你的本机设计器关卡。管理员公开关卡不会删除。")) {
    return;
  }

  if (frame) frame.src = "about:blank";
  document.body.classList.remove("game-has-launched");
  statusText.textContent = "正在清理 Godot 本地存档…";

  const databaseNames = new Set(["FILE_DATA"]);
  if (window.indexedDB?.databases) {
    try {
      const databases = await window.indexedDB.databases();
      for (const database of databases) {
        if (database.name) databaseNames.add(database.name);
      }
    } catch {
      // Some browsers do not expose database enumeration.
    }
  }

  let deletedCount = 0;
  for (const name of databaseNames) {
    if (await deleteDatabase(name)) deletedCount += 1;
  }
  localStorage.removeItem(localDesignerLevelsKey);
  selectedDesignerLevelId = "";
  renderDesignerLevelChoices();

  statusText.textContent = deletedCount
    ? "游戏存档和本机设计器关卡已重置，可以重新开始。"
    : "已尝试重置存档和本机设计器关卡；如果仍黑屏，请刷新页面后再进入。";
}

function deleteLocalDesignerLevels() {
  if (!confirm("确定删除你这个浏览器里保存的自定义关卡？管理员公开关卡不会删除。")) return;
  localStorage.removeItem(localDesignerLevelsKey);
  selectedDesignerLevelId = "";
  renderDesignerLevelChoices();
  updateDesignerLevelStatus("我的本机设计器关卡已删除。");
}

async function importDesignerLevelFile() {
  const file = importDesignerLevelInput?.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = parseDesignerLevelImport(text, file.name);
    const localLevels = readLocalDesignerLevels().filter((level) => level.id !== parsed.id);
    localLevels.unshift(parsed);
    writeLocalDesignerLevels(localLevels);
    selectedDesignerLevelId = parsed.id;
    renderDesignerLevelChoices();
    updateDesignerLevelStatus(`已导入「${parsed.name}」。点击“开始完整游戏”，主菜单选择 Level Designer 即可编辑。`);
  } catch (error) {
    updateDesignerLevelStatus(`导入失败：${error.message}`);
  } finally {
    if (importDesignerLevelInput) importDesignerLevelInput.value = "";
  }
}

function parseDesignerLevelImport(text, filename = "导入关卡") {
  const trimmed = String(text || "").trim();
  let payload = null;
  try {
    payload = JSON.parse(trimmed);
  } catch {
    payload = null;
  }
  const code = normalizeDesignerLevelCode(
    typeof payload === "string"
      ? payload
      : payload?.designerCode || payload?.code || trimmed
  );
  if (!code) {
    throw new Error("文件里没有可识别的 SM63 Redux Level Designer 关卡数据。");
  }
  const name = String(payload?.name || filename.replace(/\.[^.]+$/, "") || "导入关卡").slice(0, 80);
  return {
    id: payload?.id || `local-import-${hashString(code).slice(0, 16)}`,
    name,
    description: payload?.description || "从本地文件导入的 Level Designer 关卡。",
    difficulty: payload?.difficulty || "导入",
    theme: payload?.theme || "grass",
    enabled: true,
    builtin: false,
    default: false,
    width: payload?.width || 6400,
    height: payload?.height || 560,
    checkpoints: payload?.checkpoints || [{ x: 600, y: 416 }],
    segments: payload?.segments || ["Imported Level Designer"],
    objects: payload?.objects || [],
    designerSource: "sm63-redux",
    designerCode: code,
    visibility: "local",
    updatedAt: new Date().toISOString()
  };
}

function normalizeDesignerLevelCode(value) {
  const code = String(value || "").trim();
  return /^[A-Za-z0-9+/=_-]{16,500000}$/.test(code) ? code : "";
}

async function deleteSelectedDesignerLevel() {
  const selected = selectedDesignerLevel();
  const token = localStorage.getItem(adminTokenKey);
  if (!selected || selected.scope !== "public" || !token) return;
  if (!confirm(`确定删除公开关卡「${selected.name}」？所有人刷新后都看不到它。`)) return;
  try {
    const response = await fetch(`/api/admin/game/designer-levels?id=${encodeURIComponent(selected.id)}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `删除失败：${response.status}`);
    }
    selectedDesignerLevelId = "";
    await loadManifestStatus();
    updateDesignerLevelStatus("公开关卡已删除。");
  } catch (error) {
    updateDesignerLevelStatus(`删除失败：${error.message}`);
  }
}

function normalizeDesignerSavePayload(payload) {
  const code = normalizeDesignerLevelCode(payload?.code);
  if (!code) return null;
  const now = new Date().toISOString();
  const name = String(payload?.name || "我的关卡").trim().slice(0, 80) || "我的关卡";
  return {
    id: `designer-${hashString(code).slice(0, 16)}`,
    name,
    description: "游戏内 Level Designer 保存的关卡。",
    difficulty: "自定义",
    theme: "grass",
    enabled: true,
    builtin: false,
    default: false,
    width: 6400,
    height: 560,
    checkpoints: [{ x: 600, y: 416 }],
    segments: ["Level Designer"],
    objects: [],
    designerSource: "sm63-redux",
    designerCode: code,
    visibility: "public",
    updatedAt: now
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0") + String(value.length.toString(16)).padStart(8, "0");
}

async function saveDesignerLevel(payload) {
  const level = normalizeDesignerSavePayload(payload);
  if (!level) {
    updateDesignerLevelStatus("设计器关卡同步失败：关卡数据无效。");
    return;
  }
  const name = prompt("保存这个 Level Designer 关卡的名字：", level.name) || level.name;
  level.name = name.trim().slice(0, 80) || level.name;
  const token = localStorage.getItem(adminTokenKey);
  if (token) {
    try {
      const response = await fetch("/api/admin/game/designer-levels", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify(level)
      });
      if (response.ok) {
        const result = await response.json();
        selectedDesignerLevelId = result.level?.id || level.id;
        await loadManifestStatus();
        updateDesignerLevelStatus(`管理员公开关卡「${level.name}」已保存，所有人刷新后可见。`);
        return;
      }
    } catch {
      // Fall back to local save below.
    }
  }
  const localLevels = readLocalDesignerLevels().filter((item) => item.id !== level.id);
  localLevels.unshift({ ...level, visibility: "local" });
  writeLocalDesignerLevels(localLevels);
  selectedDesignerLevelId = level.id;
  renderDesignerLevelChoices();
  updateDesignerLevelStatus(`本机关卡「${level.name}」已保存，刷新后仍可见；只有这个浏览器能看到。`);
}

window.__llrSaveDesignerLevel = saveDesignerLevel;
window.__llrGetDesignerLevelBase64 = () => selectedDesignerLevel()?.designerCode || "";
window.__llrShowGameNotice = (message) => updateDesignerLevelStatus(String(message || ""));

function focusGame() {
  frame?.focus();
  try {
    const canvas = frame?.contentDocument?.querySelector("canvas");
    if (canvas && canvas.tabIndex < 0) canvas.tabIndex = 0;
    canvas?.focus();
  } catch {
    // The frame is same-origin in production; ignore if a browser blocks access.
  }
}

function emitKey(code, type, options = {}) {
  const target = frame?.contentWindow;
  const details = keyLabels[code];
  if (!target || !details) return;
  const base = {
    key: details.key,
    code: details.code,
    bubbles: true,
    cancelable: true,
    repeat: Boolean(options.repeat)
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

function emitMovementKey(code, type, options = {}) {
  for (const mappedCode of movementKeyAliases[code] || [code]) {
    emitKey(mappedCode, type, options);
  }
}

function resetVirtualInputs() {
  for (const handler of inputResetHandlers) handler();
  document.querySelectorAll(".virtual-controls button.is-pressed").forEach((button) => {
    button.classList.remove("is-pressed");
    if (button.dataset.key) {
      for (const code of buttonCodes(button)) {
        emitKey(code, "keyup");
      }
    }
  });
}

function buttonCodes(button) {
  return [button.dataset.key, button.dataset.extraKey]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean);
}

function attachGodotCanvasRecovery() {
  try {
    const canvas = frame?.contentDocument?.querySelector("canvas");
    if (!canvas || canvas.dataset.recoveryBound === "true") return;
    canvas.dataset.recoveryBound = "true";
    if (canvas.tabIndex < 0) canvas.tabIndex = 0;
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      resetVirtualInputs();
      setGameStatus("WebGL 已丢失，正在重建游戏运行时…");
      window.setTimeout(() => {
        if (document.body.classList.contains("game-has-launched")) {
          recoverGameRuntime("WebGL 已丢失，正在重建游戏运行时…");
        }
      }, 700);
    });
    canvas.addEventListener("webglcontextrestored", () => {
      setGameStatus("WebGL 场景已恢复。");
      focusGame();
    });
  } catch {
    // Ignore cross-origin or early-load access failures.
  }
}

function bindVirtualControls() {
  bindVirtualJoystick();
  document.querySelectorAll(".virtual-controls button[data-key]").forEach((button) => {
    const codes = buttonCodes(button);
    const press = (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.classList.add("is-pressed");
      focusGame();
      for (const code of codes) emitKey(code, "keydown");
    };
    const release = (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.classList.remove("is-pressed");
      for (const code of codes) emitKey(code, "keyup");
    };
    button.addEventListener("pointerdown", (event) => {
      button.setPointerCapture?.(event.pointerId);
      press(event);
    });
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", (event) => {
      button.classList.remove("is-pressed");
      for (const code of codes) emitKey(code, "keyup");
    });
    button.addEventListener("contextmenu", (event) => event.preventDefault());
    button.addEventListener("selectstart", (event) => event.preventDefault());
  });
}

function bindVirtualJoystick() {
  if (!joystick || !joystickKnob) return;
  const activeKeys = new Set();
  let heartbeatId = 0;
  const stopHeartbeat = () => {
    window.clearInterval(heartbeatId);
    heartbeatId = 0;
  };
  const startHeartbeat = () => {
    if (heartbeatId) return;
    heartbeatId = window.setInterval(() => {
      if (!activeKeys.size || !document.body.classList.contains("game-has-launched")) {
        stopHeartbeat();
        return;
      }
      focusGame();
      for (const code of activeKeys) {
        emitMovementKey(code, "keydown", { repeat: true });
      }
    }, 140);
  };
  const releaseAll = () => {
    for (const code of activeKeys) emitMovementKey(code, "keyup");
    activeKeys.clear();
    stopHeartbeat();
    joystickKnob.style.transform = "translate(-50%, -50%)";
    joystick.classList.remove("is-active");
  };
  inputResetHandlers.add(releaseAll);
  const setKey = (code, enabled) => {
    if (enabled && !activeKeys.has(code)) {
      activeKeys.add(code);
      emitMovementKey(code, "keydown");
      startHeartbeat();
    } else if (!enabled && activeKeys.has(code)) {
      activeKeys.delete(code);
      emitMovementKey(code, "keyup");
      if (!activeKeys.size) stopHeartbeat();
    }
  };
  const update = (event) => {
    const rect = joystick.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) / 2;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rawX = event.clientX - centerX;
    const rawY = event.clientY - centerY;
    const distance = Math.min(radius, Math.hypot(rawX, rawY));
    const angle = Math.atan2(rawY, rawX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    const horizontalThreshold = radius * 0.28;
    const verticalThreshold = radius * 0.48;
    joystickKnob.style.transform = "translate(calc(-50% + " + x + "px), calc(-50% + " + y + "px))";
    joystick.classList.add("is-active");
    setKey("ArrowLeft", x < -horizontalThreshold);
    setKey("ArrowRight", x > horizontalThreshold);
    setKey("ArrowUp", y < -verticalThreshold);
    setKey("ArrowDown", y > verticalThreshold);
  };
  joystick.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    joystick.setPointerCapture?.(event.pointerId);
    focusGame();
    update(event);
  });
  joystick.addEventListener("pointermove", (event) => {
    if (!joystick.classList.contains("is-active")) return;
    event.preventDefault();
    update(event);
  });
  joystick.addEventListener("pointerup", releaseAll);
  joystick.addEventListener("pointercancel", releaseAll);
  joystick.addEventListener("lostpointercapture", releaseAll);
  joystick.addEventListener("contextmenu", (event) => event.preventDefault());
  joystick.addEventListener("selectstart", (event) => event.preventDefault());
}

async function requestLandscapeFullscreen() {
  document.body.classList.add("is-landscape-fullscreen");
  fullscreenOrientationLocked = false;
  const fullscreenTarget = shell || document.documentElement;
  try {
    if (document.fullscreenElement === fullscreenTarget) {
      await document.exitFullscreen?.();
      return;
    }
    await fullscreenTarget.requestFullscreen?.({ navigationUI: "hide" });
  } catch {
    await document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
  }
  try {
    await screen.orientation?.lock?.("landscape-primary");
    fullscreenOrientationLocked = true;
  } catch {
    try {
      await screen.orientation?.lock?.("landscape");
      fullscreenOrientationLocked = true;
    } catch {
      statusText.textContent = "浏览器不允许锁定横屏，已启用横屏兼容显示。";
    }
  }
  document.body.classList.toggle("is-forced-landscape", !fullscreenOrientationLocked && window.innerHeight > window.innerWidth);
  focusGame();
}

focusButton?.addEventListener("click", focusGame);
packSelect?.addEventListener("change", () => {
  selectedPackId = packSelect.value;
  loadManifestStatus();
});
designerLevelSelect?.addEventListener("change", () => {
  selectedDesignerLevelId = designerLevelSelect.value;
  updateDesignerLevelDeleteButton();
  updateDesignerLevelStatus();
});
startSelectedButton?.addEventListener("click", startSelectedGame);
resetGameDataButtons.forEach((button) => button.addEventListener("click", resetGameData));
deleteLocalDesignerLevelsButton?.addEventListener("click", deleteLocalDesignerLevels);
importDesignerLevelInput?.addEventListener("change", importDesignerLevelFile);
deleteSelectedDesignerLevelButton?.addEventListener("click", deleteSelectedDesignerLevel);
frame?.addEventListener("load", () => {
  if (isFrameBlank()) return;
  resetVirtualInputs();
  focusGame();
  window.setTimeout(() => {
    attachGodotCanvasRecovery();
    focusGame();
  }, 250);
  loadManifestStatus();
});
reloadButton?.addEventListener("click", () => {
  if (isFrameBlank()) {
    startSelectedGame();
  } else {
    recoverGameRuntime("正在重建游戏运行时…");
  }
});
fullscreenButton?.addEventListener("click", async () => {
  if (isFrameBlank()) startSelectedGame();
  await requestLandscapeFullscreen();
});
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) {
    const wasInGame = document.body.classList.contains("game-has-launched");
    document.body.classList.remove("is-landscape-fullscreen");
    document.body.classList.remove("is-forced-landscape");
    fullscreenOrientationLocked = false;
    screen.orientation?.unlock?.();
    if (wasInGame) {
      window.setTimeout(() => {
        if (document.body.classList.contains("game-has-launched")) {
          recoverGameRuntime("已退出全屏，正在恢复游戏运行时…");
        }
      }, 180);
    }
  }
});
window.addEventListener("blur", resetVirtualInputs);
window.addEventListener("resize", syncInputMode);
touchControlsQuery?.addEventListener?.("change", syncInputMode);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) resetVirtualInputs();
});

syncInputMode();
bindVirtualControls();
loadManifestStatus();
revealAdminAssetEditorLink();
