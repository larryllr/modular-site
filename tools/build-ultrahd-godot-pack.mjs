import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);

const project = args.get("--project");
const sheet = args.get("--sheet");
const outDir = args.get("--out-dir");
const scale = Number(args.get("--scale") ?? "10");
const displayScale = Number(args.get("--display-scale") ?? "0.125");
const poundFrames = (args.get("--pound-frames") ?? "")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter(Number.isFinite);

if (!project || !sheet || !outDir) {
  throw new Error("Usage: node tools/build-ultrahd-godot-pack.mjs --project vendor/Legacy_SM63Redux --sheet output/.../mario_sheet.png --out-dir output/...");
}

const playerScenePath = join(project, "classes/player/player.tscn");
const playerSheetPath = join(project, "classes/player/mario_sheet.png");
const backupScenePath = join(outDir, "player.tscn.original");
const backupSheetPath = join(outDir, "mario_sheet.original.png");

mkdirSync(outDir, { recursive: true });
if (!existsSync(backupScenePath)) copyFileSync(playerScenePath, backupScenePath);
if (!existsSync(backupSheetPath)) copyFileSync(playerSheetPath, backupSheetPath);
copyFileSync(sheet, playerSheetPath);

const originalScene = readFileSync(backupScenePath, "utf8");
const patchedScene = patchPlayerScene(originalScene, scale, displayScale, poundFrames);
writeFileSync(playerScenePath, patchedScene);

console.log(JSON.stringify({
  playerScenePath,
  playerSheetPath,
  sheet,
  outDir,
  scale,
  displayScale,
  fluddScale: 1 / displayScale,
  poundFrames
}, null, 2));

function patchPlayerScene(scene, regionScale, spriteScale, poundFrameIds) {
  const lines = scene.split(/\r?\n/);
  let inAtlas8 = false;
  let currentSubResourceId = "";
  let regionCount = 0;
  const poundResourceIds = new Map([
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
        const remapFrame = poundResourceIds.get(currentSubResourceId);
        if (Number.isFinite(remapFrame)) {
          const col = remapFrame % 10;
          const row = Math.floor(remapFrame / 10);
          return `region = Rect2(${col * 48 * regionScale}, ${row * 48 * regionScale}, ${48 * regionScale}, ${48 * regionScale})`;
        }
        return `region = Rect2(${Number(x) * regionScale}, ${Number(y) * regionScale}, ${48 * regionScale}, ${48 * regionScale})`;
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
