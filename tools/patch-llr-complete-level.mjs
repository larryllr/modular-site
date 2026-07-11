import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const projectRoot = "vendor/Legacy_SM63Redux";
const tutorialRoot = `${projectRoot}/scenes/levels/tutorial_1`;
const extrasRoot = `${projectRoot}/scenes/levels/llr_complete`;
const mainMenuPath = `${projectRoot}/scenes/menus/title/main_menu/main_menu.gd`;
const mainMenuResource = "res://scenes/menus/title/main_menu/main_menu.tscn";
const deathPlaneResource = "res://classes/zone/trigger/death_plane/death_plane.tscn";

const stages = [
  {
    id: 1,
    source: 1,
    title: "1 林间热身",
    description: "移动、跳跃、游泳、木桩、金币与基础敌人",
    signPosition: "Vector2(520, 148)"
  },
  {
    id: 2,
    source: 2,
    title: "2 爆弹湖岸",
    description: "爆弹、可破坏箱、水域与木制平台",
    signPosition: "Vector2(170, 176)"
  },
  {
    id: 3,
    source: 3,
    title: "3 蘑菇高地",
    description: "蘑菇平台、FLUDD、飞行敌人与攀登路线",
    signPosition: "Vector2(250, 204)"
  },
  {
    id: 4,
    source: 4,
    title: "4 云端机关",
    description: "云平台、旋转机关、倾斜平台与高空路线",
    signPosition: "Vector2(120, 202)"
  },
  {
    id: 5,
    source: 2,
    title: "5 爆弹乱斗",
    description: "加强版湖岸，增加爆弹、箱体和移动落点",
    signPosition: "Vector2(170, 176)",
    remix: "bobomb-rush"
  },
  {
    id: 6,
    source: 4,
    title: "6 天空终极赛",
    description: "加强版云端机关，混合飞行敌人、金币与补给",
    signPosition: "Vector2(120, 202)",
    remix: "sky-finale"
  }
].map((stage) => ({
  ...stage,
  resource: `res://scenes/levels/llr_complete/llr_complete_${stage.id}.tscn`,
  output: `${extrasRoot}/llr_complete_${stage.id}.tscn`
}));

function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) {
    throw new Error(`Missing block while patching ${label}`);
  }
  return text.replace(from, to);
}

function incrementLoadSteps(text) {
  return text.replace(
    /^\[gd_scene load_steps=(\d+) format=3([^\]]*)\]/,
    (_, count, suffix) => `[gd_scene load_steps=${Number(count) + 1} format=3${suffix}]`
  );
}

function addExternalResource(text, path, id) {
  text = incrementLoadSteps(text);
  const line = `[ext_resource type="PackedScene" path="${path}" id="${id}"]`;
  const firstBodyIndex = Math.min(
    ...["\n[sub_resource", "\n[node "]
      .map((marker) => text.indexOf(marker))
      .filter((index) => index >= 0)
  );
  if (!Number.isFinite(firstBodyIndex)) {
    throw new Error(`Unable to find resource insertion point for ${path}`);
  }
  return `${text.slice(0, firstBodyIndex)}\n${line}\n${text.slice(firstBodyIndex)}`;
}

function setBlockProperty(block, property, value) {
  const pattern = new RegExp(`^${property} = .*$`, "m");
  if (pattern.test(block)) {
    return block.replace(pattern, `${property} = ${value}`);
  }
  return `${block.trimEnd()}\n${property} = ${value}\n`;
}

function rewriteWarpZones(text, stage, playerPosition) {
  return text.replace(
    /\[node name="(WarpZone[^"]*)"[\s\S]*?(?=\n\[node |\s*$)/g,
    (block, nodeName) => {
      const isSkyRecovery = stage.source === 4 && nodeName === "WarpZone3";
      let next = setBlockProperty(
        block,
        "scene_path",
        JSON.stringify(isSkyRecovery ? stage.resource : mainMenuResource)
      );
      next = setBlockProperty(
        next,
        "spawn_location",
        isSkyRecovery ? `Vector2(${playerPosition})` : "Vector2(110, 153)"
      );
      return next.trimEnd();
    }
  );
}

