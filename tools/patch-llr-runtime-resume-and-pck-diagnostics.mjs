import { readFileSync, writeFileSync } from "node:fs";

function read(path) { return readFileSync(path, "utf8"); }
function write(path, text) { writeFileSync(path, text); }
function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`Missing block: ${label}`);
  return text.replace(from, to);
}

let launcher = read("public/llr-mariorun/launcher.js");
if (!launcher.includes("const resumeSceneKey")) {
  launcher = replaceOnce(launcher, `const localDesignerLevelsKey = "llr-mariorun.local-designer-levels.v1";`, `const localDesignerLevelsKey = "llr-mariorun.local-designer-levels.v1";\nconst resumeSceneKey = "llr-mariorun.resume-scene.v1";`, "add resume scene key");
}
if (!launcher.includes("function readResumeScene")) {
  launcher = replaceOnce(launcher, `function selectedGameUrl(options = {}) {`, `function readResumeScene() {\n  try {\n    const scene = localStorage.getItem(resumeSceneKey) || "";\n    return scene.startsWith("res://scenes/") ? scene : "";\n  } catch {\n    return "";\n  }\n}\n\nfunction writeResumeScene(scene) {\n  try {\n    if (String(scene || "").startsWith("res://scenes/")) {\n      localStorage.setItem(resumeSceneKey, String(scene));\n    }\n  } catch {\n    // Storage can be disabled in private or low-memory browsers.\n  }\n}\n\nfunction clearResumeScene() {\n  try {\n    localStorage.removeItem(resumeSceneKey);\n  } catch {\n    // Storage can be disabled in private or low-memory browsers.\n  }\n}\n\nfunction selectedGameUrl(options = {}) {`, "add resume scene helpers");
}
if (!launcher.includes("url.searchParams.set(\"resumeScene\", resumeScene);")) {
  launcher = replaceOnce(launcher, `  if (selectedDesignerLevelId) url.searchParams.set("designerLevel", selectedDesignerLevelId);\n  url.searchParams.set("locale", "zh_CN");`, `  if (selectedDesignerLevelId) url.searchParams.set("designerLevel", selectedDesignerLevelId);\n  if (options.resumeLast) {\n    const resumeScene = readResumeScene();\n    if (resumeScene) url.searchParams.set("resumeScene", resumeScene);\n  }\n  url.searchParams.set("locale", "zh_CN");`, "add resume param");
}
launcher = launcher.replace(`function startSelectedGame() {\n  loadGameRuntime({ cacheBust: true });\n}`, `function startSelectedGame() {\n  clearResumeScene();\n  loadGameRuntime();\n}`);
launcher = launcher.replace(`function startSelectedGame() {\n  clearResumeScene();\n  loadGameRuntime({ cacheBust: true });\n}`, `function startSelectedGame() {\n  clearResumeScene();\n  loadGameRuntime();\n}`);
launcher = launcher.replace(`    loadGameRuntime({\n      cacheBust: true,\n      status: "正在重新载入 Godot 游戏…"\n    });`, `    loadGameRuntime({\n      cacheBust: true,\n      resumeLast: true,\n      status: "正在重新载入 Godot 游戏，尽量恢复到上一次切换点…"\n    });`);
if (!launcher.includes("llr-godot-pack-status")) {
  launcher = replaceOnce(launcher, `function handleGodotRuntimeMessage(event) {\n  if (event.origin !== window.location.origin) return;\n  if (event.data?.type !== "llr-godot-missing-features") return;\n  const missing = Array.isArray(event.data.missing) ? event.data.missing.join("；") : "未知能力";\n  const message = missing.includes("WebGL2")\n    ? webGL2SupportMessage()\n    : \`Godot 运行环境缺少能力：\${missing}。请点“恢复/重载”，仍不行就换浏览器或升级系统 WebView。\`;\n  setGameStatus(message);\n}`, `function handleGodotRuntimeMessage(event) {\n  if (event.origin !== window.location.origin) return;\n  if (event.data?.type === "llr-godot-missing-features") {\n    const missing = Array.isArray(event.data.missing) ? event.data.missing.join("；") : "未知能力";\n    const message = missing.includes("WebGL2")\n      ? webGL2SupportMessage()\n      : \`Godot 运行环境缺少能力：\${missing}。请点“恢复/重载”，仍不行就换浏览器或升级系统 WebView。\`;\n    setGameStatus(message);\n    return;\n  }\n  if (event.data?.type === "llr-godot-pack-status") {\n    const patch = String(event.data.patch || "");\n    const pack = String(event.data.pack || "");\n    if (pack && patch && patch !== "applied") {\n      setGameStatus(\`自定义 PCK 已加载，但 ??? 必要场景补丁状态为 \${patch}。如果进不去 ???，请换回内置包或重新上传完整 PCK。\`);\n    }\n    return;\n  }\n  if (event.data?.type === "llr-godot-scene-checkpoint") {\n    writeResumeScene(event.data.scene);\n    return;\n  }\n  if (event.data?.type === "llr-godot-clear-checkpoint") {\n    clearResumeScene();\n  }\n}`, "expand Godot runtime message handler");
}
write("public/llr-mariorun/launcher.js", launcher);

