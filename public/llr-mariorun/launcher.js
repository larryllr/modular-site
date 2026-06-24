const frame = document.querySelector("#godot-frame");
const focusButton = document.querySelector("#focus-game");
const reloadButton = document.querySelector("#reload-game");
const fullscreenButton = document.querySelector("#fullscreen-game");
const statusText = document.querySelector("#frame-status");
const shell = document.querySelector(".game-frame-shell");
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
    const manifest = await response.json();
    const activePack = (manifest.assetPacks || []).find((pack) => pack.enabled && pack.default)
      || (manifest.assetPacks || []).find((pack) => pack.enabled);
    const customPck = activePack?.assets?.["game.bundle.pck"];
    statusText.textContent = customPck
      ? `已加载后台 PCK：${activePack.name || "素材包"}`
      : "正在运行内置 Godot Web 版，可在后台上传 game.bundle.pck 覆盖。";
  } catch {
    statusText.textContent = "Godot 游戏已嵌入，后台素材状态读取失败。";
  }
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
frame?.addEventListener("load", () => {
  focusGame();
  loadManifestStatus();
});
reloadButton?.addEventListener("click", () => {
  if (frame) frame.src = frame.src;
});
fullscreenButton?.addEventListener("click", async () => {
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