function stageSign(stage, signId) {
  const parent = stage.source === 2 ? "Items" : "Items/Signs";
  const lines = [
    `[@n,Extras]${stage.title}`,
    `${stage.description}。本关复用 Story Mode 已验证的完整交互；到达终点后返回主菜单。`
  ];
  return `

[node name="LLRStageSign" parent="${parent}" instance=ExtResource("${signId}")]
position = ${stage.signPosition}
lines = Array[String]([${lines.map((line) => JSON.stringify(line)).join(", ")}])
`;
}

function deathPlane() {
  return `

[node name="LLRDeathPlane" parent="." instance=ExtResource("llr_death")]
visible = false
position = Vector2(0, 900)
polygon = PackedVector2Array(-5000, 0, 12000, 0, 12000, 1200, -5000, 1200)
`;
}

function skyFinishWarp(warpId) {
  return `

[node name="LLRFinishWarp" parent="." instance=ExtResource("${warpId}")]
position = Vector2(1050, -760)
sweep_direction = Vector2(-1, 0)
spawn_location = Vector2(110, 153)
scene_path = "${mainMenuResource}"
size = Vector2(56, 760)
`;
}

function bobombRushRemix() {
  return `

[node name="LLRBreakableBox1" parent="Items" instance=ExtResource("13")]
position = Vector2(560, 176)

[node name="LLRBreakableBox2" parent="Items" instance=ExtResource("13")]
position = Vector2(592, 176)

[node name="LLRBreakableBox3" parent="Items" instance=ExtResource("13")]
position = Vector2(576, 144)

[node name="LLRWoodenPlatform1" parent="Items" instance=ExtResource("19")]
position = Vector2(1260, 112)

[node name="LLRWoodenPlatform2" parent="Items" instance=ExtResource("19")]
position = Vector2(1450, 82)

[node name="LLRBobomb1" parent="Items" instance=ExtResource("15")]
position = Vector2(540, 184)

[node name="LLRBobomb2" parent="Items" instance=ExtResource("15")]
position = Vector2(620, 184)

[node name="LLRBobomb3" parent="Items" instance=ExtResource("15")]
position = Vector2(1280, 208)

[node name="LLRBobomb4" parent="Items" instance=ExtResource("15")]
position = Vector2(1480, 218)
`;
}

function skyFinaleRemix() {
  return `

[node name="LLRCloud1" parent="Items/Clouds" instance=ExtResource("17")]
position = Vector2(675, -646)
width = 2

[node name="LLRCloud2" parent="Items/Clouds" instance=ExtResource("17")]
position = Vector2(790, -684)
width = 2

[node name="LLRPivot1" parent="Items/Pivots" instance=ExtResource("15")]
position = Vector2(700, -602)
count = 2

[node name="LLRParakoopa1" parent="Items/Enemy" instance=ExtResource("35")]
position = Vector2(160, -408)

[node name="LLRParakoopa2" parent="Items/Enemy" instance=ExtResource("35")]
position = Vector2(520, -622)

[node name="LLRBottle1" parent="Items/Bottles" instance=ExtResource("16")]
position = Vector2(690, -682)

[node name="LLRCoin1" parent="Items/Coins" instance=ExtResource("24")]
position = Vector2(650, -650)

[node name="LLRCoin2" parent="Items/Coins" instance=ExtResource("24")]
position = Vector2(700, -690)

[node name="LLRCoin3" parent="Items/Coins" instance=ExtResource("24")]
position = Vector2(750, -710)

[node name="LLRCoin4" parent="Items/Coins" instance=ExtResource("24")]
position = Vector2(800, -690)

[node name="LLRCoin5" parent="Items/Coins" instance=ExtResource("24")]
position = Vector2(850, -650)
`;
}

function buildStage(stage) {
  const sourcePath = `${tutorialRoot}/tutorial_1_${stage.source}.tscn`;
  let scene = readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n");
  const playerPosition = scene.match(
    /\[node name="Player"[^\n]*\]\nposition = Vector2\(([^)]+)\)/
  )?.[1];
  const signId = scene.match(
    /\[ext_resource type="PackedScene"[^\n]*path="res:\/\/classes\/interactable\/sign\/sign\.tscn" id="([^"]+)"\]/
  )?.[1];
  const warpId = scene.match(
    /\[ext_resource type="PackedScene"[^\n]*path="res:\/\/classes\/zone\/trigger\/warpzone\/warp_zone\.tscn" id="([^"]+)"\]/
  )?.[1];

  if (!playerPosition || !signId || !warpId) {
    throw new Error(`Missing Story Mode reference resources for Extras stage ${stage.id}`);
  }

  scene = addExternalResource(scene, deathPlaneResource, "llr_death");
  scene = rewriteWarpZones(scene, stage, playerPosition);
  scene = `${scene.trimEnd()}${stageSign(stage, signId)}${deathPlane()}`;

  if (stage.source === 4) {
    scene += skyFinishWarp(warpId);
  }
  if (stage.remix === "bobomb-rush") {
    scene += bobombRushRemix();
  }
  if (stage.remix === "sky-finale") {
    scene += skyFinaleRemix();
  }

  mkdirSync(dirname(stage.output), { recursive: true });
  writeFileSync(stage.output, `${scene.trimEnd()}\n`, "utf8");
}

