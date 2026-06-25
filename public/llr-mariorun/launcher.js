const frame = document.querySelector("#godot-frame");
const focusButton = document.querySelector("#focus-game");
const reloadButton = document.querySelector("#reload-game");
const fullscreenButton = document.querySelector("#fullscreen-game");
const statusText = document.querySelector("#frame-status");
const shell = document.querySelector(".game-frame-shell");
const packSelect = document.querySelector("#pack-select");
const startSelectedButton = document.querySelector("#start-selected-game");
const resetGameDataButtons = document.querySelectorAll("[data-reset-game-data]");
const adminAssetEditorLink = document.querySelector("[data-admin-asset-editor]");
const adminTokenKey = "cloudflare-modular-site.admin-token";
let manifest = null;
let selectedPackId = "";
let fullscreenOrientationLocked = false;
let runtimeReloadTimer = 0;
const inputResetHandlers = new Set();
const joystick = document.querySelector("[data-joystick]");
const joystickKnob = document.querySelector(".joystick-knob");
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

async function loadManifestStatus() {
  try {
    const response = await fetch("/api/game/manifest", { cache: "no-store" });
    if (!response.ok) throw new Error("manifest unavailable");
    manifest = await response.json();
    renderPrelaunchChoices();
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

function selectedGameUrl(options = {}) {
  const base = frame?.dataset.gameSrc || "/llr-mariorun/godot/index.html";
  const url = new URL(base, window.location.origin);
  if (selectedPackId) url.searchParams.set("pack", selectedPackId);
  url.searchParams.set("locale", "zh_CN");
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
  if (!confirm("确定重置游戏存档？这会清除当前浏览器里的 Story Mode 进度和 Godot 本地存档。")) {
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

  statusText.textContent = deletedCount
    ? "游戏存档已重置，可以重新开始 Story Mode。"
    : "已尝试重置存档；如果仍黑屏，请刷新页面后再进入 Story Mode。";
}

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
    if (button.dataset.key) emitKey(button.dataset.key, "keyup");
  });
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
  await (shell?.requestFullscreen?.() || document.documentElement.requestFullscreen?.());
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
startSelectedButton?.addEventListener("click", startSelectedGame);
resetGameDataButtons.forEach((button) => button.addEventListener("click", resetGameData));
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
document.addEventListener("visibilitychange", () => {
  if (document.hidden) resetVirtualInputs();
});

bindVirtualControls();
loadManifestStatus();
revealAdminAssetEditorLink();