let godotHtml = read("public/llr-mariorun/godot/index.html");
if (!godotHtml.includes('rel="preload" href="index.js?v=llr-secure-context-20260627"')) {
  godotHtml = replaceOnce(godotHtml, `<link rel="apple-touch-icon" href="index.apple-touch-icon.png"/>\n`, `<link rel="apple-touch-icon" href="index.apple-touch-icon.png"/>\n<link rel="preload" href="index.js?v=llr-secure-context-20260627" as="script" />\n`, "add Godot runtime preloads");
}
godotHtml = godotHtml.replace(`<link rel="preload" href="index.wasm" as="fetch" type="application/wasm" crossorigin="anonymous" />\n`, "");
if (!godotHtml.includes("llr-godot-pack-status")) {
  const replacement = `const responsePromise = nativeFetch(url.toString(), {\n\t\t\t\t\t...init,\n\t\t\t\t\tcache: init?.cache || 'default',\n\t\t\t\t\tcredentials: init?.credentials || 'same-origin'\n\t\t\t\t});\n\t\t\t\tresponsePromise.then((response) => {\n\t\t\t\t\ttry {\n\t\t\t\t\t\tif (window.parent && window.parent !== window) {\n\t\t\t\t\t\t\twindow.parent.postMessage({\n\t\t\t\t\t\t\t\ttype: 'llr-godot-pack-status',\n\t\t\t\t\t\t\t\tpack: selectedPack,\n\t\t\t\t\t\t\t\tpatch: response.headers.get('x-llr-extra-patch') || '',\n\t\t\t\t\t\t\t\tpackId: response.headers.get('x-llr-pack-id') || ''\n\t\t\t\t\t\t\t}, window.location.origin);\n\t\t\t\t\t\t}\n\t\t\t\t\t} catch {\n\t\t\t\t\t\t// Parent diagnostics are best-effort only.\n\t\t\t\t\t}\n\t\t\t\t});\n\t\t\t\treturn responsePromise;`;
  const pattern = /return nativeFetch\(url\.toString\(\), \{\s*\.\.\.init,\s*cache: 'no-store',\s*credentials: init\?\.credentials \|\| 'same-origin'\s*\}\);/;
  if (!pattern.test(godotHtml)) throw new Error("Missing block: add PCK patch diagnostics");
  godotHtml = godotHtml.replace(pattern, replacement);
}
godotHtml = godotHtml.replace(`cache: 'no-store',`, `cache: init?.cache || 'default',`);
write("public/llr-mariorun/godot/index.html", godotHtml);

let singleton = read("vendor/Legacy_SM63Redux/classes/global/singleton/singleton.gd");
if (!singleton.includes("func _llr_store_scene_checkpoint")) {
  singleton = replaceOnce(singleton, `\tif FileAccess.file_exists("user://controls.json"):\n\t\tload_input_map(get_input_map_json_saved())`, `\tif FileAccess.file_exists("user://controls.json"):\n\t\tload_input_map(get_input_map_json_saved())\n\tcall_deferred("_llr_resume_requested_scene")`, "resume scene from URL on ready");
  singleton = replaceOnce(singleton, `func _llr_return_to_main_menu():\n\tprepare_exit_game()`, `func _llr_store_scene_checkpoint(scene: String):\n\tif !OS.has_feature("web"):\n\t\treturn\n\tvar escaped = scene.replace("\\\\", "\\\\\\\\").replace("'", "\\\\'")\n\tJavaScriptBridge.eval("window.parent && window.parent.postMessage({type:'llr-godot-scene-checkpoint', scene:'" + escaped + "'}, window.location.origin)", true)\n\n\nfunc _llr_clear_scene_checkpoint():\n\tif OS.has_feature("web"):\n\t\tJavaScriptBridge.eval("window.parent && window.parent.postMessage({type:'llr-godot-clear-checkpoint'}, window.location.origin)", true)\n\n\nfunc _llr_resume_requested_scene():\n\tif !OS.has_feature("web"):\n\t\treturn\n\tvar scene = str(JavaScriptBridge.eval("(function(){return new URL(window.location.href).searchParams.get('resumeScene') || '';})()", true))\n\tif scene.begins_with("res://scenes/") and scene != "res://scenes/menus/title/main_menu/main_menu.tscn":\n\t\tget_tree().change_scene_to_file(scene)\n\n\nfunc _llr_return_to_main_menu():\n\t_llr_clear_scene_checkpoint()\n\tprepare_exit_game()`, "add scene checkpoint helpers");
  singleton = replaceOnce(singleton, `\t# Do the actual warp.\n\t# warning-ignore:RETURN_VALUE_DISCARDED\n\tget_tree().call_deferred("change_scene_to_file", path)`, `\t# Save target scene before changing scenes, so low-memory web reloads can resume.\n\t_llr_store_scene_checkpoint(path)\n\t# Do the actual warp.\n\t# warning-ignore:RETURN_VALUE_DISCARDED\n\tget_tree().call_deferred("change_scene_to_file", path)`, "store checkpoint before warp");
}
write("vendor/Legacy_SM63Redux/classes/global/singleton/singleton.gd", singleton);

let mainMenu = read("vendor/Legacy_SM63Redux/scenes/menus/title/main_menu/main_menu.gd");
if (!mainMenu.includes("llr-godot-scene-checkpoint")) {
  mainMenu = replaceOnce(mainMenu, `func _menu_to_scene(scene: String) -> void:\n\tget_parent().dampen = true`, `func _menu_to_scene(scene: String) -> void:\n\tif OS.has_feature("web"):\n\t\tvar escaped = scene.replace("\\\\", "\\\\\\\\").replace("'", "\\\\'")\n\t\tJavaScriptBridge.eval("window.parent && window.parent.postMessage({type:'llr-godot-scene-checkpoint', scene:'" + escaped + "'}, window.location.origin)", true)\n\tget_parent().dampen = true`, "store checkpoint before menu scene warp");
}
write("vendor/Legacy_SM63Redux/scenes/menus/title/main_menu/main_menu.gd", mainMenu);

console.log("llr runtime resume and PCK diagnostics patch complete");