const extrasDeclarations = `

const LLR_EXTRA_LEVELS = [
${stages.map((stage) => `\t{"title": "${stage.title}", "description": "${stage.description}", "path": "${stage.resource}"}`).join(",\n")}
]

var show_extras = false
var extras_control: ColorRect
var extras_first_button: Button
`;

const extrasMethods = `

func _ready() -> void:
\t_build_extras_menu()


func _build_extras_menu() -> void:
\textras_control = ColorRect.new()
\textras_control.name = "LLRExtrasMenu"
\textras_control.color = Color(0.025, 0.065, 0.11, 0.96)
\textras_control.mouse_filter = Control.MOUSE_FILTER_STOP
\textras_control.z_index = 100
\tadd_child(extras_control)
\textras_control.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
\textras_control.visible = false

\tvar center := CenterContainer.new()
\textras_control.add_child(center)
\tcenter.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

\tvar panel := PanelContainer.new()
\tpanel.custom_minimum_size = Vector2(550, 326)
\tcenter.add_child(panel)

\tvar margin := MarginContainer.new()
\tfor side in ["margin_left", "margin_top", "margin_right", "margin_bottom"]:
\t\tmargin.add_theme_constant_override(side, 14)
\tpanel.add_child(margin)

\tvar column := VBoxContainer.new()
\tcolumn.add_theme_constant_override("separation", 9)
\tmargin.add_child(column)

\tvar title := Label.new()
\ttitle.text = "老师快跑 Extras"
\ttitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
\ttitle.add_theme_font_size_override("font_size", 22)
\tcolumn.add_child(title)

\tvar hint := Label.new()
\thint.text = "选择关卡（键盘、手柄、虚拟按键和触屏均可操作）"
\thint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
\thint.modulate = Color(0.78, 0.88, 1.0, 1.0)
\tcolumn.add_child(hint)

\tvar grid := GridContainer.new()
\tgrid.columns = 2
\tgrid.add_theme_constant_override("h_separation", 10)
\tgrid.add_theme_constant_override("v_separation", 8)
\tcolumn.add_child(grid)

\tfor level in LLR_EXTRA_LEVELS:
\t\tvar button := Button.new()
\t\tbutton.text = level["title"]
\t\tbutton.tooltip_text = level["description"]
\t\tbutton.custom_minimum_size = Vector2(248, 42)
\t\tbutton.focus_mode = Control.FOCUS_ALL
\t\tbutton.pressed.connect(_launch_extra_level.bind(level["path"]))
\t\tgrid.add_child(button)
\t\tif extras_first_button == null:
\t\t\textras_first_button = button

\tvar description := Label.new()
\tdescription.text = "六关均采用 Story Mode 已验证的地形、敌人、机关、FLUDD 与镜头逻辑。"
\tdescription.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
\tdescription.modulate = Color(1.0, 0.86, 0.48, 1.0)
\tcolumn.add_child(description)

\tvar extras_back_button := Button.new()
\textras_back_button.text = "返回主菜单"
\textras_back_button.custom_minimum_size = Vector2(0, 38)
\textras_back_button.pressed.connect(_close_extras_menu)
\tcolumn.add_child(extras_back_button)


func _open_extras_menu() -> void:
\tSingleton.get_node("SFX/Confirm").play()
\tshow_options = false
\tshow_extras = true
\textras_control.visible = true
\textras_control.modulate.a = 0
\tcall_deferred("_focus_extras_first_button")


func _focus_extras_first_button() -> void:
\tif show_extras and is_instance_valid(extras_first_button):
\t\textras_first_button.grab_focus()


func _close_extras_menu() -> void:
\tif !show_extras:
\t\treturn
\tSingleton.get_node("SFX/Back").play()
\tshow_extras = false
\textras_control.visible = false
\tstory.grab_focus()


func _launch_extra_level(scene: String) -> void:
\tshow_extras = false
\textras_control.visible = false
\t_menu_to_scene(scene)
`;

