import { copyFileSync, existsSync, mkdtempSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const root = process.cwd();
const tempRoot = process.env.TEMP || tmpdir();
const appData = process.env.APPDATA || join(process.env.USERPROFILE || process.env.HOME || root, "AppData", "Roaming");
const godot = join(tempRoot, "godot-4.3-tools", "godot", "Godot_v4.3-stable_win64_console.exe");
const project = join(root, "vendor", "Legacy_SM63Redux");
const outDir = mkdtempSync(join(tmpdir(), "llr-mariorun-export-"));
const exportedPck = join(outDir, "index.pck");
const targetPck = join(root, "public", "llr-mariorun", "godot", "index.pck");

if (!existsSync(godot)) {
  throw new Error(`Godot 4.3 console binary not found: ${godot}`);
}
if (!existsSync(project)) {
  throw new Error(`Legacy_SM63Redux project not found: ${project}`);
}

const result = spawnSync(godot, [
  "--headless",
  "--path",
  project,
  "--export-pack",
  "Web",
  exportedPck
], {
  cwd: root,
  env: { ...process.env, APPDATA: appData },
  encoding: "utf8",
  maxBuffer: 1024 * 1024 * 8
});

if (!existsSync(exportedPck)) {
  const stderr = (result.stderr || "").split(/\r?\n/).filter(Boolean).slice(-25).join("\n");
  const stdout = (result.stdout || "").split(/\r?\n/).filter(Boolean).slice(-25).join("\n");
  throw new Error(`Godot export did not create index.pck. Exit status: ${result.status}\nSTDERR:\n${stderr}\nSTDOUT:\n${stdout}`);
}

copyFileSync(exportedPck, targetPck);
const warningCount = (result.stderr || "").split(/\r?\n/).filter((line) => /warning/i.test(line)).length;
const errorCount = (result.stderr || "").split(/\r?\n/).filter((line) => /^ERROR:/i.test(line)).length;
console.log(JSON.stringify({
  exportedPck,
  targetPck,
  bytes: statSync(targetPck).size,
  godotExitStatus: result.status,
  warnings: warningCount,
  errors: errorCount
}, null, 2));
