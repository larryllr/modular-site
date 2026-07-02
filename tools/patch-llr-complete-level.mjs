import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const completeScenePath = "vendor/Legacy_SM63Redux/scenes/levels/llr_complete/llr_complete_1.tscn";
const completeSceneResource = "res://scenes/levels/llr_complete/llr_complete_1.tscn";

function nodeBlock(name, parent, instanceId, lines = []) {
  return [`[node name="${name}" parent="${parent}" instance=ExtResource("${instanceId}")]`, ...lines, ""].join("\n");
}

function terrain(name, x, y, w, h = 30) {
  return nodeBlock(name, "Terrain", "1", [
    "z_index = 2",
    `position = Vector2(${x}, ${y})`,
    `polygon = PackedVector2Array(0, 0, ${w}, 0, ${w}, ${h}, 0, ${h})`
  ]);
}

function sign(name, x, y, text) {
  return nodeBlock(name, "Items/Signs", "5", [
    `position = Vector2(${x}, ${y})`,
    `lines = Array[String]([${text.map((line) => JSON.stringify(line)).join(", ")}])`
  ]);
}

function deco(name, id, x, y) {
  return nodeBlock(name, "Items/Decoration", id, [`position = Vector2(${x}, ${y})`]);
}

function coin(name, x, y, blue = false) {
  return nodeBlock(name, "Items/Coins", blue ? "11" : "10", [`position = Vector2(${x}, ${y})`]);
}

function goomba(name, x, y) {
  return nodeBlock(name, "Items/Enemies", "9", [`position = Vector2(${x}, ${y})`]);
}

function log(name, x, y, falling = false) {
  return nodeBlock(name, "Items/Logs", falling ? "14" : "13", [`position = Vector2(${x}, ${y})`]);
}

const platforms = [
  terrain("TrainingStep", 540, 115, 156, 30),
  terrain("FloatingGrass1", 900, 86, 168, 32),
  terrain("FloatingGrass2", 1210, 66, 180, 34),
  terrain("WaterBridgeLeft", 1880, 110, 112, 28),
  terrain("WaterBridgeMid", 2070, 84, 120, 28),
  terrain("WaterBridgeRight", 2290, 112, 128, 30),
  terrain("SkyIsland1", 2960, 82, 150, 30),
  terrain("SkyIsland2", 3220, 48, 156, 30),
  terrain("FinalLedge", 3660, 92, 240, 34),
  terrain("SecondWaterLeft", 6900, 154, 142, 28),
  terrain("SecondWaterMid", 7160, 116, 150, 30),
  terrain("SecondWaterRight", 7440, 126, 160, 30),
  terrain("HighClimb1", 7920, 130, 160, 30),
  terrain("HighClimb2", 8180, 92, 170, 30),
  terrain("HighClimb3", 8460, 58, 180, 32),
  terrain("HighClimb4", 8780, 82, 190, 32),
  terrain("GoalStep", 9280, 126, 260, 34)
].join("\n");

const signs = [
  sign("StartSign", 190, 178, [
    "[@n,LLR]这是新的完整关卡。一路向右，吃金币、躲敌人，跳过水坑和空中平台，到达终点光门。",
    "按跳跃、旋转、喷水和砸地都能用；手机摇杆现在也会按旋转后的画面坐标计算。"
  ]),
  sign("MidSign", 1810, 144, [
    "[@n,LLR]中段开始会有水坑和断桥。用短跳上台阶，用旋转补一点滞空。"
  ]),
  sign("RunoutSign", 6040, 160, [
    "[@n,LLR]前半段结束。后面是第二段流程：更长的地面、第二个水坑、爬升平台和终点冲刺。"
  ]),
  sign("ClimbSign", 7850, 205, [
    "[@n,LLR]这里开始向上爬。平台都比较宽，手机端不用极限跳，按金币路线走就行。"
  ]),
  sign("EndSign", 9460, 160, [
    "[@n,LLR]完整第一关到这里结束。拿到终点蓝金币后继续向右，穿过光门返回主菜单。"
  ])
].join("\n");

const decorations = [
  deco("TreeStart", "6", 40, 118),
  deco("TreeStart2", "7", 330, 138),
  deco("FlowersStart", "8", 420, 150),
  deco("TreeMid", "6", 1450, 128),
  deco("FlowersMid", "8", 1620, 178),
  deco("TreeLate", "7", 3370, 122),
  deco("TreeRunout", "6", 4930, 138),
  deco("FlowersRunout", "8", 5350, 178),
  deco("TreeSecondLake", "7", 6760, 176),
  deco("FlowersSecondLake", "8", 7620, 154),
  deco("TreeClimb", "6", 8340, 128),
  deco("TreeGoal", "7", 9340, 132)
].join("\n");

