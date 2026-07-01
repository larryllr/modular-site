import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const completeScenePath = "vendor/Legacy_SM63Redux/scenes/levels/llr_complete/llr_complete_1.tscn";
const completeSceneResource = "res://scenes/levels/llr_complete/llr_complete_1.tscn";

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
polygon = PackedVector2Array(-64, -352, 4400, -352, 4400, 560, -64, 560)

[node name="Player" parent="." instance=ExtResource("2")]
position = Vector2(110, 153)

[node name="Terrain" type="Node2D" parent="."]

[node name="MainHills" parent="Terrain" instance=ExtResource("1")]
z_index = 1
polygon = PackedVector2Array(-320, 180, 0, 180, 260, 180, 430, 160, 670, 160, 820, 196, 1000, 212, 1160, 170, 1330, 158, 1510, 190, 1680, 190, 1830, 145, 2010, 145, 2160, 204, 2340, 218, 2530, 176, 2720, 156, 2920, 156, 3090, 206, 3270, 206, 3440, 146, 3620, 146, 3800, 176, 3980, 166, 4260, 166, 4560, 232, 4560, 720, -320, 720)

[node name="TrainingStep" parent="Terrain" instance=ExtResource("1")]
z_index = 2
position = Vector2(540, 115)
polygon = PackedVector2Array(0, 0, 156, 0, 156, 30, 0, 30)

[node name="FloatingGrass1" parent="Terrain" instance=ExtResource("1")]
z_index = 2
position = Vector2(900, 86)
polygon = PackedVector2Array(0, 0, 168, 0, 168, 32, 0, 32)

[node name="FloatingGrass2" parent="Terrain" instance=ExtResource("1")]
z_index = 2
position = Vector2(1210, 66)
polygon = PackedVector2Array(0, 0, 180, 0, 180, 34, 0, 34)

[node name="WaterBridgeLeft" parent="Terrain" instance=ExtResource("1")]
z_index = 2
position = Vector2(1880, 110)
polygon = PackedVector2Array(0, 0, 112, 0, 112, 28, 0, 28)

[node name="WaterBridgeMid" parent="Terrain" instance=ExtResource("1")]
z_index = 2
position = Vector2(2070, 84)
polygon = PackedVector2Array(0, 0, 120, 0, 120, 28, 0, 28)

[node name="WaterBridgeRight" parent="Terrain" instance=ExtResource("1")]
z_index = 2
position = Vector2(2290, 112)
polygon = PackedVector2Array(0, 0, 128, 0, 128, 30, 0, 30)

[node name="SkyIsland1" parent="Terrain" instance=ExtResource("1")]
z_index = 2
position = Vector2(2960, 82)
polygon = PackedVector2Array(0, 0, 150, 0, 150, 30, 0, 30)

[node name="SkyIsland2" parent="Terrain" instance=ExtResource("1")]
z_index = 2
position = Vector2(3220, 48)
polygon = PackedVector2Array(0, 0, 156, 0, 156, 30, 0, 30)

[node name="FinalLedge" parent="Terrain" instance=ExtResource("1")]
z_index = 2
position = Vector2(3660, 92)
polygon = PackedVector2Array(0, 0, 240, 0, 240, 34, 0, 34)

[node name="Items" type="Node2D" parent="."]

[node name="Signs" type="Node2D" parent="Items"]

[node name="StartSign" parent="Items/Signs" instance=ExtResource("5")]
position = Vector2(190, 178)
lines = Array[String](["[@n,LLR]这是新的完整关卡。一路向右，吃金币、躲敌人，跳过水坑和空中平台，到达终点光门。", "按跳跃、旋转、喷水和砸地都能用；手机摇杆现在也会按旋转后的画面坐标计算。"])

[node name="MidSign" parent="Items/Signs" instance=ExtResource("5")]
position = Vector2(1810, 144)
lines = Array[String](["[@n,LLR]中段开始会有水坑和断桥。用短跳上台阶，用旋转补一点滞空。"])

[node name="EndSign" parent="Items/Signs" instance=ExtResource("5")]
position = Vector2(3900, 164)
lines = Array[String](["[@n,LLR]终点到了。穿过右侧光门会回到主菜单。"])

[node name="Decoration" type="Node2D" parent="Items"]

