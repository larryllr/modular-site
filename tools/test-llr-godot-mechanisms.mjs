import { copyFileSync, existsSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const root = process.cwd();
const godot = join(process.env.TEMP || tmpdir(), "godot-4.3-tools", "godot", "Godot_v4.3-stable_win64_console.exe");
const project = join(root, "vendor", "Legacy_SM63Redux");
const testScript = join(root, "tools", "llr-godot-mechanism-test.gd");
const runtimeScript = join(project, "zz_codex_llr_mechanism_test.gd");
const runtimeScene = join(project, "zz_codex_llr_mechanism_test.tscn");

for (const [label, path] of [["Godot", godot], ["project", project], ["test script", testScript]]) {
  if (!existsSync(path)) throw new Error(`${label} not found: ${path}`);
}

if (existsSync(runtimeScript) || existsSync(runtimeScene)) {
  throw new Error("Refusing to overwrite existing Godot mechanism test runtime files");
}

let result;
try {
  copyFileSync(testScript, runtimeScript);
  writeFileSync(runtimeScene, `[gd_scene load_steps=2 format=3]\n\n[ext_resource type="Script" path="res://zz_codex_llr_mechanism_test.gd" id="1"]\n\n[node name="LLRMechanismTest" type="Node"]\nscript = ExtResource("1")\n`, "utf8");
  result = spawnSync(godot, [
    "--headless",
    "--path",
    project,
    "--scene",
    "res://zz_codex_llr_mechanism_test.tscn",
    "--quit-after",
    "900"
  ], {
    cwd: root,
    encoding: "utf8",
    timeout: 30000,
    maxBuffer: 1024 * 1024 * 4
  });
} finally {
  if (existsSync(runtimeScene)) unlinkSync(runtimeScene);
  if (existsSync(runtimeScript)) unlinkSync(runtimeScript);
}

if (result.error || result.status !== 0 || !result.stdout.includes("objective target")) {
  throw new Error([
    `Godot mechanism test failed with status ${result.status}`,
    result.error?.message,
    result.stderr,
    result.stdout
  ].filter(Boolean).join("\n"));
}

console.log(result.stdout.split(/\r?\n/).find((line) => line.includes("LLR mechanism smoke test OK")));