function patchMainMenu() {
  let menu = readFileSync(mainMenuPath, "utf8").replace(/\r\n/g, "\n");

  menu = menu.replace(
    /\t\t\t2:\n\t\t\t\t(?:_menu_to_scene\("res:\/\/scenes\/levels\/llr_complete\/llr_complete_1\.tscn"\)|_show_extras_message\(\))/,
    "\t\t\t2:\n\t\t\t\t_open_extras_menu()"
  );

  if (!menu.includes("const LLR_EXTRA_LEVELS = [")) {
    menu = replaceOnce(
      menu,
      "@onready var preview_orb = $PreviewOrb\n",
      `@onready var preview_orb = $PreviewOrb\n${extrasDeclarations}`,
      "Extras declarations"
    );
  } else {
    menu = menu.replace(
      /const LLR_EXTRA_LEVELS = \[[\s\S]*?\n\]\n\nvar show_extras = false\nvar extras_control: ColorRect\nvar extras_first_button: Button/,
      extrasDeclarations.trim()
    );
  }

  if (!menu.includes("func _build_extras_menu() -> void:")) {
    menu = replaceOnce(
      menu,
      "\n\nfunc _cycle_increment(increment_direction: int) -> void:",
      `${extrasMethods}\n\nfunc _cycle_increment(increment_direction: int) -> void:`,
      "Extras methods"
    );
  }
  menu = menu.replace(/\ttitle\.text = "老师快跑[^"]*Extras"/, '\ttitle.text = "老师快跑 Extras"');

  if (!menu.includes("\t\textras_control.visible = show_extras")) {
    menu = replaceOnce(
      menu,
      "\t\toptions_control.visible = show_options\n\t\toptions_menu.visible = show_options\n",
      "\t\toptions_control.visible = show_options\n\t\toptions_menu.visible = show_options\n\t\textras_control.visible = show_extras\n",
      "Extras visibility"
    );
  }

  if (!menu.includes("\t\telif show_extras:")) {
    menu = replaceOnce(
      menu,
      `\t\t\tif Input.is_action_just_pressed("ui_cancel"):
\t\t\t\tshow_options = false
\t\t\t\tSingleton.get_node("SFX/Back").play()
\t\telse:
\t\t\tfor node in get_tree().get_nodes_in_group("menu_hide"):`,
      `\t\t\tif Input.is_action_just_pressed("ui_cancel"):
\t\t\t\tshow_options = false
\t\t\t\tSingleton.get_node("SFX/Back").play()
\t\telif show_extras:
\t\t\tfor node in get_tree().get_nodes_in_group("menu_hide"):
\t\t\t\tnode.modulate.a = max(node.modulate.a - 0.125 * dmod, 0)
\t\t\textras_control.modulate.a = min(extras_control.modulate.a + 0.16 * dmod, 1)
\t\t\tif Input.is_action_just_pressed("ui_cancel"):
\t\t\t\t_close_extras_menu()
\t\telse:
\t\t\tfor node in get_tree().get_nodes_in_group("menu_hide"):`,
      "Extras process branch"
    );
  }

  menu = menu.replace(
    "func _show_extras_message() -> void:\n" +
      "\tSingleton.get_node(\"SFX/Back\").play()\n" +
      "\tSingleton.log_msg(\"Extras 已改为完整内置关卡；进入 LLR Complete 1。\")\n" +
      "\tif OS.has_feature(\"web\"):\n" +
      "\t\tJavaScriptBridge.eval(\"window.parent.__llrShowGameNotice && window.parent.__llrShowGameNotice('Extras 已改为完整内置关卡。')\", true)\n\n\n",
    ""
  );

  menu = menu.replace(
    "func _touch_cycle(step):\n\tif !show_options:",
    "func _touch_cycle(step):\n\tif !show_options and !show_extras:"
  );

  if (!menu.includes("\t\t\t2:\n\t\t\t\t_open_extras_menu()")) {
    throw new Error("Extras menu route was not patched");
  }

  writeFileSync(mainMenuPath, menu, "utf8");
}

for (const stage of stages) {
  buildStage(stage);
}
patchMainMenu();

console.log(`llr Extras patch complete: ${stages.length} stages and level selector`);