[node name="TreeStart" parent="Items/Decoration" instance=ExtResource("6")]
position = Vector2(40, 118)

[node name="TreeStart2" parent="Items/Decoration" instance=ExtResource("7")]
position = Vector2(330, 138)

[node name="FlowersStart" parent="Items/Decoration" instance=ExtResource("8")]
position = Vector2(420, 150)

[node name="TreeMid" parent="Items/Decoration" instance=ExtResource("6")]
position = Vector2(1450, 128)

[node name="FlowersMid" parent="Items/Decoration" instance=ExtResource("8")]
position = Vector2(1620, 178)

[node name="TreeLate" parent="Items/Decoration" instance=ExtResource("7")]
position = Vector2(3370, 122)

[node name="Coins" type="Node2D" parent="Items"]

[node name="Coin1" parent="Items/Coins" instance=ExtResource("10")]
position = Vector2(370, 132)

[node name="Coin2" parent="Items/Coins" instance=ExtResource("10")]
position = Vector2(410, 124)

[node name="Coin3" parent="Items/Coins" instance=ExtResource("10")]
position = Vector2(450, 120)

[node name="Coin4" parent="Items/Coins" instance=ExtResource("10")]
position = Vector2(590, 88)

[node name="Coin5" parent="Items/Coins" instance=ExtResource("10")]
position = Vector2(940, 52)

[node name="Coin6" parent="Items/Coins" instance=ExtResource("10")]
position = Vector2(980, 44)

[node name="Coin7" parent="Items/Coins" instance=ExtResource("10")]
position = Vector2(1020, 52)

[node name="Coin8" parent="Items/Coins" instance=ExtResource("10")]
position = Vector2(1250, 32)

[node name="Coin9" parent="Items/Coins" instance=ExtResource("10")]
position = Vector2(1290, 24)

[node name="Coin10" parent="Items/Coins" instance=ExtResource("10")]
position = Vector2(1330, 32)

[node name="Coin11" parent="Items/Coins" instance=ExtResource("10")]
position = Vector2(1960, 72)

[node name="Coin12" parent="Items/Coins" instance=ExtResource("10")]
position = Vector2(2120, 48)

[node name="Coin13" parent="Items/Coins" instance=ExtResource("10")]
position = Vector2(2350, 74)

[node name="Coin14" parent="Items/Coins" instance=ExtResource("10")]
position = Vector2(3000, 48)

[node name="Coin15" parent="Items/Coins" instance=ExtResource("10")]
position = Vector2(3260, 16)

[node name="Coin16" parent="Items/Coins" instance=ExtResource("10")]
position = Vector2(3300, 8)

[node name="Coin17" parent="Items/Coins" instance=ExtResource("10")]
position = Vector2(3340, 16)

[node name="BlueCoinReward" parent="Items/Coins" instance=ExtResource("11")]
position = Vector2(3770, 52)

[node name="Enemies" type="Node2D" parent="Items"]

[node name="Goomba1" parent="Items/Enemies" instance=ExtResource("9")]
position = Vector2(770, 152)

[node name="Goomba2" parent="Items/Enemies" instance=ExtResource("9")]
position = Vector2(1570, 182)

[node name="Goomba3" parent="Items/Enemies" instance=ExtResource("9")]
position = Vector2(2760, 150)

[node name="Goomba4" parent="Items/Enemies" instance=ExtResource("9")]
position = Vector2(3550, 138)

[node name="Logs" type="Node2D" parent="Items"]

[node name="Log1" parent="Items/Logs" instance=ExtResource("13")]
position = Vector2(540, 145)

[node name="Log2" parent="Items/Logs" instance=ExtResource("13")]
position = Vector2(570, 145)

[node name="Log3" parent="Items/Logs" instance=ExtResource("13")]
position = Vector2(600, 145)

[node name="FallingLog" parent="Items/Logs" instance=ExtResource("14")]
position = Vector2(2500, 120)

[node name="Water" type="Node2D" parent="."]

[node name="Lake" parent="Water" instance=ExtResource("12")]
position = Vector2(2060, 206)
polygon = PackedVector2Array(0, 0, 390, 0, 390, 80, 320, 118, 120, 126, 0, 82)

[node name="WarpZone" parent="." instance=ExtResource("15")]
position = Vector2(4312, -120)
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