const coinPath = [
  ["Coin1", 370, 132], ["Coin2", 410, 124], ["Coin3", 450, 120], ["Coin4", 590, 88],
  ["Coin5", 940, 52], ["Coin6", 980, 44], ["Coin7", 1020, 52], ["Coin8", 1250, 32],
  ["Coin9", 1290, 24], ["Coin10", 1330, 32], ["Coin11", 1960, 72], ["Coin12", 2120, 48],
  ["Coin13", 2350, 74], ["Coin14", 3000, 48], ["Coin15", 3260, 16], ["Coin16", 3300, 8],
  ["Coin17", 3340, 16], ["RunoutCoin1", 4780, 176], ["RunoutCoin2", 4920, 136], ["RunoutCoin3", 5060, 126],
  ["RunoutCoin4", 5220, 146], ["RunoutCoin5", 5420, 154], ["SecondLakeCoin1", 6900, 112], ["SecondLakeCoin2", 7020, 92],
  ["SecondLakeCoin3", 7160, 78], ["SecondLakeCoin4", 7310, 84], ["SecondLakeCoin5", 7460, 96], ["ClimbCoin1", 7950, 92],
  ["ClimbCoin2", 8210, 54], ["ClimbCoin3", 8490, 22], ["ClimbCoin4", 8810, 48], ["DropCoin1", 9050, 122],
  ["DropCoin2", 9160, 136], ["GoalCoin1", 9340, 90], ["GoalCoin2", 9440, 82]
];
const coins = [
  ...coinPath.map(([name, x, y]) => coin(name, x, y)),
  coin("BlueCoinReward", 3770, 52, true),
  coin("SecondLakeBlueCoin", 7580, 82, true),
  coin("GoalBlueCoin", 9560, 108, true)
].join("\n");

const enemies = [
  goomba("Goomba1", 770, 152),
  goomba("Goomba2", 1570, 182),
  goomba("Goomba3", 2760, 150),
  goomba("Goomba4", 3550, 138),
  goomba("Goomba5", 5160, 158),
  goomba("Goomba6", 5700, 180),
  goomba("Goomba7", 6750, 202),
  goomba("Goomba8", 8150, 202),
  goomba("Goomba9", 9180, 180)
].join("\n");

const logs = [
  log("Log1", 540, 145),
  log("Log2", 570, 145),
  log("Log3", 600, 145),
  log("FallingLog", 2500, 120, true),
  log("SecondLog1", 6820, 184),
  log("SecondLog2", 7040, 180),
  log("SecondFallingLog", 7350, 112, true)
].join("\n");

const completeScene = `[gd_scene load_steps=16 format=3]

[ext_resource type="PackedScene" path="res://classes/solid/terrain/terrain_polygon.tscn" id="1"]
[ext_resource type="PackedScene" path="res://classes/player/player.tscn" id="2"]
[ext_resource type="PackedScene" path="res://scenes/levels/tutorial_1/bg/bg_t1.tscn" id="3"]
[ext_resource type="PackedScene" path="res://classes/zone/camera_area/camera_area.tscn" id="4"]
[ext_resource type="PackedScene" path="res://classes/interactable/sign/sign.tscn" id="5"]
[ext_resource type="PackedScene" path="res://classes/decorative/big_tree.tscn" id="6"]
[ext_resource type="PackedScene" path="res://classes/decorative/small_tree.tscn" id="7"]
[ext_resource type="PackedScene" path="res://classes/decorative/flowers.tscn" id="8"]
[ext_resource type="PackedScene" path="res://classes/entity/enemy/goomba/goomba.tscn" id="9"]
[ext_resource type="PackedScene" path="res://classes/pickup/coin/yellow/coin_yellow.tscn" id="10"]
[ext_resource type="PackedScene" path="res://classes/pickup/coin/blue/coin_blue.tscn" id="11"]
[ext_resource type="PackedScene" path="res://classes/water/water.tscn" id="12"]
[ext_resource type="PackedScene" path="res://classes/solid/log/log.tscn" id="13"]
[ext_resource type="PackedScene" path="res://classes/solid/log/log_fall.tscn" id="14"]
[ext_resource type="PackedScene" path="res://classes/zone/trigger/warpzone/warp_zone.tscn" id="15"]

[node name="Main" type="Node2D"]

[node name="BGT1" parent="." instance=ExtResource("3")]

[node name="CameraArea" parent="." instance=ExtResource("4")]
visible = false
polygon = PackedVector2Array(-64, -352, 9800, -352, 9800, 560, -64, 560)

[node name="Player" parent="." instance=ExtResource("2")]
position = Vector2(110, 153)

[node name="Terrain" type="Node2D" parent="."]

[node name="MainHills" parent="Terrain" instance=ExtResource("1")]
z_index = 1
polygon = PackedVector2Array(-320, 180, 0, 180, 260, 180, 430, 160, 670, 160, 820, 196, 1000, 212, 1160, 170, 1330, 158, 1510, 190, 1680, 190, 1830, 145, 2010, 145, 2160, 204, 2340, 218, 2530, 176, 2720, 156, 2920, 156, 3090, 206, 3270, 206, 3440, 146, 3620, 146, 3800, 176, 3980, 166, 4260, 166, 4560, 232, 4760, 218, 4960, 178, 5180, 168, 5400, 190, 5620, 190, 5840, 162, 6060, 162, 6280, 184, 6500, 184, 6720, 210, 6960, 210, 7180, 176, 7420, 156, 7660, 168, 7900, 210, 8120, 210, 8360, 182, 8600, 150, 8840, 150, 9060, 188, 9300, 188, 9560, 164, 9800, 164, 9800, 720, -320, 720)

${platforms}
[node name="Items" type="Node2D" parent="."]

[node name="Signs" type="Node2D" parent="Items"]

${signs}
[node name="Decoration" type="Node2D" parent="Items"]

${decorations}
[node name="Coins" type="Node2D" parent="Items"]

${coins}
[node name="Enemies" type="Node2D" parent="Items"]

${enemies}
[node name="Logs" type="Node2D" parent="Items"]

${logs}
[node name="Water" type="Node2D" parent="."]

[node name="Lake" parent="Water" instance=ExtResource("12")]
position = Vector2(2060, 206)
polygon = PackedVector2Array(0, 0, 390, 0, 390, 80, 320, 118, 120, 126, 0, 82)

[node name="SecondLake" parent="Water" instance=ExtResource("12")]
position = Vector2(6820, 226)
polygon = PackedVector2Array(0, 0, 860, 0, 860, 84, 720, 126, 180, 128, 0, 84)

[node name="WarpZone" parent="." instance=ExtResource("15")]
position = Vector2(9660, -120)
sweep_direction = Vector2(-1, 0)
spawn_location = Vector2(110, 153)
scene_path = "res://scenes/menus/title/main_menu/main_menu.tscn"
size = Vector2(48, 1800)
`;

