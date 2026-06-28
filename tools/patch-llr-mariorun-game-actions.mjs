import { readFileSync, writeFileSync } from "node:fs";

function read(path) { return readFileSync(path, "utf8"); }
function write(path, text) { writeFileSync(path, text); }
function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`Missing block: ${label}`);
  return text.replace(from, to);
}

let launcher = read("public/llr-mariorun/launcher.js");
if (!launcher.includes("function sendGameCommand")) {
  launcher = replaceOnce(
    launcher,
    `function returnToLauncher(message = "已返回开始前选择。") {\n  resetVirtualInputs();\n  window.clearTimeout(runtimeReloadTimer);\n  if (frame) frame.src = "about:blank";\n  document.body.classList.remove("game-has-launched");\n  document.body.classList.remove("is-landscape-fullscreen");\n  document.body.classList.remove("is-forced-landscape");\n  fullscreenOrientationLocked = false;\n  try {\n    screen.orientation?.unlock?.();\n  } catch {\n    // Some browsers throw when orientation was not locked.\n  }\n  setGameStatus(message);\n  loadManifestStatus();\n}\n\nfunction rescueGameRuntime() {\n  if (isFrameBlank()) {\n    startSelectedGame();\n    return;\n  }\n  recoverGameRuntime("正在从天上回到场地…");\n}\n`,
    `function sendGameCommand(command, message = "正在通过游戏内部返回主菜单…") {\n  if (isFrameBlank()) {\n    setGameStatus("游戏尚未启动，请先开始游戏。");\n    return;\n  }\n  resetVirtualInputs();\n  focusGame();\n  try {\n    const target = frame?.contentWindow;\n    if (!target) return;\n    target.__llrPendingGameCommand = command;\n    if (typeof target.__llrReceiveGameCommand === "function") {\n      target.__llrReceiveGameCommand(command);\n    }\n    target.postMessage({ type: "llr-game-command", command }, window.location.origin);\n    setGameStatus(message);\n  } catch {\n    setGameStatus("无法连接游戏内部命令，请点暂停菜单返回主菜单。");\n  }\n}\n\nfunction returnToLauncher(message = "正在通过游戏内部返回主菜单…") {\n  sendGameCommand("main_menu", message);\n}\n\nfunction rescueGameRuntime() {\n  sendGameCommand("main_menu", "正在通过游戏内部回到主菜单…");\n}\n`,
    "replace outer reload actions with internal game commands"
  );
  write("public/llr-mariorun/launcher.js", launcher);
}

let singleton = read("vendor/Legacy_SM63Redux/classes/global/singleton/singleton.gd");
if (!singleton.includes("func _llr_consume_web_command")) {
  singleton = replaceOnce(
    singleton,
    `func _process(_delta):\n\tvar sfx = AudioServer.get_bus_index("SFX")`,
    `func _process(_delta):\n\t_llr_handle_web_command()\n\tvar sfx = AudioServer.get_bus_index("SFX")`,
    "call web command handler"
  );
  singleton = replaceOnce(
    singleton,
    `\tif Input.is_action_just_pressed("volume_music+"):\n\t\tAudioServer.set_bus_volume_db(music, AudioServer.get_bus_volume_db(music) + 1)\n\n\n# Resets game state and preps to return to a menu.`,
    `\tif Input.is_action_just_pressed("volume_music+"):\n\t\tAudioServer.set_bus_volume_db(music, AudioServer.get_bus_volume_db(music) + 1)\n\n\nfunc _llr_consume_web_command() -> String:\n\tif !OS.has_feature("web"):\n\t\treturn ""\n\tvar command = JavaScriptBridge.eval("(function(){var command = window.__llrPendingGameCommand || ''; window.__llrPendingGameCommand = ''; return command;})()", true)\n\treturn str(command)\n\n\nfunc _llr_handle_web_command():\n\tmatch _llr_consume_web_command():\n\t\t"main_menu":\n\t\t\t_llr_return_to_main_menu()\n\t\t_:\n\t\t\tpass\n\n\nfunc _llr_return_to_main_menu():\n\tprepare_exit_game()\n\tpause_menu = false\n\tget_tree().paused = false\n\tset_pause("console", false)\n\tset_pause("feedback", false)\n\tget_tree().change_scene_to_file("res://scenes/menus/title/main_menu/main_menu.tscn")\n\n\n# Resets game state and preps to return to a menu.`,
    "add web command handler"
  );
  write("vendor/Legacy_SM63Redux/classes/global/singleton/singleton.gd", singleton);
}

console.log("llr-mariorun internal game actions patch complete");
