const frame = document.querySelector("#godot-frame");
const focusButton = document.querySelector("#focus-game");
const reloadButton = document.querySelector("#reload-game");
const fullscreenButton = document.querySelector("#fullscreen-game");
const statusText = document.querySelector("#frame-status");
const shell = document.querySelector(".game-frame-shell");
const keyLabels = {
  ArrowLeft: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
  ArrowDown: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
  ArrowRight: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
  ShiftLeft: { key: "Shift", code: "ShiftLeft", keyCode: 16 },
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
  const event = new KeyboardEvent(type, {
    key: details.key,
    code: details.code,
    bubbles: true,
    cancelable: true
  });
  Object.defineProperty(event, "keyCode", { get: () => details.keyCode });
  Object.defineProperty(event, "which", { get: () => details.keyCode });
  target.dispatchEvent(event);
  try {
    frame.contentDocument?.dispatchEvent(event);
    frame.contentDocument?.querySelector("canvas")?.dispatchEvent(event);
  } catch {
    // Same-origin focus fallback above is best-effort.
  }
}

function bindVirtualControls() {
  document.querySelectorAll(".virtual-controls button[data-key]").forEach((button) => {
    const code = button.dataset.key;
    const press = (event) => {
      event.preventDefault();
      button.classList.add("is-pressed");
      focusGame();
      emitKey(code, "keydown");
    };
    const release = (event) => {
      event.preventDefault();
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
  });
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
  await (shell?.requestFullscreen?.() || document.documentElement.requestFullscreen?.());
  focusGame();
});

bindVirtualControls();
loadManifestStatus();
