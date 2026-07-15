import { copyFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const root = process.cwd();
const godot = join(process.env.TEMP || tmpdir(), "godot-4.3-tools", "godot", "Godot_v4.3-stable_win64_console.exe");
const project = join(root, "vendor", "Legacy_SM63Redux");
const testScript = join(root, "tools", "llr-godot-level-probe.gd");
const runtimeScript = join(project, "zz_codex_llr_level_probe.gd");

for (const [label, path] of [["Godot", godot], ["project", project], ["probe script", testScript]]) {
  if (!existsSync(path)) throw new Error(`${label} not found: ${path}`);
}
if (existsSync(runtimeScript)) {
  throw new Error("Refusing to overwrite the existing Godot level-probe runtime file");
}

let result;
try {
  copyFileSync(testScript, runtimeScript);
  result = spawnSync(godot, [
    "--headless",
    "--path",
    project,
    "--script",
    "res://zz_codex_llr_level_probe.gd",
    "--quit-after",
    "900"
  ], {
    cwd: root,
    encoding: "utf8",
    timeout: 30000,
    maxBuffer: 1024 * 1024 * 8
  });
} finally {
  if (existsSync(runtimeScript)) unlinkSync(runtimeScript);
}

const marker = "LLR level runtime probes OK";
if (result.error || result.status !== 0 || !result.stdout.includes(marker)) {
  throw new Error([
    `Godot level runtime probes failed with status ${result.status}`,
    result.error?.message,
    result.stderr,
    result.stdout
  ].filter(Boolean).join("\n"));
}

console.log(result.stdout.split(/\r?\n/).find((line) => line.includes(marker)));
