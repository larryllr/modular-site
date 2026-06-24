const gameManifestUrl = "/api/game/manifest";
const canvas = document.querySelector("#game-canvas");
const context = canvas.getContext("2d");
const menu = document.querySelector('[data-screen="menu"]');
const stage = document.querySelector('[data-screen="game"]');
const packList = document.querySelector("#pack-list");
const levelList = document.querySelector("#level-list");
const feedback = document.querySelector("#menu-feedback");
const startButton = document.querySelector("#start-game");
const hudLevel = document.querySelector("#hud-level");
const hudCoins = document.querySelector("#hud-coins");
const hudLives = document.querySelector("#hud-lives");

const tileSize = 32;
const gravity = 0.65;
const actionState = new Map();
let manifest = null;
let selectedPackId = "";
let selectedLevelId = "";
let currentPack = null;
let currentLevel = null;
let world = null;
let player = null;
let cameraX = 0;
let coins = 0;
let lives = 3;
let paused = false;
let frameHandle = 0;
let checkpoint = { x: 96, y: 416 };
let assetImages = new Map();

init();

async function init() {
  renderKeyboardHints();
  bindMenuControls();
  bindKeyboardControls();
  bindVirtualControls();
  updateOrientationMode();
  window.addEventListener("resize", updateOrientationMode);
  window.addEventListener("orientationchange", updateOrientationMode);

  try {
    manifest = await fetch(gameManifestUrl).then((response) => response.json());
    selectedPackId = manifest.defaultAssetPackId;
    selectedLevelId = manifest.defaultLevelId;
    renderPackSelection();
    renderLevelSelection();
  } catch (error) {
    feedback.textContent = `游戏清单加载失败：${error.message}`;
  }
}

function renderKeyboardHints() {
  document.querySelector("#keyboard-hints").replaceChildren(
    hint("方向键 / A D", "左右移动"),
    hint("空格 / W / ↑", "跳跃"),
    hint("Shift / J", "加速或攻击"),
    hint("S / ↓", "下蹲或进管道"),
    hint("Esc", "暂停"),
    hint("R", "重开当前关卡")
  );
}

function hint(keys, label) {
  const node = document.createElement("span");
  node.innerHTML = `<strong>${keys}</strong><br>${label}`;
  return node;
}

function renderPackSelection() {
  const packs = manifest?.assetPacks || [];
  packList.replaceChildren(...packs.map((pack) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `pack-card ${pack.id === selectedPackId ? "is-selected" : ""}`;
    card.innerHTML = `<strong>${escapeHtml(pack.name)}</strong><span>${escapeHtml(pack.description || "可在线替换素材。")}</span>`;
    card.addEventListener("click", () => {
      selectedPackId = pack.id;
      renderPackSelection();
    });
    return card;
  }));
}

function renderLevelSelection() {
  const levels = manifest?.levels || [];
  levelList.replaceChildren(...levels.map((level) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `level-card ${level.id === selectedLevelId ? "is-selected" : ""}`;
    card.innerHTML = `<strong>${escapeHtml(level.name)}</strong><small>${escapeHtml(level.difficulty)} · ${escapeHtml(level.theme)} · ${level.segments?.length || 0} 段</small><span>${escapeHtml(level.description || "")}</span>`;
    card.addEventListener("click", () => {
      selectedLevelId = level.id;
      renderLevelSelection();
    });
    return card;
  }));
}

function bindMenuControls() {
  startButton.addEventListener("click", async () => {
    const level = manifest.levels.find((item) => item.id === selectedLevelId);

    if (!level) {
      feedback.textContent = "请选择关卡。";
      return;
    }

    await startLevel(level);
  });

  document.querySelector("#pause-game").addEventListener("click", () => {
    paused = !paused;
  });
  document.querySelector("#restart-game").addEventListener("click", restartFromCheckpoint);
  document.querySelector("#back-menu").addEventListener("click", backToMenu);
}

async function requestLandscape() {
  try {
    if (screen.orientation?.lock) {
      await screen.orientation.lock("landscape");
    }
  } catch {
    // Browsers often reject orientation lock outside fullscreen; portrait compatibility handles that.
  }
}

