import { readFileSync, writeFileSync } from "node:fs";

const path = "src/index.ts";
let text = readFileSync(path, "utf8");
const from = `const sm63ExtrasPckEntries = [\n  "res://scenes/menus/title/main_menu/main_menu.gdc",\n  "res://classes/zone/trigger/death_plane/death_plane.gdc"\n];`;
const to = `const sm63ExtrasPckEntries = [\n  "res://scenes/menus/title/main_menu/main_menu.gdc",\n  "res://classes/zone/trigger/death_plane/death_plane.gdc",\n  "res://classes/global/singleton/singleton.gdc"\n];`;
if (text.includes(from)) {
  text = text.replace(from, to);
  writeFileSync(path, text);
}
console.log("llr-mariorun PCK sync entries patched");
