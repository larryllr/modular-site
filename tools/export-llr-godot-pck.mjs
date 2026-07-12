import { copyFileSync, existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
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
const targetHtml = join(root, "public", "llr-mariorun", "godot", "index.html");

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

const outputLines = `${result.stderr || ""}\n${result.stdout || ""}`.split(/\r?\n/).filter(Boolean);
const warningLines = outputLines.filter((line) => /warning/i.test(line));
const errorLines = outputLines.filter((line) => /^ERROR:/i.test(line));
if (result.status !== 0 || errorLines.length) {
  throw new Error([
    `Godot export was not clean. Exit status: ${result.status}`,
    ...errorLines.slice(-20),
    ...warningLines.slice(-10)
  ].join("\n"));
}

copyFileSync(exportedPck, targetPck);
const pckBytes = statSync(targetPck).size;
const html = readFileSync(targetHtml, "utf8");
const fileSizePattern = /(\"fileSizes\"\s*:\s*\{\s*\"index\.pck\"\s*:\s*)\d+/;
if (!fileSizePattern.test(html)) {
  throw new Error(`Godot HTML fileSizes.index.pck entry not found: ${targetHtml}`);
}
writeFileSync(targetHtml, html.replace(fileSizePattern, `$1${pckBytes}`));
console.log(JSON.stringify({
  exportedPck,
  targetPck,
  targetHtml,
  bytes: pckBytes,
  godotExitStatus: result.status,
  warnings: warningLines.length,
  errors: errorLines.length
}, null, 2));