async function startLevel(level) {
  await requestLandscape();
  currentLevel = level;
  currentPack = manifest.assetPacks.find((pack) => pack.id === selectedPackId) || manifest.assetPacks[0] || null;
  assetImages = await loadAssetImages(currentPack);
  world = buildLevelWorld(level);
  checkpoint = level.checkpoints?.[0] || { x: 96, y: 416 };
  player = createPlayer(checkpoint.x, checkpoint.y);
  cameraX = 0;
  coins = 0;
  lives = 3;
  paused = false;
  hudLevel.textContent = level.name;
  updateHud();
  menu.hidden = true;
  stage.hidden = false;
  updateOrientationMode();
  cancelAnimationFrame(frameHandle);
  frameHandle = requestAnimationFrame(loop);
}

async function loadAssetImages(pack) {
  const slots = new Map((manifest?.assetSlots || []).map((slot) => [slot.id, slot]));
  const entries = Object.entries(pack?.assets || {}).filter(([slotId, asset]) => {
    return slots.get(slotId)?.kind === "image" && asset?.url;
  });

  const loaded = await Promise.all(entries.map(async ([slotId, asset]) => {
    try {
      const image = await loadImage(asset.url);
      return [slotId, image];
    } catch {
      return null;
    }
  }));

  return new Map(loaded.filter(Boolean));
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function backToMenu() {
  cancelAnimationFrame(frameHandle);
  stage.hidden = true;
  menu.hidden = false;
}

function buildLevelWorld(level) {
  const solids = [];
  const actors = [];
  const pickups = [];
  const hazards = [];
  const goals = [];

  for (const object of level.objects || []) {
    const rect = {
      ...object,
      width: object.width || defaultWidth(object.type),
      height: object.height || defaultHeight(object.type),
      hit: false
    };

    if (["ground", "brick", "question", "pipe", "platform", "moving-platform", "ice"].includes(object.type)) {
      solids.push(rect);
    } else if (object.type.startsWith("enemy.") || object.type === "boss.main") {
      actors.push({ ...rect, vx: object.type === "boss.main" ? -0.8 : -0.5, hp: object.type === "boss.main" ? 3 : 1 });
    } else if (object.type === "coin" || object.type.startsWith("powerup.")) {
      pickups.push(rect);
    } else if (["gap", "firebar", "lava"].includes(object.type)) {
      hazards.push(rect);
    } else if (["finish", "castle-door", "princess.idle"].includes(object.type)) {
      goals.push(rect);
    } else if (object.type === "checkpoint") {
      pickups.push({ ...rect, type: "checkpoint", width: 28, height: 90 });
    }
  }

  return { level, solids, actors, pickups, hazards, goals };
}

function defaultWidth(type) {
  if (type === "ground" || type === "platform" || type === "moving-platform" || type === "ice") return 128;
  if (type === "pipe") return 64;
  if (type === "boss.main") return 72;
  if (type === "gap" || type === "firebar" || type === "lava") return 128;
  return 32;
}

function defaultHeight(type) {
  if (type === "ground" || type === "gap" || type === "firebar" || type === "lava") return 96;
  if (type === "pipe") return 96;
  if (type === "boss.main") return 72;
  return 32;
}

function createPlayer(x, y) {
  return { x, y, width: 30, height: 44, vx: 0, vy: 0, grounded: false, facing: 1, invincible: 0 };
}

function loop() {
  if (!paused) {
    update();
  }
  draw();
  frameHandle = requestAnimationFrame(loop);
}

function update() {
  const left = actionState.get("left");
  const right = actionState.get("right");
  const run = actionState.get("run");
  const speed = run ? 4.2 : 2.8;

  player.vx = left ? -speed : right ? speed : 0;
  if (left) player.facing = -1;
  if (right) player.facing = 1;

  if (actionState.get("jump") && player.grounded) {
    player.vy = -12.5;
    player.grounded = false;
  }

  player.vy += gravity;
  movePlayer(player.vx, 0);
  movePlayer(0, player.vy);
  updateActors();
  collectPickups();
  checkHazardsAndGoals();
  player.invincible = Math.max(0, player.invincible - 1);
  cameraX = Math.max(0, Math.min(currentLevel.width - canvas.width, player.x - 220));
}

function movePlayer(dx, dy) {
  player.x += dx;
  player.y += dy;
  player.grounded = false;

  for (const solid of world.solids) {
    if (!overlaps(player, solid)) continue;

    if (dy > 0) {
      player.y = solid.y - player.height;
      player.vy = 0;
      player.grounded = true;
    } else if (dy < 0) {
      player.y = solid.y + solid.height;
      player.vy = 0;
      if (solid.type === "question" && !solid.hit) {
        solid.hit = true;
        world.pickups.push({ id: `${solid.id}-coin`, type: solid.value || "coin", x: solid.x, y: solid.y - 36, width: 28, height: 28 });
      }
    } else if (dx > 0) {
      player.x = solid.x - player.width;
    } else if (dx < 0) {
      player.x = solid.x + solid.width;
    }
  }

  if (player.y > currentLevel.height + 220) {
    loseLife();
  }
}

function updateActors() {
  for (const actor of world.actors) {
    actor.x += actor.vx;
    if (actor.x < 0 || actor.x > currentLevel.width - actor.width) {
      actor.vx *= -1;
    }

    if (overlaps(player, actor)) {
      if (player.vy > 0 && player.y + player.height - actor.y < 24) {
        actor.hp -= 1;
        player.vy = -8;
      } else if (player.invincible === 0) {
        loseLife();
      }
    }
  }
  world.actors = world.actors.filter((actor) => actor.hp > 0);
}

function collectPickups() {
  for (const pickup of world.pickups) {
    if (!pickup.collected && overlaps(player, pickup)) {
      pickup.collected = true;
      if (pickup.type === "checkpoint") {
        checkpoint = { x: pickup.x, y: pickup.y + pickup.height - player.height };
      } else {
        coins += pickup.type === "coin" ? 1 : 5;
      }
    }
  }
  world.pickups = world.pickups.filter((pickup) => !pickup.collected);
  updateHud();
}

function checkHazardsAndGoals() {
  if (world.hazards.some((hazard) => overlaps(player, hazard))) {
    loseLife();
  }

  if (world.goals.some((goal) => overlaps(player, goal))) {
    paused = true;
    feedback.textContent = `通关：${currentLevel.name}，金币 ${coins}`;
    window.setTimeout(backToMenu, 1200);
  }
}

function loseLife() {
  if (player.invincible > 0) return;
  lives -= 1;
  if (lives <= 0) {
    lives = 3;
    checkpoint = currentLevel.checkpoints?.[0] || { x: 96, y: 416 };
  }
  restartFromCheckpoint();
}

function restartFromCheckpoint() {
  player = createPlayer(checkpoint.x, checkpoint.y);
  player.invincible = 90;
  updateHud();
}

function updateHud() {
  hudCoins.textContent = `金币 ${coins}`;
  hudLives.textContent = `生命 ${lives}`;
}

function draw() {
  const theme = currentLevel?.theme || "grass";
  drawBackground(theme);
  for (const solid of world?.solids || []) drawObject(solid);
  for (const pickup of world?.pickups || []) drawObject(pickup);
  for (const hazard of world?.hazards || []) drawObject(hazard);
  for (const actor of world?.actors || []) drawObject(actor);
  for (const goal of world?.goals || []) drawObject(goal);
  drawPlayer();
  if (paused) {
    context.fillStyle = "rgba(0,0,0,0.45)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#fff";
    context.font = "700 42px system-ui";
    context.fillText("暂停", canvas.width / 2 - 42, canvas.height / 2);
  }
}

function drawBackground(theme) {
  const slotId = theme === "castle" || theme === "boss"
    ? "background.castle"
    : theme === "underground" || theme === "night"
      ? "background.underground"
      : "background.world1";
  const image = assetImages.get(slotId);

  if (image) {
    const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    context.fillStyle = "rgba(15, 23, 42, 0.18)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  context.fillStyle = theme === "castle" || theme === "boss" ? "#201a2d" : theme === "underground" || theme === "night" ? "#101827" : "#74c9ff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawParallax(theme);
}

function drawParallax(theme) {
  context.fillStyle = theme === "castle" || theme === "boss" ? "#6b2d2d" : "#ffffff";
  for (let x = -((cameraX * 0.35) % 220); x < canvas.width; x += 220) {
    context.globalAlpha = 0.28;
    context.beginPath();
    context.arc(x + 90, 96, 38, 0, Math.PI * 2);
    context.arc(x + 130, 88, 52, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function drawObject(object) {
  const x = object.x - cameraX;
  const y = object.y;
  if (x + object.width < -80 || x > canvas.width + 80) return;
  const image = assetImages.get(assetSlotForObject(object.type));

  if (image) {
    drawTexture(image, x, y, object.width, object.height);
    return;
  }

  const palette = {
    ground: "#6f8f2f",
    ice: "#c7f0ff",
    brick: "#a8522b",
    question: "#f7c948",
    pipe: "#16a34a",
    platform: "#996c3b",
    "moving-platform": "#b88746",
    coin: "#ffd447",
    "enemy.goomba": "#7c3f19",
    "enemy.turtle": "#2f855a",
    "enemy.flower": "#e11d48",
    "powerup.mushroom": "#ef4444",
    "powerup.star": "#facc15",
    "boss.main": "#7e22ce",
    "princess.idle": "#f472b6",
    finish: "#f8fafc",
    "castle-door": "#111827",
    checkpoint: "#38bdf8",
    gap: "#0f172a",
    firebar: "#fb923c",
    lava: "#dc2626"
  };

  context.fillStyle = palette[object.type] || "#94a3b8";
  context.fillRect(x, y, object.width, object.height);
  if (object.type === "coin") {
    context.fillStyle = "#7c2d12";
    context.fillText("$", x + 10, y + 23);
  }
}

function drawPlayer() {
  if (!player) return;
  const state = player.grounded ? "player.idle" : "player.jump";
  const image = assetImages.get(state) || assetImages.get("player.idle");
  if (image && player.invincible % 12 < 6) {
    context.save();
    if (player.facing < 0) {
      context.translate(player.x - cameraX + player.width, player.y);
      context.scale(-1, 1);
      drawTexture(image, 0, 0, player.width, player.height);
    } else {
      drawTexture(image, player.x - cameraX, player.y, player.width, player.height);
    }
    context.restore();
    return;
  }

  context.fillStyle = player.invincible % 12 < 6 ? "#f97316" : "#fde68a";
  context.fillRect(player.x - cameraX, player.y, player.width, player.height);
  context.fillStyle = "#111827";
  context.fillRect(player.x - cameraX + (player.facing > 0 ? 18 : 6), player.y + 10, 5, 5);
}

function drawTexture(image, x, y, width, height) {
  context.drawImage(image, x, y, width, height);
}

function assetSlotForObject(type) {
  const slotMap = {
    ground: "tile.ground",
    ice: "tile.ground",
    brick: "tile.brick",
    question: "tile.question",
    pipe: "tile.pipe",
    platform: "tile.ground",
    "moving-platform": "tile.ground",
    coin: "item.coin",
    "enemy.goomba": "enemy.goomba",
    "enemy.turtle": "enemy.turtle",
    "enemy.flower": "enemy.flower",
    "powerup.mushroom": "powerup.mushroom",
    "powerup.flower": "powerup.flower",
    "powerup.star": "powerup.star",
    "boss.main": "boss.main",
    "princess.idle": "princess.idle"
  };

  return slotMap[type] || type;
}

function bindKeyboardControls() {
  const keyMap = {
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    ArrowDown: "down",
    KeyS: "down",
    Space: "jump",
    ArrowUp: "jump",
    KeyW: "jump",
    ShiftLeft: "run",
    ShiftRight: "run",
    KeyJ: "run"
  };

  window.addEventListener("keydown", (event) => {
    if (event.code === "Escape") {
      paused = !paused;
      return;
    }
    if (event.code === "KeyR" && !stage.hidden) {
      restartFromCheckpoint();
      return;
    }
    const action = keyMap[event.code];
    if (action) {
      event.preventDefault();
      actionState.set(action, true);
    }
  });

  window.addEventListener("keyup", (event) => {
    const action = keyMap[event.code];
    if (action) {
      actionState.set(action, false);
    }
  });
}

function bindVirtualControls() {
  for (const button of document.querySelectorAll("[data-action]")) {
    const action = button.dataset.action;
    const set = (value) => actionState.set(action, value);
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      set(true);
    });
    button.addEventListener("pointerup", () => set(false));
    button.addEventListener("pointercancel", () => set(false));
    button.addEventListener("lostpointercapture", () => set(false));
  }
}

function updateOrientationMode() {
  const portrait = window.innerHeight > window.innerWidth && window.innerWidth <= 820;
  stage.classList.toggle("portrait-compat", portrait);
}

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}
