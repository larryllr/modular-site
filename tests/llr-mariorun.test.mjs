import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFileSync(new URL(path, root), "utf8");

const wrangler = source("wrangler.jsonc");
const worker = source("src/index.ts");
const app = source("public/app.js");
const styles = source("public/styles.css");

test("llr-mariorun has R2-ready KV-backed Worker game APIs", () => {
  assert.doesNotMatch(wrangler, /"r2_buckets"\s*:/);
  assert.match(wrangler, /"run_worker_first"\s*:\s*\[[\s\S]*"\/llr-mariorun"/);
  assert.match(worker, /GAME_ASSETS\?: R2Bucket/);
  assert.match(worker, /const gameAssetPacksKey = "game:asset-packs"/);
  assert.match(worker, /const gameLevelsKey = "game:levels"/);
  assert.match(worker, /const gameAssetKvPrefix = "game-assets-kv\/"/);
  assert.match(worker, /const gameAssetR2Prefix = "game-assets\/"/);
  assert.match(worker, /const llrMarioRunPath = "\/llr-mariorun"/);
  assert.match(worker, /function defaultLlrMarioRunLink\(\)/);
  assert.match(worker, /async function fetchGameManifest\(request: Request, env: AppEnv\)/);
  assert.match(worker, /assetSlots: gameAssetSlots/);
  assert.match(worker, /async function handleAdminGame\(request: Request, env: AppEnv\)/);
  assert.match(worker, /async function handleGameAssetUpload\(request: Request, env: AppEnv\)/);
  assert.match(worker, /async function fetchGameAsset\(request: Request, env: AppEnv, key: string\)/);
  assert.match(worker, /env\.SITE_CONFIG\.put\(key, await file\.arrayBuffer\(\)/);
  assert.match(worker, /env\.SITE_CONFIG\.getWithMetadata/);
  assert.match(worker, /url\.pathname\.startsWith\("\/api\/game\/assets\/"\)/);
});

test("default game content includes asset slots and ten fair long levels", () => {
  assert.match(worker, /const gameAssetSlots: GameAssetSlot\[\] = \[/);
  for (const slot of ["player.idle", "enemy.goomba", "powerup.mushroom", "boss.main", "princess.idle", "audio.bgm", "sm63.player.sheet", "sm63.enemy.goomba.walk", "sm63.pickup.coins", "sm63.audio.title"]) {
    assert.match(worker, new RegExp(`id: "${slot.replace(".", "\\.")}"`));
  }
  assert.match(worker, /const defaultGameAssetPacks: GameAssetPack\[\] = \[/);
  assert.match(worker, /const defaultGameLevels: GameLevel\[\] = \[/);
  const levelIds = [...worker.matchAll(/id: "level-[0-9]{2}"/g)].map((match) => match[0]);
  assert.equal(new Set(levelIds).size, 10);
  assert.doesNotMatch(worker, /type: "trap\./);
  assert.match(worker, /checkpoints: \[[\s\S]*?{ x: 600[\s\S]*?{ x: 1800/);
  assert.match(worker, /segments: \[[\s\S]*?"开场"[\s\S]*?"终点"/);
});

test("static llr-mariorun game page has menu controls canvas runtime and mobile rotation", () => {
  assert.equal(existsSync(new URL("public/llr-mariorun/index.html", root)), true);
  assert.equal(existsSync(new URL("public/llr-mariorun/game.css", root)), true);
  assert.equal(existsSync(new URL("public/llr-mariorun/game.js", root)), true);

  const html = source("public/llr-mariorun/index.html");
  const css = source("public/llr-mariorun/game.css");
  const game = source("public/llr-mariorun/game.js");

  assert.match(html, /老师大冒险/);
  assert.match(html, /game\.js/);
  assert.match(css, /\.portrait-compat/);
  assert.match(css, /\.virtual-controls/);
  assert.match(css, /\[hidden\]\s*{\s*display:\s*none !important;/);
  assert.match(css, /transform:\s*rotate\(90deg\)/);
  assert.match(game, /const gameManifestUrl = "\/api\/game\/manifest"/);
  assert.match(game, /function renderPackSelection\(\)/);
  assert.match(game, /function renderLevelSelection\(\)/);
  assert.match(game, /function renderKeyboardHints\(\)/);
  assert.match(game, /function bindVirtualControls\(\)/);
  assert.match(game, /function updateOrientationMode\(\)/);
  assert.match(game, /screen\.orientation\.lock\("landscape"\)/);
  assert.match(game, /function restartFromCheckpoint\(\)/);
  assert.match(game, /function buildLevelWorld\(level\)/);
});

test("admin app exposes llr-mariorun entry and online editors", () => {
  assert.match(app, /const llrMarioRunPath = "\/llr-mariorun"/);
  assert.match(app, /function renderAdminGameEditor\(\)/);
  assert.match(app, /async function loadAdminGameConfig\(\)/);
  assert.match(app, /function renderGameAssetPackEditor/);
  assert.match(app, /function renderGameLevelEditor/);
  assert.match(app, /\/api\/admin\/game/);
  assert.match(app, /\/api\/admin\/game\/assets/);
  assert.match(app, /老师大冒险/);
  assert.match(styles, /\.game-admin-panel/);
  assert.match(styles, /\.game-asset-slot-grid/);
  assert.match(styles, /\.game-level-editor/);
});