mkdirSync(dirname(completeScenePath), { recursive: true });
writeFileSync(completeScenePath, completeScene, "utf8");

const mainMenuPath = "vendor/Legacy_SM63Redux/scenes/menus/title/main_menu/main_menu.gd";
let mainMenu = readFileSync(mainMenuPath, "utf8");
mainMenu = mainMenu.replace(
  `\t\t\t2:\n\t\t\t\t_menu_to_scene("res://scenes/levels/tutorial_1/tutorial_1_1.tscn")`,
  `\t\t\t2:\n\t\t\t\t_menu_to_scene("${completeSceneResource}")`
);
mainMenu = mainMenu.replace(
  `\t\t\t2:\n\t\t\t\t_show_extras_message()`,
  `\t\t\t2:\n\t\t\t\t_menu_to_scene("${completeSceneResource}")`
);
mainMenu = mainMenu.replaceAll("Extras 已改为稳定试玩关卡", "Extras 已改为完整内置关卡");
mainMenu = mainMenu.replaceAll("避免加载不完整测试场景", "进入 LLR Complete 1");
writeFileSync(mainMenuPath, mainMenu, "utf8");

const controlsPatchPath = "tools/patch-llr-mariorun-controls.mjs";
let controlsPatch = readFileSync(controlsPatchPath, "utf8");
controlsPatch = controlsPatch.replaceAll(
  `res://scenes/levels/tutorial_1/tutorial_1_1.tscn`,
  completeSceneResource
);
controlsPatch = controlsPatch.replaceAll("Extras 已改为稳定试玩关卡", "Extras 已改为完整内置关卡");
controlsPatch = controlsPatch.replaceAll("避免加载不完整测试场景", "进入 LLR Complete 1");
writeFileSync(controlsPatchPath, controlsPatch, "utf8");

const workerPath = "src/index.ts";
let worker = readFileSync(workerPath, "utf8");
if (!worker.includes(completeSceneResource)) {
  worker = worker.replace(
    `  "res://classes/global/singleton/singleton.gdc"\n];`,
    `  "res://classes/global/singleton/singleton.gdc",\n  "${completeSceneResource}"\n];`
  );
  writeFileSync(workerPath, worker, "utf8");
}

const testsPath = "tests/llr-mariorun.test.mjs";
let tests = readFileSync(testsPath, "utf8");
tests = tests.replace(
  `test("llr-mariorun Godot pack keeps Extras on a stable level and rescues void falls", () => {`,
  `test("llr-mariorun Godot pack keeps Extras on a complete built-in level and rescues void falls", () => {`
);
if (!tests.includes(`res://scenes/levels/llr_complete/llr_complete_1.tscn`)) {
  tests = tests.replace(
    `  assert.ok(entries.includes("res://classes/global/singleton/singleton.gdc"));`,
    `  assert.ok(entries.includes("res://classes/global/singleton/singleton.gdc"));\n  assert.ok(entries.includes("res://scenes/levels/llr_complete/llr_complete_1.tscn"));`
  );
  writeFileSync(testsPath, tests, "utf8");
}

console.log("llr complete level patch complete");
