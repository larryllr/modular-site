import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFileSync(new URL(path, root), "utf8");

const wrangler = source("wrangler.jsonc");
const worker = source("src/index.ts");
const app = source("public/app.js");
const styles = source("public/styles.css");
const assetHeaders = source("public/_headers");

function parseGodotPckEntryNames(path) {
  const buffer = readFileSync(new URL(path, root));
  assert.equal(buffer.toString("ascii", 0, 4), "GDPC");
  let offset = 4 + 4 + 4 + 4 + 4 + 4 + 8 + 16 * 4;
  const count = buffer.readUInt32LE(offset);
  offset += 4;
  const names = [];
  for (let index = 0; index < count; index += 1) {
    const nameLength = buffer.readUInt32LE(offset);
    offset += 4;
    names.push(buffer.toString("utf8", offset, offset + nameLength).replace(/\0+$/, ""));
    offset += nameLength + 8 + 8 + 16 + 4;
  }
  return names;
}

test("llr-mariorun has D1 metadata and KV-backed Worker game APIs", () => {
  assert.doesNotMatch(wrangler, /"r2_buckets"\s*:/);
  assert.match(wrangler, /"d1_databases"\s*:/);
  assert.match(wrangler, /"binding"\s*:\s*"GAME_DB"/);
  assert.match(wrangler, /"run_worker_first"\s*:\s*\[[\s\S]*"\/llr-mariorun"/);
  assert.doesNotMatch(wrangler, /"\/llr-mariorun\/\*"/);
  assert.match(wrangler, /"\/llrgamecubecity\/assets\/\*"/);
  assert.match(wrangler, /"\/llrgamecubecity\/audio\/\*"/);
  assert.match(wrangler, /"\/llrgamecubecity\/fonts\/\*"/);
  assert.match(wrangler, /"\/llrgamecubecity\/models\/\*"/);
  assert.match(wrangler, /"\/llrgamecubecity\/textures\/\*"/);
  assert.match(wrangler, /"\/llr-mariorun\/godot\/index\.pck"/);
  assert.match(wrangler, /"\/llr-mariorun\/godot\/index\.wasm"/);
  assert.match(worker, /GAME_ASSETS\?: R2Bucket/);
  assert.match(worker, /GAME_DB\?: D1Database/);
  assert.match(worker, /const gameAssetPacksKey = "game:asset-packs"/);
  assert.match(worker, /const gameLevelsKey = "game:levels"/);
  assert.match(worker, /const gameAssetKvPrefix = "game-assets-kv\/"/);
  assert.match(worker, /const gameAssetR2Prefix = "game-assets\/"/);
  assert.match(worker, /const llrMarioRunPath = "\/llr-mariorun"/);
  assert.match(worker, /function defaultLlrMarioRunLink\(\)/);
  assert.match(worker, /async function fetchGameManifest\(request: Request, env: AppEnv\)/);
  assert.match(worker, /async function writeGameAssetPacks\(env: AppEnv, packs: GameAssetPack\[\]\)/);
  assert.match(worker, /async function writeGameLevels\(env: AppEnv, levels: GameLevel\[\]\)/);
  assert.match(worker, /SELECT payload FROM game_asset_packs/);
  assert.match(worker, /INSERT INTO game_levels/);
  assert.match(worker, /assetSlots: gameAssetSlots/);
  assert.match(worker, /async function handleAdminGame\(request: Request, env: AppEnv\)/);
  assert.match(worker, /async function handleGameAssetUpload\(request: Request, env: AppEnv\)/);
  assert.match(worker, /async function fetchGameAsset\(request: Request, env: AppEnv, key: string\)/);
  assert.match(worker, /async function fetchGodotGamePack\(request: Request, env: AppEnv\)/);
  assert.match(worker, /function patchSm63ExtrasIntoPck\(targetBuffer: ArrayBuffer, sourceBuffer: ArrayBuffer\)/);
  assert.match(worker, /const sm63ExtrasPckEntries = \[/);
  assert.match(worker, /res:\/\/classes\/zone\/trigger\/death_plane\/death_plane\.gdc/);
  assert.ok(worker.includes("/-llr_complete_(?:[1-9]|10)\\.scn$/"));
  assert.match(worker, /Expected 10 compiled SM63 Extras scenes/);
  assert.match(worker, /const compiledSupportScenes = source\.entries/);
  assert.match(worker, /Expected 4 compiled SM63 support scenes/);
  for (const mechanic of ["llr_spring", "llr_conveyor", "llr_pound_gate", "llr_coin_gate"]) {
    assert.match(worker, new RegExp(`res://classes/solid/${mechanic}/${mechanic}\\.gdc`));
  }
  for (let index = 1; index <= 10; index += 1) {
    assert.match(worker, new RegExp(`res://scenes/levels/llr_complete/llr_complete_${index}\\.tscn\\.remap`));
  }
  assert.match(worker, /headers\.set\("x-llr-extra-patch", "applied"\)/);
  assert.match(worker, /safeUrlSearchParam\(referer, "pack"\)/);
  assert.match(worker, /pack\.id === requestedPackId/);
  assert.match(worker, /async function fetchCompressedGodotWasm\(request: Request, env: AppEnv, origin: string\)/);
  assert.match(worker, /url\.pathname === `\$\{llrMarioRunPath\}\/godot\/index\.pck`/);
  assert.match(worker, /url\.pathname === `\$\{llrMarioRunPath\}\/godot\/index\.wasm`/);
  assert.match(worker, /new DecompressionStream\("gzip"\)/);
  assert.match(worker, /headers\.delete\("content-encoding"\)/);
  assert.doesNotMatch(worker, /encodeBody: "manual"/);
  assert.match(worker, /function fetchStaticAsset/);
  assert.match(worker, /function cacheControlForStaticPath/);
  assert.match(worker, /cubeCityRevalidatingAssetPrefixes/);
  assert.match(worker, /\/llrgamecubecity\/fonts\//);
  assert.match(worker, /revalidatingStaticAssetExtensions/);
  assert.match(worker, /env\.SITE_CONFIG\.put\(key, await file\.arrayBuffer\(\)/);
  assert.match(worker, /env\.SITE_CONFIG\.getWithMetadata/);
  assert.match(worker, /url\.pathname\.startsWith\("\/api\/game\/assets\/"\)/);
  assert.match(assetHeaders, /\/llrgamecubecity\/assets\/\*/);
  assert.match(assetHeaders, /\/llrgamecubecity\/fonts\/\*/);
  assert.match(assetHeaders, /max-age=31536000, immutable/);
  assert.match(assetHeaders, /\/llr-mariorun\/godot\/index\.wasm\.gz/);
  assert.match(assetHeaders, /Content-Encoding: gzip/);
});

test("default game content includes asset slots and ten fair long levels", () => {
  assert.match(worker, /const gameAssetSlots: GameAssetSlot\[\] = \[/);
  for (const slot of ["player.idle", "enemy.goomba", "powerup.mushroom", "boss.main", "princess.idle", "audio.bgm", "sm63.player.sheet", "sm63.enemy.goomba.walk", "sm63.pickup.coins", "sm63.audio.title", "game.bundle.pck"]) {
    assert.match(worker, new RegExp(`id: "${slot.replace(".", "\\.")}"`));
  }
  assert.match(worker, /kind: "bundle"/);
  assert.match(worker, /allowedBundleTypes/);
  assert.match(worker, /slot\.kind === "bundle" \? "pck"/);
  assert.match(worker, /\|pck/);
  assert.match(worker, /clampNumber\(record\.size, 0, 20 \* 1024 \* 1024, 0\)/);
  assert.match(worker, /const defaultGameAssetPacks: GameAssetPack\[\] = \[/);
  assert.match(worker, /const defaultGameLevels: GameLevel\[\] = \[/);
  const levelIds = [...worker.matchAll(/id: "level-[0-9]{2}"/g)].map((match) => match[0]);
  assert.equal(new Set(levelIds).size, 10);
  assert.doesNotMatch(worker, /type: "trap\./);
  assert.match(worker, /checkpoints: \[[\s\S]*?{ x: 600[\s\S]*?{ x: 1800/);
  assert.match(worker, /segments: \[[\s\S]*?"开场"[\s\S]*?"终点"/);
});

test("static llr-mariorun game page embeds Godot runtime with touch controls and mobile rotation", () => {
  assert.equal(existsSync(new URL("public/llr-mariorun/index.html", root)), true);
  assert.equal(existsSync(new URL("public/llr-mariorun/custom.html", root)), false);
  assert.equal(existsSync(new URL("public/llr-mariorun/game.css", root)), true);
  assert.equal(existsSync(new URL("public/llr-mariorun/launcher.js", root)), true);
  for (const file of ["index.html", "index.js", "index.wasm.gz", "index.pck"]) {
    assert.equal(existsSync(new URL(`public/llr-mariorun/godot/${file}`, root)), true);
  }
  assert.equal(existsSync(new URL("public/llr-mariorun/godot/index.wasm", root)), false);

  const html = source("public/llr-mariorun/index.html");
  const css = source("public/llr-mariorun/game.css");
  const launcher = source("public/llr-mariorun/launcher.js");
  const godotHtml = source("public/llr-mariorun/godot/index.html");
  const godotLoader = source("public/llr-mariorun/godot/index.js");

  assert.match(html, /老师大冒险/);
  assert.match(html, /GODOT WEB EDITION/);
  assert.doesNotMatch(html, />管理员素材库</);
  assert.match(html, /data-admin-asset-editor hidden/);
  assert.match(html, /href="\/admin\?game=llr-mariorun"/);
  assert.match(html, />素材在线编辑</);
  assert.match(html, /开始前选择/);
  assert.match(html, /id="pack-select"/);
  assert.doesNotMatch(html, /id="level-select"/);
  assert.match(html, /id="start-selected-game"/);
  assert.match(html, /id="reset-game-data"/);
  assert.match(html, /id="import-designer-level"/);
  assert.match(html, /id="delete-selected-designer-level"/);
  assert.match(html, /data-reset-game-data/);
  assert.doesNotMatch(html, /id="start-custom-level"/);
  assert.doesNotMatch(html, /试玩编辑关卡/);
  assert.doesNotMatch(html, /选择素材包和关卡/);
  assert.match(html, /src="about:blank"/);
  assert.match(html, /恢复\/重载/);
  assert.match(html, /横屏全屏/);
  assert.match(html, /data-key="KeyX"/);
  assert.match(html, /data-key="KeyC"/);
  assert.match(html, /data-key="KeyZ"/);
  assert.match(html, /data-action="rescue"/);
  assert.match(html, /data-action="back"/);
  assert.match(html, /godot-frame/);
  assert.doesNotMatch(html, /\/llr-mariorun\/godot\/index\.html/);
  assert.match(html, /\/llr-mariorun\/godot\//);
  assert.match(html, /launcher\.js/);
  assert.match(css, /\.redux-hero/);
  assert.match(css, /\.game-frame-shell/);
  assert.match(css, /\.godot-frame/);
  assert.match(css, /\.virtual-controls/);
  assert.match(css, /\.prelaunch-panel/);
  assert.match(css, /\.launch-buttons/);
  assert.match(css, /body\.game-has-launched \.prelaunch-panel/);
  assert.match(css, /body:not\(\.game-has-launched\) \.game-frame-shell\s*{\s*display: none/);
  assert.match(css, /\.virtual-joystick/);
  assert.match(css, /\.joystick-knob/);
  assert.match(css, /body\.game-has-launched:not\(\.is-landscape-fullscreen\) \.game-frame-shell/);
  assert.match(css, /\.is-pressed/);
  assert.match(css, /-webkit-touch-callout:\s*none/);
  assert.match(css, /body\.is-forced-landscape/);
  assert.match(css, /transform:[^;]*rotate\(90deg\)/);
  assert.match(launcher, /fetch\("\/api\/game\/manifest"/);
  assert.match(launcher, /const adminTokenKey = "cloudflare-modular-site\.admin-token"/);
  assert.match(launcher, /function revealAdminAssetEditorLink/);
  assert.match(launcher, /fetch\("\/api\/admin\/game"/);
  assert.match(launcher, /adminAssetEditorLink\.hidden = false/);
  assert.match(launcher, /game\.bundle\.pck/);
  assert.match(launcher, /function importDesignerLevelFile/);
  assert.match(launcher, /function deleteSelectedDesignerLevel/);
  assert.match(launcher, /\/api\/admin\/game\/designer-levels/);
  assert.match(launcher, /method: "DELETE"/);
  assert.match(launcher, /function renderPrelaunchChoices/);
  assert.match(html, /data-game-src="\/llr-mariorun\/godot\/"/);
  assert.match(launcher, /function selectedGameUrl/);
  assert.match(launcher, /"\/llr-mariorun\/godot\/"/);
  assert.match(launcher, /function startSelectedGame/);
  assert.match(launcher, /function startSelectedGame\(\) \{\s*clearResumeScene\(\);\s*loadGameRuntime\(\);\s*\}/);
  assert.match(launcher, /focusButton\?\.addEventListener\("click", \(\) => \{[\s\S]*?isFrameBlank\(\)[\s\S]*?startSelectedGame\(\)/);
  assert.match(launcher, /function recoverGameRuntime/);
  assert.match(launcher, /function returnToLauncher/);
  assert.match(launcher, /function rescueGameRuntime/);
  assert.match(launcher, /llr-godot-missing-features/);
  assert.match(launcher, /Godot 运行环境缺少能力/);
  assert.match(launcher, /这台设备或浏览器没有开启 WebGL2/);
  assert.match(launcher, /建议更换 Edge 浏览器/);
  assert.match(launcher, /frame\.src = "about:blank"/);
  assert.match(launcher, /cacheBust: true/);
  assert.match(launcher, /searchParams\.set\("run", String\(Date\.now\(\)\)\)/);
  assert.match(launcher, /document\.body\.classList\.add\("game-has-launched"\)/);
  assert.match(launcher, /function bindVirtualJoystick/);
  assert.match(launcher, /const movementKeyAliases/);
  assert.match(launcher, /KeyA/);
  assert.match(launcher, /KeyW/);
  assert.match(launcher, /function emitMovementKey/);
  assert.match(launcher, /const horizontalThreshold = radius \* 0\.28/);
  assert.match(launcher, /const verticalThreshold = radius \* 0\.48/);
  assert.match(launcher, /setKey\("ArrowUp", y < -verticalThreshold\)/);
  assert.match(launcher, /setKey\("ArrowDown", y > verticalThreshold\)/);
  assert.match(launcher, /window\.setInterval\(\(\) => \{/);
  assert.match(launcher, /emitMovementKey\(code, "keydown", \{ repeat: true \}\)/);
  assert.match(launcher, /function resetVirtualInputs/);
  assert.match(launcher, /function attachGodotCanvasRecovery/);
  assert.match(launcher, /webglcontextlost/);
  assert.match(launcher, /recoverGameRuntime\("WebGL 已丢失，正在重建游戏运行时…"\)/);
  assert.match(launcher, /webglcontextrestored/);
  assert.match(launcher, /window\.addEventListener\("blur", resetVirtualInputs\)/);
  assert.match(launcher, /screen\.orientation\?\.lock\?\.\("landscape-primary"\)/);
  assert.doesNotMatch(launcher, /\/llr-mariorun\/custom\.html/);
  assert.match(launcher, /searchParams\.set\("pack", selectedPackId\)/);
  assert.match(godotHtml, /window\.fetch = function/);
  assert.doesNotMatch(godotHtml, /rel="preload" href="index\.wasm"/);
  assert.match(godotHtml, /rel="preload" href="index\.js\?v=llr-secure-context-20260627"/);
  assert.match(godotHtml, /<script src="index\.js\?v=llr-secure-context-20260627"><\/script>/);
  assert.match(godotHtml, /window\.parent\.postMessage\(\{ type: 'llr-godot-missing-features'/);
  assert.match(godotHtml, /这台设备或浏览器没有开启 WebGL2/);
  assert.match(godotHtml, /建议更换 Edge 浏览器/);
  assert.match(godotHtml, /\/\\\/index\\\.pck\$/);
  assert.match(godotHtml, /url\.searchParams\.set\('pack', selectedPack\)/);
  assert.match(godotHtml, /url\.searchParams\.set\('run', runId\)/);
  assert.match(godotHtml, /cache: init\?\.cache \|\| 'default'/);
  assert.doesNotMatch(godotHtml, /cache: 'no-store'/);
  assert.match(worker, /const requestUrl = new URL\(request\.url\)/);
  assert.match(worker, /requestUrl\.searchParams\.get\("pack"\) \|\| safeUrlSearchParam\(referer, "pack"\)/);
  assert.match(worker, /headers\.set\("cache-control", "no-store, max-age=0"\)/);
  assert.match(worker, /headers\.set\("x-llr-pack-id", activePack\?\.id \|\| requestedPackId \|\| "default"\)/);
  assert.doesNotMatch(launcher, /searchParams\.set\("level"/);
  assert.doesNotMatch(launcher, /selectedLevelId/);
  assert.doesNotMatch(launcher, /levelSelect/);
  assert.match(launcher, /function resetGameData/);
  assert.match(launcher, /querySelectorAll\("\[data-reset-game-data\]"\)/);
  assert.match(launcher, /indexedDB\.deleteDatabase/);
  assert.match(launcher, /FILE_DATA/);
  assert.match(launcher, /ArrowUp/);
  assert.match(launcher, /KeyX/);
  assert.match(launcher, /KeyC/);
  assert.match(launcher, /KeyZ/);
  assert.match(launcher, /function bindVirtualControls\(\)/);
  assert.match(launcher, /button\.classList\.add\("is-pressed"\)/);
  assert.match(launcher, /new KeyboardEvent\(type/);
  assert.match(launcher, /function requestLandscapeFullscreen/);
  assert.match(launcher, /recoverGameRuntime\("已退出全屏，正在恢复游戏运行时…"\)/);
  assert.match(launcher, /screen\.orientation\?\.lock\?\.\("landscape"\)/);
  assert.match(godotLoader, /window\['isSecureContext'\] === true \|\|/);
  assert.match(godotLoader, /window\.location\.protocol === 'https:'/);
  assert.match(godotLoader, /new DecompressionStream\('gzip'\)/);
  assert.match(godotLoader, /WebAssembly\.instantiate\(bytes, imports\)/);
});

test("llr-mariorun Godot pack exposes ten original long Extras levels and rescues void falls", () => {
  const entries = parseGodotPckEntryNames("public/llr-mariorun/godot/index.pck");
  assert.ok(entries.includes("res://scenes/menus/title/main_menu/main_menu.gdc"));
  assert.ok(entries.includes("res://classes/zone/trigger/death_plane/death_plane.gdc"));
  assert.ok(entries.includes("res://scenes/menus/level_designer/items.xml"));
  assert.ok(!entries.includes("res://scenes/menus/level_designer/items.xml.tres"));
  for (const mechanic of ["llr_spring", "llr_conveyor", "llr_pound_gate", "llr_coin_gate"]) {
    assert.ok(entries.includes(`res://classes/solid/${mechanic}/${mechanic}.gdc`));
    assert.ok(entries.includes(`res://classes/solid/${mechanic}/${mechanic}.tscn.remap`));
  }
  for (let index = 1; index <= 10; index += 1) {
    assert.ok(entries.includes(`res://scenes/levels/llr_complete/llr_complete_${index}.tscn.remap`));
    assert.ok(entries.some((entry) => entry.endsWith(`-llr_complete_${index}.scn`)));
  }
  assert.equal(existsSync(new URL("public/llr-mariorun/extra/smb-1-1/index.html", root)), false);
});

test("llr-mariorun Extras menu offers ten complete touch-friendly level choices", () => {
  const blueprint = source("tools/llr-level-v3.mjs");
  const menu = source("vendor/Legacy_SM63Redux/scenes/menus/title/main_menu/main_menu.gd");
  for (const title of ["风车牧场", "潮汐水道", "爆弹拆迁城", "火箭蘑菇井", "云端货运站", "涡轮海岸公路", "飞鸟迁徙谷", "钟楼机关城", "遗迹寻宝环线", "老师城终局"]) {
    assert.match(blueprint, new RegExp(title));
    assert.match(menu, new RegExp(title));
  }
  assert.match(menu, /func _open_extras_menu\(\) -> void:/);
  assert.match(menu, /func _launch_extra_level\(scene: String\) -> void:/);
  assert.match(menu, /button\.pressed\.connect\(_launch_extra_level\.bind/);
  assert.match(menu, /if !show_options and !show_extras:/);
});

test("llr-mariorun Extras scenes are audited 32k-wide V3 set-piece levels with chained finishes", () => {
  for (let index = 1; index <= 10; index += 1) {
    const scene = source(`vendor/Legacy_SM63Redux/scenes/levels/llr_complete/llr_complete_${index}.tscn`);
    assert.equal((scene.match(/\[node name="LLRSegment\d{2}_/g) || []).length, 10);
    assert.equal((scene.match(/metadata\/_llr_geometry_version = 3/g) || []).length, 10);
    assert.equal((scene.match(/metadata\/_llr_act = 1/g) || []).length, 3);
    assert.equal((scene.match(/metadata\/_llr_act = 2/g) || []).length, 4);
    assert.equal((scene.match(/metadata\/_llr_act = 3/g) || []).length, 3);
    assert.equal((scene.match(/metadata\/_llr_cadence = "introduction"/g) || []).length, 2);
    assert.equal((scene.match(/metadata\/_llr_cadence = "development"/g) || []).length, 3);
    assert.equal((scene.match(/metadata\/_llr_cadence = "twist"/g) || []).length, 3);
    assert.equal((scene.match(/metadata\/_llr_cadence = "resolution"/g) || []).length, 2);
    assert.equal((scene.match(/metadata\/_llr_kind = "main"/g) || []).length, 10);
    assert.ok((scene.match(/metadata\/_llr_kind = "recovery"/g) || []).length >= 2);
    const setPieces = [...scene.matchAll(/\[node name="LLRSegment\d{2}_[^\"]+"[^\]]*\][\s\S]*?metadata\/_llr_set_piece = "([^"]+)"/g)]
      .map((match) => match[1]);
    assert.equal(setPieces.length, 10);
    assert.equal(new Set(setPieces).size, 10);
    const forms = [...scene.matchAll(/\[node name="LLRSegment\d{2}_([^"]+)"/g)].map((match) => match[1]);
    assert.ok(new Set(forms).size >= 6);
    const mechanicSets = [...scene.matchAll(/metadata\/_llr_mechanics = "([^"]+)"/g)].map((match) => match[1]);
    assert.equal(mechanicSets.length, 10);
    assert.ok(new Set(mechanicSets).size >= 8);
    assert.ok(new Set(mechanicSets.flatMap((value) => value.split(","))).size >= 6);
    assert.match(scene, /metadata\/_llr_points = PackedVector2Array\(/);
    assert.doesNotMatch(scene, /type="Marker2D" parent="Route"/);
    const entries = [...scene.matchAll(/metadata\/_llr_entry_y = (-?\d+(?:\.\d+)?)\nmetadata\/_llr_exit_y = (-?\d+(?:\.\d+)?)/g)];
    assert.equal(entries.length, 10);
    const nodeCount = (scene.match(/^\[node /gm) || []).length;
    assert.ok(nodeCount >= 250);
    assert.ok(nodeCount <= 700);
    const flow = scene.match(/metadata\/_llr_main_seconds = (\d+(?:\.\d+)?)/);
    assert.ok(flow && Number(flow[1]) >= 180);
    assert.match(scene, /metadata\/_llr_campaign_version = 3/);
    assert.match(scene, /32180, -820/);
    assert.match(scene, /\[node name="FinishWarp"/);
    assert.match(scene, /size = Vector2\(76, 340\)/);
    assert.doesNotMatch(scene, /scene_path = "res:\/\/scenes\/levels\/tutorial_1\//);
    if (index < 10) {
      assert.match(scene, new RegExp(`scene_path = "res://scenes/levels/llr_complete/llr_complete_${index + 1}\\.tscn"`));
    } else {
      assert.match(scene, /scene_path = "res:\/\/scenes\/menus\/title\/main_menu\/main_menu\.tscn"/);
    }
  }
});

test("llr-mariorun Extras V3 strict geometry and gameplay-variety audit passes", () => {
  const result = spawnSync(process.execPath, ["tools/audit-llr-level-geometry.mjs", "--strict"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /"totalViolations": 0/);
});

test("llr-mariorun Extras V3 includes a touch-friendly moving shuttle mechanic", () => {
  const patch = source("tools/patch-llr-complete-level.mjs");
  const script = source("vendor/Legacy_SM63Redux/classes/solid/llr_shuttle/llr_shuttle.gd");
  const shuttle = source("vendor/Legacy_SM63Redux/classes/solid/llr_shuttle/llr_shuttle.tscn");
  const thwomp = source("vendor/Legacy_SM63Redux/classes/entity/enemy/thwomp/thwomp.gd");
  const rebindOption = source("vendor/Legacy_SM63Redux/gui/pause/options/rebind_option.gd");
  assert.match(patch, /buildV3StageScene/);
  assert.match(patch, /llr_shuttle\/llr_shuttle\.tscn/);
  assert.match(script, /platform\.scale = Vector2\(1\.75, 1\.0\)/);
  assert.match(script, /smoothstep\(0\.0, 1\.0/);
  assert.match(shuttle, /moving_platform\/moving_platform\.tscn/);
  assert.match(thwomp, /enum F \{\n\tIDLE = 0,\n\tBLINK = 1,/);
  assert.match(rebindOption, /if !is_node_ready\(\) or !is_instance_valid\(key_list\):/);
});

test("llr-mariorun Extras V3.1 adds readable challenge beats instead of more flat distance", () => {
  const blueprint = source("tools/llr-level-v3.mjs");
  const patch = source("tools/patch-llr-complete-level.mjs");
  const spring = source("vendor/Legacy_SM63Redux/classes/solid/llr_spring/llr_spring.gd");
  const conveyor = source("vendor/Legacy_SM63Redux/classes/solid/llr_conveyor/llr_conveyor.gd");
  const poundGate = source("vendor/Legacy_SM63Redux/classes/solid/llr_pound_gate/llr_pound_gate.gd");
  const coinGate = source("vendor/Legacy_SM63Redux/classes/solid/llr_coin_gate/llr_coin_gate.gd");
  for (const mechanic of ["spring", "conveyor", "pound_gate", "red_gate", "fludd_hover"]) {
    assert.match(blueprint, new RegExp(`"${mechanic}"`));
  }
  for (const resource of ["llr_spring", "llr_conveyor", "llr_pound_gate", "llr_coin_gate"]) {
    assert.match(patch, new RegExp(`${resource}/${resource}\\.tscn`));
  }
  assert.match(spring, /launch_speed/);
  assert.match(spring, /body\.set\("vel"/);
  assert.match(conveyor, /body\.position\.x \+= speed \* delta/);
  assert.match(poundGate, /body\.S\.POUND/);
  assert.match(coinGate, /Singleton\.red_coin_total - starting_coins/);
  assert.match(blueprint, /required_coins: "4"/);
  assert.equal((blueprint.match(/ChallengeRedCoin/g) || []).length, 1);
});

test("llr-mariorun Level Designer keeps negative coordinates and exports clean data files", () => {
  const serializer = source("vendor/Legacy_SM63Redux/scenes/menus/level_designer/serializers/serializer.gd");
  const designer = source("vendor/Legacy_SM63Redux/scenes/menus/level_designer/ld_main.gd");
  const designerMusic = source("vendor/Legacy_SM63Redux/scenes/menus/level_designer/music.gd");
  const exportPresets = source("vendor/Legacy_SM63Redux/export_presets.cfg");
  const packageJson = source("package.json");
  assert.match(serializer, /bytes\.slice\(\s*0, half\s*\)/);
  assert.match(serializer, /bytes\.slice\(\s*half, size\s*\)/);
  assert.match(serializer, /val < -sign_bit or val > sign_bit - 1/);
  assert.doesNotMatch(designer, /serializer\.run_tests\(true\)/);
  assert.match(designer, /parser\.open\("res:\/\/scenes\/menus\/level_designer\/items\.xml"\)/);
  assert.doesNotMatch(designerMusic, /preload\("\.\/music\/editor[1-4]\.ogg"\)/);
  assert.match(designerMusic, /ResourceLoader\.exists\(path\)/);
  assert.match(exportPresets, /name="Web"[\s\S]*?include_filter="\*\.xml"/);
  assert.match(packageJson, /tools\/test-llr-godot-serializer\.mjs/);
  assert.match(packageJson, /tools\/test-llr-godot-mechanisms\.mjs/);
});

test("admin app exposes llr-mariorun entry and online editors", () => {
  assert.match(app, /const llrMarioRunPath = "\/llr-mariorun"/);
  assert.match(app, /function renderAdminGameEditor\(\)/);
  assert.match(app, /function shouldRenderAdminGameEditor\(\)/);
  assert.match(app, /get\("game"\) === "llr-mariorun"/);
  assert.match(app, /function clearAdminGameEditorMode\(\)/);
  assert.match(app, /if \(gameEditorMode\) \{[\s\S]*?main\.append\(renderAdminGameEditor\(\)\)/);
  assert.doesNotMatch(app, /panel\.append\(renderAdminGameEditor\(\)\)/);
  assert.match(app, /async function loadAdminGameConfig\(\)/);
  assert.match(app, /function renderGameAssetPackEditor/);
  assert.match(app, /function renderPckArchiveEditor/);
  assert.match(app, /function parseGodotPck/);
  assert.match(app, /function buildGodotPck/);
  assert.match(app, /function guessPckEntryType/);
  assert.match(app, /PCK 在线编辑器/);
  assert.match(app, /查看 PCK 内容/);
  assert.match(app, /保存成新素材包/);
  assert.match(app, /pack\?\.id === "original"/);
  assert.match(app, /source=pck-editor/);
  assert.match(app, /可直接读取内置原版/);
  assert.match(app, /function importLocalGameAssetPacks/);
  assert.match(app, /function dataUrlToFile/);
  assert.match(app, /function downloadJson/);
  assert.match(app, /function templateAssetForSlot/);
  assert.match(app, /function defaultAssetFilename/);
  assert.match(app, /function findFirstAssetForSlot/);
  assert.match(app, /导入本地素材包/);
  assert.match(app, /下载素材包模板/);
  assert.match(app, /下载当前素材/);
  assert.match(app, /素材在线编辑/);
  assert.match(app, /\.pck,application\/octet-stream/);
  assert.match(app, /function renderGameDataEditor/);
  assert.match(app, /游戏数据保存/);
  assert.doesNotMatch(app, /game-level-designer/);
  assert.doesNotMatch(app, /在线关卡设计/);
  assert.match(app, /\/api\/admin\/game/);
  assert.match(app, /\/api\/admin\/game\/assets/);
  assert.match(worker, /handleAdminDesignerLevels/);
  assert.match(worker, /request\.method === "DELETE"/);
  assert.match(worker, /designerSource === "sm63-redux"/);
  assert.match(app, /老师大冒险/);
  assert.match(styles, /\.game-admin-panel/);
  assert.match(styles, /\.game-editor-tools/);
  assert.match(styles, /\.game-import-button/);
  assert.match(styles, /\.game-asset-slot-grid/);
  assert.match(styles, /\.pck-entry-list/);
  assert.match(styles, /\.pck-entry-preview/);
  assert.doesNotMatch(styles, /\.game-level-designer/);
  assert.doesNotMatch(styles, /\.game-level-preview/);
  assert.doesNotMatch(styles, /\.game-level-object/);
  assert.match(styles, /\.game-level-editor/);
});

test("Godot pack export synchronizes the generated PCK size into the web shell", () => {
  const exporter = readFileSync("tools/export-llr-godot-pck.mjs", "utf8");
  assert.match(exporter, /const pckBytes = statSync\(targetPck\)\.size/);
  assert.match(exporter, /fileSizes/);
  assert.match(exporter, /html\.replace\(fileSizePattern, `\$1\$\{pckBytes\}`\)/);
  const html = source("public/llr-mariorun/godot/index.html");
  const configuredBytes = Number(html.match(/"fileSizes":\{"index\.pck":(\d+)/)?.[1]);
  const actualBytes = statSync(new URL("public/llr-mariorun/godot/index.pck", root)).size;
  assert.equal(configuredBytes, actualBytes);
});
