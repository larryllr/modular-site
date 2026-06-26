import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const key = process.argv[i];
  if (!key?.startsWith("--")) continue;
  const next = process.argv[i + 1];
  if (next && !next.startsWith("--")) {
    args.set(key, next);
    i += 1;
  } else {
    args.set(key, true);
  }
}

const project = args.get("--project");
const sheet = args.get("--sheet");
const outDir = args.get("--out-dir");
const scale = Number(args.get("--scale") ?? "10");
const targetCell = args.has("--target-cell") ? Number(args.get("--target-cell")) : null;
const displayScale = Number(args.get("--display-scale") ?? "0.125");
const teacherActionMap = args.has("--teacher-action-map");
const poundFrames = (args.get("--pound-frames") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => Number(value))
  .filter(Number.isFinite);

if (!project || !sheet || !outDir) {
  throw new Error("Usage: node tools/build-ultrahd-godot-pack.mjs --project vendor/Legacy_SM63Redux --sheet output/.../mario_sheet.png --out-dir output/...");
}

const playerScenePath = join(project, "classes/player/player.tscn");
const playerSheetPath = join(project, "classes/player/mario_sheet.png");
const backupScenePath = join(outDir, "player.tscn.original");
const backupSheetPath = join(outDir, "mario_sheet.original.png");
const patchedScenePath = join(outDir, "player.tscn.patched");

mkdirSync(outDir, { recursive: true });
if (!existsSync(backupScenePath)) copyFileSync(playerScenePath, backupScenePath);
if (!existsSync(backupSheetPath)) copyFileSync(playerSheetPath, backupSheetPath);
copyFileSync(sheet, playerSheetPath);

const originalScene = readFileSync(backupScenePath, "utf8");
const patchedScene = patchPlayerScene(originalScene, scale, targetCell, displayScale, poundFrames);
writeFileSync(playerScenePath, patchedScene);
writeFileSync(patchedScenePath, patchedScene);

console.log(JSON.stringify({
  playerScenePath,
  playerSheetPath,
  sheet,
  outDir,
  scale,
  targetCell,
  displayScale,
  fluddScale: 1 / displayScale,
  poundFrames,
  teacherActionMap
}, null, 2));

function patchPlayerScene(scene, regionScale, explicitTargetCell, spriteScale, poundFrameIds) {
  const lines = scene.split(/\r?\n/);
  let inAtlas8 = false;
  let currentSubResourceId = "";
  let regionCount = 0;
  const cellSize = Number.isFinite(explicitTargetCell) ? explicitTargetCell : 48 * regionScale;
  const resourceTargetFrames = teacherActionMap
    ? teacherResourceTargetFrames()
    : new Map([
      ["125", poundFrameIds[0]],
      ["126", poundFrameIds[1]],
      ["133", poundFrameIds[2]]
    ]);
  const out = [];
  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index];
    const resourceMatch = line.match(/^\[sub_resource type="AtlasTexture" id="([^"]+)"\]/);
    if (line.startsWith("[sub_resource")) {
      inAtlas8 = false;
      currentSubResourceId = resourceMatch?.[1] ?? "";
    }
    if (/^atlas = ExtResource\("8"\)$/.test(line)) inAtlas8 = true;
    if (inAtlas8) {
      line = line.replace(/region = Rect2\((\d+), (\d+), 48, 48\)/, (_m, x, y) => {
        regionCount += 1;
        const remapFrame = resourceTargetFrames.get(currentSubResourceId);
        if (Number.isFinite(remapFrame)) {
          const col = remapFrame % 10;
          const row = Math.floor(remapFrame / 10);
          return `region = Rect2(${col * cellSize}, ${row * cellSize}, ${cellSize}, ${cellSize})`;
        }
        const col = Number(x) / 48;
        const row = Number(y) / 48;
        return `region = Rect2(${col * cellSize}, ${row * cellSize}, ${cellSize}, ${cellSize})`;
      });
    }
    out.push(line);
    if (line === "[node name=\"CharacterSprite\" type=\"AnimatedSprite2D\" parent=\"CharacterGroup\"]") {
      out.push(`scale = Vector2(${spriteScale}, ${spriteScale})`);
    }
    if (line === "[node name=\"Fludd\" type=\"AnimatedSprite2D\" parent=\"CharacterGroup/CharacterSprite\"]") {
      const inverse = Number((1 / spriteScale).toFixed(6));
      out.push(`scale = Vector2(${inverse}, ${inverse})`);
    }
  }
  if (regionCount < 80) throw new Error(`Patched too few player atlas regions: ${regionCount}`);
  return out.join("\n");
}

function teacherResourceTargetFrames() {
  return new Map(Object.entries({
    // Idle and direction poses.
    "129": 7,       // back
    "132": 0,       // front

    // Crouch / low movement.
    "130": 31,
    "131": 39,
    "AtlasTexture_byplk": 39,
    "103": 31,
    "104": 32,
    "105": 33,

    // Dive / belly slide / prone recovery.
    "106": 33,
    "178": 34,
    "179": 35,
    "180": 36,
    "176": 34,
    "177": 35,
    "111": 36,
    "112": 37,
    "127": 30,
    "128": 31,

    // Jumps, falls, landings. Keep these out of spin/crawl rows.
    "74": 20,
    "182": 21,
    "183": 22,
    "184": 23,
    "78": 24,
    "185": 25,
    "186": 26,
    "187": 27,
    "82": 24,
    "83": 25,
    "188": 26,
    "189": 27,
    "181": 26,
    "119": 24,
    "120": 25,
    "173": 28,
    "86": 28,
    "87": 29,
    "88": 28,
    "89": 28,
    "90": 29,

    // Hurt / knockdown.
    "171": 66,
    "172": 67,
    "70": 66,
    "71": 67,
    "72": 68,
    "73": 69,
    "113": 35,
    "114": 36,
    "115": 37,
    "116": 38,
    "117": 43,
    "118": 44,

    // Pound / ground-hit. Uses the new sheets' explicit impact row.
    "125": 60,
    "126": 61,
    "133": 62,

    // Spin. Only these resources use turn/roll frames now.
    "151": 45,
    "152": 46,
    "153": 47,
    "154": 45,
    "155": 46,
    "156": 47,
    "157": 48,
    "158": 45,
    "159": 46,
    "160": 47,
    "161": 48,
    "162": 45,
    "163": 46,
    "164": 47,
    "165": 48,
    "166": 45,
    "167": 46,
    "168": 47,
    "169": 48,
    "170": 46,

    // Swimming can reuse prone/crawl frames rather than walking or spin.
    "91": 30,
    "92": 31,
    "93": 32,
    "94": 33,
    "95": 34,
    "96": 35,
    "97": 34,
    "98": 35,
    "99": 36,
    "100": 37,
    "101": 38,

    // Walking. Only side-walk frames, no front/turn/spin frames.
    "57": 10,
    "58": 11,
    "59": 12,
    "60": 13,
    "61": 14,
    "62": 15,
    "63": 10,
    "64": 11,
    "65": 12,
    "66": 13,
    "67": 14,
    "68": 15,
    "69": 16
  }).map(([key, value]) => [key, value]));
}
