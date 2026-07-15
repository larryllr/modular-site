import { copyFileSync, existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { brotliCompressSync, constants as zlibConstants, gunzipSync, gzipSync } from "node:zlib";

const root = process.cwd();
const tempRoot = process.env.TEMP || tmpdir();
const appData = process.env.APPDATA || join(process.env.USERPROFILE || process.env.HOME || root, "AppData", "Roaming");
const godot = join(tempRoot, "godot-4.3-tools", "godot", "Godot_v4.3-stable_win64_console.exe");
const project = join(root, "vendor", "Legacy_SM63Redux");
const outDir = mkdtempSync(join(tmpdir(), "llr-mariorun-export-"));
const exportedPck = join(outDir, "index.pck");
const targetPck = join(root, "public", "llr-mariorun", "godot", "index.pck");
const targetPckGzip = `${targetPck}.gz`;
const targetPckBrotli = `${targetPck}.br`;
const targetWasmGzip = join(root, "public", "llr-mariorun", "godot", "index.wasm.gz");
const targetWasmBrotli = join(root, "public", "llr-mariorun", "godot", "index.wasm.br");
const targetHtml = join(root, "public", "llr-mariorun", "godot", "index.html");

if (!existsSync(godot)) {
  throw new Error(`Godot 4.3 console binary not found: ${godot}`);
}
if (!existsSync(project)) {
  throw new Error(`Legacy_SM63Redux project not found: ${project}`);
}
if (!existsSync(targetWasmGzip)) {
  throw new Error(`Godot compressed WASM not found: ${targetWasmGzip}`);
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
const benignDialogErrors = errorLines.filter((line) =>
  /^ERROR: Attempting to parent and popup a dialog that already has a parent\.$/.test(line)
);
const fatalErrorLines = errorLines.filter((line) => !benignDialogErrors.includes(line));
if (result.status !== 0 || fatalErrorLines.length) {
  throw new Error([
    `Godot export was not clean. Exit status: ${result.status}`,
    ...fatalErrorLines.slice(-20),
    ...warningLines.slice(-10)
  ].join("\n"));
}

copyFileSync(exportedPck, targetPck);
const pckBuffer = readFileSync(targetPck);
const pckBytes = pckBuffer.byteLength;
const pckHash = createHash("sha256").update(pckBuffer).digest("hex");
const pckVersion = pckHash.slice(0, 16);
const gzipBuffer = gzipSync(pckBuffer, { level: 9 });
const brotliBuffer = brotliCompressSync(pckBuffer, {
  params: {
    [zlibConstants.BROTLI_PARAM_QUALITY]: 10
  }
});
writeFileSync(targetPckGzip, gzipBuffer);
writeFileSync(targetPckBrotli, brotliBuffer);
const wasmBuffer = gunzipSync(readFileSync(targetWasmGzip));
const wasmHash = createHash("sha256").update(wasmBuffer).digest("hex");
const wasmVersion = wasmHash.slice(0, 16);
const wasmBrotliBuffer = brotliCompressSync(wasmBuffer, {
  params: {
    [zlibConstants.BROTLI_PARAM_QUALITY]: 9
  }
});
writeFileSync(targetWasmBrotli, wasmBrotliBuffer);
const html = readFileSync(targetHtml, "utf8");
const fileSizePattern = /(\"fileSizes\"\s*:\s*\{\s*\"index\.pck\"\s*:\s*)\d+/;
if (!fileSizePattern.test(html)) {
  throw new Error(`Godot HTML fileSizes.index.pck entry not found: ${targetHtml}`);
}
const pckVersionPattern = /(const BUILTIN_PCK_VERSION = ')[a-f0-9]+(';)/;
if (!pckVersionPattern.test(html)) {
  throw new Error(`Godot HTML BUILTIN_PCK_VERSION entry not found: ${targetHtml}`);
}
const wasmVersionPattern = /(const BUILTIN_WASM_VERSION = ')[a-f0-9]+(';)/;
if (!wasmVersionPattern.test(html)) {
  throw new Error(`Godot HTML BUILTIN_WASM_VERSION entry not found: ${targetHtml}`);
}
writeFileSync(targetHtml, html
  .replace(fileSizePattern, `$1${pckBytes}`)
  .replace(pckVersionPattern, `$1${pckVersion}$2`)
  .replace(wasmVersionPattern, `$1${wasmVersion}$2`));
console.log(JSON.stringify({
  exportedPck,
  targetPck,
  targetPckGzip,
  targetPckBrotli,
  targetWasmGzip,
  targetWasmBrotli,
  targetHtml,
  bytes: pckBytes,
  gzipBytes: gzipBuffer.byteLength,
  brotliBytes: brotliBuffer.byteLength,
  sha256: pckHash,
  version: pckVersion,
  wasmBytes: wasmBuffer.byteLength,
  wasmGzipBytes: statSync(targetWasmGzip).size,
  wasmBrotliBytes: wasmBrotliBuffer.byteLength,
  wasmSha256: wasmHash,
  wasmVersion,
  godotExitStatus: result.status,
  warnings: warningLines.length,
  errors: fatalErrorLines.length,
  benignDialogErrors: benignDialogErrors.length
}, null, 2));
