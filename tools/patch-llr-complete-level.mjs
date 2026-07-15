import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { buildV3StageScene, V3_STAGE_BLUEPRINTS } from "./llr-level-v3.mjs";
import { buildV4StageOneScene, V4_STAGE_ONE_BLUEPRINT } from "./llr-level-v4.mjs";
import { buildV4StageTwoScene, V4_STAGE_TWO_BLUEPRINT } from "./llr-level-v4-stage2.mjs";
import { buildV4StageThreeScene, V4_STAGE_THREE_BLUEPRINT } from "./llr-level-v4-stage3.mjs";
import { buildV4StageFourScene, V4_STAGE_FOUR_BLUEPRINT } from "./llr-level-v4-stage4.mjs";
import { buildV4StageFiveScene, V4_STAGE_FIVE_BLUEPRINT } from "./llr-level-v4-stage5.mjs";
import { buildV4StageSixScene, V4_STAGE_SIX_BLUEPRINT } from "./llr-level-v4-stage6.mjs";
import { buildV4StageSevenScene, V4_STAGE_SEVEN_BLUEPRINT } from "./llr-level-v4-stage7.mjs";
import { buildV4StageEightScene, V4_STAGE_EIGHT_BLUEPRINT } from "./llr-level-v4-stage8.mjs";
import { buildV4StageNineScene, V4_STAGE_NINE_BLUEPRINT } from "./llr-level-v4-stage9.mjs";
import { buildV4StageTenScene, V4_STAGE_TEN_BLUEPRINT } from "./llr-level-v4-stage10.mjs";

const projectRoot = "vendor/Legacy_SM63Redux";
const extrasRoot = `${projectRoot}/scenes/levels/llr_complete`;
const mainMenuPath = `${projectRoot}/scenes/menus/title/main_menu/main_menu.gd`;
const mainMenuResource = "res://scenes/menus/title/main_menu/main_menu.tscn";
const designerItemsLegacyPath = `${projectRoot}/scenes/menus/level_designer/items.xml.tres`;
const designerItemsPath = `${projectRoot}/scenes/menus/level_designer/items.xml`;
const designerScriptPath = `${projectRoot}/scenes/menus/level_designer/ld_main.gd`;
const designerMusicPath = `${projectRoot}/scenes/menus/level_designer/music.gd`;
const designerSerializerPath = `${projectRoot}/scenes/menus/level_designer/serializers/serializer.gd`;
const singletonScenePath = `${projectRoot}/classes/global/singleton/singleton.tscn`;
const musicScriptPath = `${projectRoot}/classes/global/singleton/music.gd`;
const exportPresetsPath = `${projectRoot}/export_presets.cfg`;
const shuttleRoot = `${projectRoot}/classes/solid/llr_shuttle`;
const shuttleScriptPath = `${shuttleRoot}/llr_shuttle.gd`;
const shuttleScenePath = `${shuttleRoot}/llr_shuttle.tscn`;
const springRoot = `${projectRoot}/classes/solid/llr_spring`;
const springScriptPath = `${springRoot}/llr_spring.gd`;
const springScenePath = `${springRoot}/llr_spring.tscn`;
const conveyorRoot = `${projectRoot}/classes/solid/llr_conveyor`;
const conveyorScriptPath = `${conveyorRoot}/llr_conveyor.gd`;
const conveyorScenePath = `${conveyorRoot}/llr_conveyor.tscn`;
const poundGateRoot = `${projectRoot}/classes/solid/llr_pound_gate`;
const poundGateScriptPath = `${poundGateRoot}/llr_pound_gate.gd`;
const poundGateScenePath = `${poundGateRoot}/llr_pound_gate.tscn`;
const coinGateRoot = `${projectRoot}/classes/solid/llr_coin_gate`;
const coinGateScriptPath = `${coinGateRoot}/llr_coin_gate.gd`;
const coinGateScenePath = `${coinGateRoot}/llr_coin_gate.tscn`;
const directorRoot = `${projectRoot}/classes/zone/llr_set_piece_director`;
const directorScriptPath = `${directorRoot}/llr_set_piece_director.gd`;
const directorScenePath = `${directorRoot}/llr_set_piece_director.tscn`;
const directorScriptSourcePath = "tools/godot-patches/llr_set_piece_director.gd";
const directorSceneSourcePath = "tools/godot-patches/llr_set_piece_director.tscn";
const objectiveTargetRoot = `${projectRoot}/classes/solid/llr_objective_target`;
const objectiveTargetScriptPath = `${objectiveTargetRoot}/llr_objective_target.gd`;
const objectiveTargetScenePath = `${objectiveTargetRoot}/llr_objective_target.tscn`;
const objectiveTargetScriptSourcePath = "tools/godot-patches/llr_objective_target.gd";
const objectiveTargetSceneSourcePath = "tools/godot-patches/llr_objective_target.tscn";
const waterViewportScriptPath = `${projectRoot}/classes/water/water_viewport.gd`;
const breakableBoxScriptPath = `${projectRoot}/classes/solid/breakable_box/breakable_box.gd`;
const breakableBoxScriptSourcePath = "tools/godot-patches/breakable_box.gd";
const thwompScriptPath = `${projectRoot}/classes/entity/enemy/thwomp/thwomp.gd`;
const rotatingBlockScriptPath = `${projectRoot}/classes/solid/rotating_block/rotating_block.gd`;
const rebindOptionScriptPath = `${projectRoot}/gui/pause/options/rebind_option.gd`;
const segmentWidth = 3200;
const segmentCount = 10;
const levelWidth = segmentWidth * segmentCount;

const designerMusicSource = `extends AudioStreamPlayer


const SONG_PATHS = [
\t"res://scenes/menus/level_designer/music/editor1.ogg",
\t"res://scenes/menus/level_designer/music/editor2.ogg",
\t"res://scenes/menus/level_designer/music/editor3.ogg",
\t"res://scenes/menus/level_designer/music/editor4.ogg",
]

var fade_out: Tween
var fade_in: Tween
var song_list: Array[AudioStream] = []

var song_length
var play_length
var length_factor
var song_num


func _ready():
\tfor path in SONG_PATHS:
\t\tif ResourceLoader.exists(path):
\t\t\tvar song = load(path)
\t\t\tif song is AudioStream:
\t\t\t\tsong_list.append(song)
\tif song_list.is_empty():
\t\treturn
\trandomize()
\tsong_num = randi() % song_list.size()
\tvolume_db = -80
\tswitch_song()


func switch_song():
\tif song_list.is_empty():
\t\treturn
\tfade_in = create_tween().set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
\tfade_out = create_tween().set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN)
\tfade_out.finished.connect(Callable(self, "_on_FadeOut_tween_completed"))
\tvar offset = 1 if song_list.size() == 1 else 1 + (randi() % (song_list.size() - 1))
\tsong_num = (song_num + offset) % song_list.size()
\tstream = song_list[song_num]
\tplay(0)
\tfade_in.tween_property(self, "volume_db", 0, 5).from(-60)
\tsong_length = stream.get_length()
\tlength_factor = randf_range(1, 3)
\tplay_length = song_length * length_factor
\tfade_out.tween_property(self, "volume_db", -60, 10).from(0).set_delay(play_length)


func _on_FadeOut_tween_completed():
\tstop()
\tswitch_song()
`;

const shuttleScriptSource = `class_name LLRShuttle
extends Node2D


enum MODE {
\tCYCLE,
\tONE_SHOT,
\tPROXIMITY,
}

@export var travel: Vector2 = Vector2(192, 0)
@export_range(0.8, 12.0, 0.1) var travel_seconds: float = 2.6
@export_range(0.0, 2.0, 0.05) var pause_seconds: float = 0.35
@export_range(0.0, 1.0, 0.01) var phase: float = 0.0
@export var mode: MODE = MODE.CYCLE
@export_range(64.0, 640.0, 8.0) var activation_radius := 240.0
@export_range(0.0, 4.0, 0.05) var start_delay := 0.0

var elapsed: float = 0.0
var active := false
var finished := false
var delay_elapsed := 0.0
@onready var platform: Node2D = $MovingPlatform


func _ready() -> void:
\tplatform.scale = Vector2(1.75, 1.0)
\tactive = mode != MODE.PROXIMITY
\telapsed = phase * _cycle_length() if mode == MODE.CYCLE else 0.0
\t_apply_position()


func _physics_process(delta: float) -> void:
\tif !active:
\t\tif finished:
\t\t\treturn
\t\tif mode == MODE.PROXIMITY:
\t\t\tvar player := get_node_or_null("/root/Main/Player") as Node2D
\t\t\tif player != null and player.global_position.distance_to(global_position) <= activation_radius:
\t\t\t\tactivate()
\t\treturn
\tif delay_elapsed < start_delay:
\t\tdelay_elapsed += delta
\t\treturn
\tif mode == MODE.CYCLE:
\t\telapsed = fposmod(elapsed + delta, _cycle_length())
\telse:
\t\telapsed = min(elapsed + delta, travel_seconds)
\t\tif elapsed >= travel_seconds:
\t\t\tfinished = true
\t\t\tactive = false
\t_apply_position()


func activate() -> void:
\tif finished:
\t\treturn
\tactive = true
\tdelay_elapsed = 0.0


func _cycle_length() -> float:
\treturn max(0.2, travel_seconds * 2.0 + pause_seconds * 2.0)


func _apply_position() -> void:
\tif mode != MODE.CYCLE:
\t\tplatform.position = travel * smoothstep(0.0, 1.0, clamp(elapsed / max(0.01, travel_seconds), 0.0, 1.0))
\t\treturn
\tvar cursor := elapsed
\tvar amount := 0.0
\tif cursor < pause_seconds:
\t\tamount = 0.0
\telif cursor < pause_seconds + travel_seconds:
\t\tamount = smoothstep(0.0, 1.0, (cursor - pause_seconds) / travel_seconds)
\telif cursor < pause_seconds * 2.0 + travel_seconds:
\t\tamount = 1.0
\telse:
\t\tamount = 1.0 - smoothstep(0.0, 1.0, (cursor - pause_seconds * 2.0 - travel_seconds) / travel_seconds)
\tplatform.position = travel * amount
`;

const shuttleSceneSource = `[gd_scene load_steps=3 format=3]

[ext_resource type="PackedScene" path="res://classes/solid/moving_platform/moving_platform.tscn" id="1"]
[ext_resource type="Script" path="res://classes/solid/llr_shuttle/llr_shuttle.gd" id="2"]

[node name="LLRShuttle" type="Node2D"]
script = ExtResource("2")

[node name="MovingPlatform" parent="." instance=ExtResource("1")]
`;

const springScriptSource = `class_name LLRSpring
extends Node2D


@export_range(5.0, 11.0, 0.1) var launch_speed: float = 8.2
@export_range(-4.0, 4.0, 0.1) var horizontal_boost: float = 0.0

var rest_scale := Vector2.ONE
var squash_tween: Tween


func _ready() -> void:
	rest_scale = $FungusHead.scale


func _on_BounceArea_body_entered(body) -> void:
	var velocity = body.get("vel")
	if !(velocity is Vector2) or velocity.y < -0.8 or !body.has_method("off_ground"):
		return
	body.position.y -= 4.0
	body.off_ground()
	if body.has_method("switch_state"):
		body.switch_state(1)
	body.set("bouncing", false)
	body.set("pound_state", 0)
	body.set("vel", Vector2(velocity.x + horizontal_boost, -launch_speed))
	if squash_tween != null and squash_tween.is_valid():
		squash_tween.kill()
	$FungusHead.scale = rest_scale
	squash_tween = create_tween().set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	squash_tween.tween_property($FungusHead, "scale", Vector2(rest_scale.x * 1.12, rest_scale.y * 0.62), 0.07)
	squash_tween.tween_property($FungusHead, "scale", rest_scale, 0.16)
`;

const springSceneSource = `[gd_scene load_steps=4 format=3]

[ext_resource type="Script" path="res://classes/solid/llr_spring/llr_spring.gd" id="1"]
[ext_resource type="PackedScene" path="res://classes/solid/fungus_platform/fungus_head.tscn" id="2"]

[sub_resource type="RectangleShape2D" id="1"]
size = Vector2(66, 18)

[node name="LLRSpring" type="Node2D"]
script = ExtResource("1")

[node name="FungusHead" parent="." instance=ExtResource("2")]
scale = Vector2(1.35, 0.9)

[node name="BounceArea" type="Area2D" parent="."]
position = Vector2(0, -11)
collision_layer = 0
collision_mask = 2
input_pickable = false
monitorable = false

[node name="CollisionShape2D" type="CollisionShape2D" parent="BounceArea"]
shape = SubResource("1")

[connection signal="body_entered" from="BounceArea" to="." method="_on_BounceArea_body_entered"]
`;

const conveyorScriptSource = `class_name LLRConveyor
extends StaticBody2D


@export_range(96.0, 384.0, 8.0) var width: float = 224.0
@export_range(-220.0, 220.0, 5.0) var speed: float = 105.0

@onready var ride_area: Area2D = $RideArea


func _ready() -> void:
	$CollisionShape2D.shape = $CollisionShape2D.shape.duplicate()
	$RideArea/CollisionShape2D.shape = $RideArea/CollisionShape2D.shape.duplicate()
	$CollisionShape2D.shape.size.x = width
	$RideArea/CollisionShape2D.shape.size.x = width
	$Sprite2D.scale.x = width / 48.0
	$Arrows.scale.x = -1.0 if speed < 0.0 else 1.0


func _physics_process(delta: float) -> void:
	for body in ride_area.get_overlapping_bodies():
		if body.has_method("is_on_floor") and body.is_on_floor():
			body.position.x += speed * delta
`;

const conveyorSceneSource = `[gd_scene load_steps=5 format=3]

[ext_resource type="Script" path="res://classes/solid/llr_conveyor/llr_conveyor.gd" id="1"]
[ext_resource type="Texture2D" path="res://classes/solid/moving_platform/moving_platform.png" id="2"]

[sub_resource type="RectangleShape2D" id="1"]
resource_local_to_scene = true
size = Vector2(224, 14)

[sub_resource type="RectangleShape2D" id="2"]
resource_local_to_scene = true
size = Vector2(224, 5)

[node name="LLRConveyor" type="StaticBody2D"]
collision_mask = 0
script = ExtResource("1")

[node name="Sprite2D" type="Sprite2D" parent="."]
texture_filter = 1
texture = ExtResource("2")
scale = Vector2(4.66667, 1)

[node name="CollisionShape2D" type="CollisionShape2D" parent="."]
shape = SubResource("1")
one_way_collision = true

[node name="RideArea" type="Area2D" parent="."]
position = Vector2(0, -9)
collision_layer = 0
collision_mask = 4
input_pickable = false
monitorable = false

[node name="CollisionShape2D" type="CollisionShape2D" parent="RideArea"]
shape = SubResource("2")

[node name="Arrows" type="Node2D" parent="."]
position = Vector2(0, -2)

[node name="Arrow1" type="Polygon2D" parent="Arrows"]
position = Vector2(-55, 0)
color = Color(0.82, 0.96, 1, 0.94)
polygon = PackedVector2Array(-11, -5, -2, 0, -11, 5, -5, 5, 4, 0, -5, -5)

[node name="Arrow2" type="Polygon2D" parent="Arrows"]
color = Color(0.82, 0.96, 1, 0.94)
polygon = PackedVector2Array(-11, -5, -2, 0, -11, 5, -5, 5, 4, 0, -5, -5)

[node name="Arrow3" type="Polygon2D" parent="Arrows"]
position = Vector2(55, 0)
color = Color(0.82, 0.96, 1, 0.94)
polygon = PackedVector2Array(-11, -5, -2, 0, -11, 5, -5, 5, 4, 0, -5, -5)
`;

const poundGateScriptSource = `class_name LLRPoundGate
extends Node2D


@export var gate_offset := Vector2(224, -92)
@export_range(120.0, 240.0, 4.0) var gate_height: float = 184.0
@export_range(150.0, 300.0, 4.0) var open_distance: float = 220.0

var opened := false


func _ready() -> void:
	$Gate.position = gate_offset
	$Gate/CollisionShape2D.shape = $Gate/CollisionShape2D.shape.duplicate()
	$Gate/CollisionShape2D.shape.size.y = gate_height
	$Gate/Sprite2D.scale.x = gate_height / 48.0


func _physics_process(_delta: float) -> void:
	if opened:
		return
	for body in $PoundArea.get_overlapping_bodies():
		if is_pound_activation(body):
			open_gate()
			return


func is_pound_activation(body) -> bool:
	if body.get("state") == null or body.get("pound_state") == null:
		return false
	return body.state == body.S.POUND and body.pound_state != body.Pound.SPIN


func open_gate() -> void:
	if opened:
		return
	opened = true
	$Hint.text = "✓"
	$Hint.modulate = Color(0.55, 1.0, 0.65, 1.0)
	$PadSprite.modulate = Color(0.55, 1.0, 0.65, 1.0)
	var tween = create_tween().set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_IN_OUT)
	tween.parallel().tween_property($PadSprite, "scale:y", 0.55, 0.14)
	tween.tween_property($Gate, "position", gate_offset + Vector2(0, -open_distance), 0.58)
	tween.finished.connect(func(): $Gate.collision_layer = 0)
`;

const poundGateSceneSource = `[gd_scene load_steps=5 format=3]

[ext_resource type="Script" path="res://classes/solid/llr_pound_gate/llr_pound_gate.gd" id="1"]
[ext_resource type="Texture2D" path="res://classes/solid/moving_platform/moving_platform.png" id="2"]

[sub_resource type="RectangleShape2D" id="1"]
size = Vector2(88, 14)

[sub_resource type="RectangleShape2D" id="2"]
resource_local_to_scene = true
size = Vector2(20, 184)

[node name="LLRPoundGate" type="Node2D"]
script = ExtResource("1")

[node name="Pad" type="StaticBody2D" parent="."]
collision_mask = 0

[node name="CollisionShape2D" type="CollisionShape2D" parent="Pad"]
shape = SubResource("1")
one_way_collision = true

[node name="PadSprite" type="Sprite2D" parent="."]
texture_filter = 1
texture = ExtResource("2")
scale = Vector2(1.83333, 1)

[node name="PoundArea" type="Area2D" parent="."]
position = Vector2(0, -11)
collision_layer = 0
collision_mask = 2
input_pickable = false
monitorable = false

[node name="CollisionShape2D" type="CollisionShape2D" parent="PoundArea"]
shape = SubResource("1")

[node name="Hint" type="Label" parent="."]
offset_left = -16.0
offset_top = -62.0
offset_right = 16.0
offset_bottom = -28.0
theme_override_colors/font_color = Color(1, 0.94, 0.35, 1)
theme_override_colors/font_outline_color = Color(0.1, 0.14, 0.2, 1)
theme_override_constants/outline_size = 6
theme_override_font_sizes/font_size = 24
text = "Z"
horizontal_alignment = 1

[node name="Pointer" type="Polygon2D" parent="."]
position = Vector2(0, -23)
color = Color(1, 0.94, 0.35, 1)
polygon = PackedVector2Array(-8, -7, 8, -7, 0, 4)

[node name="Gate" type="StaticBody2D" parent="."]
position = Vector2(224, -92)
collision_mask = 0

[node name="Sprite2D" type="Sprite2D" parent="Gate"]
texture_filter = 1
rotation = 1.5708
texture = ExtResource("2")
scale = Vector2(3.83333, 1.35)

[node name="CollisionShape2D" type="CollisionShape2D" parent="Gate"]
shape = SubResource("2")
`;

const coinGateScriptSource = `class_name LLRCoinGate
extends Node2D


@export_range(1, 8, 1) var required_coins: int = 4
@export_range(120.0, 240.0, 4.0) var gate_height: float = 184.0
@export_range(150.0, 300.0, 4.0) var open_distance: float = 220.0

var starting_coins := 0
var opened := false


func _ready() -> void:
	starting_coins = Singleton.red_coin_total
	$Gate/CollisionShape2D.shape = $Gate/CollisionShape2D.shape.duplicate()
	$Gate/CollisionShape2D.shape.size.y = gate_height
	$Gate/Sprite2D.scale.x = gate_height / 48.0
	update_counter()


func _process(_delta: float) -> void:
	if opened:
		return
	update_counter()
	if collected_coins() >= required_coins:
		open_gate()


func collected_coins() -> int:
	return max(0, Singleton.red_coin_total - starting_coins)


func update_counter() -> void:
	$Counter.text = "%d/%d" % [min(collected_coins(), required_coins), required_coins]


func open_gate() -> void:
	if opened:
		return
	opened = true
	$Counter.text = "✓"
	$Counter.modulate = Color(0.55, 1.0, 0.65, 1.0)
	var tween = create_tween().set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property($Gate, "position", Vector2(0, -gate_height * 0.5 - open_distance), 0.62)
	tween.finished.connect(func(): $Gate.collision_layer = 0)
`;

const coinGateSceneSource = `[gd_scene load_steps=7 format=3]

[ext_resource type="Script" path="res://classes/solid/llr_coin_gate/llr_coin_gate.gd" id="1"]
[ext_resource type="Texture2D" path="res://classes/solid/moving_platform/moving_platform.png" id="2"]
[ext_resource type="Texture2D" path="res://classes/pickup/coin/coins.png" id="3"]

[sub_resource type="RectangleShape2D" id="1"]
resource_local_to_scene = true
size = Vector2(20, 184)

[sub_resource type="AtlasTexture" id="2"]
atlas = ExtResource("3")
region = Rect2(0, 16, 16, 16)

[node name="LLRCoinGate" type="Node2D"]
script = ExtResource("1")

[node name="Gate" type="StaticBody2D" parent="."]
position = Vector2(0, -92)
collision_mask = 0

[node name="Sprite2D" type="Sprite2D" parent="Gate"]
texture_filter = 1
rotation = 1.5708
texture = ExtResource("2")
scale = Vector2(3.83333, 1.35)

[node name="CollisionShape2D" type="CollisionShape2D" parent="Gate"]
shape = SubResource("1")

[node name="Coin" type="Sprite2D" parent="."]
position = Vector2(-24, -205)
texture_filter = 1
texture = SubResource("2")
scale = Vector2(1.35, 1.35)

[node name="Counter" type="Label" parent="."]
offset_left = -4.0
offset_top = -224.0
offset_right = 60.0
offset_bottom = -187.0
theme_override_colors/font_color = Color(1, 0.9, 0.9, 1)
theme_override_colors/font_outline_color = Color(0.16, 0.08, 0.12, 1)
theme_override_constants/outline_size = 6
theme_override_font_sizes/font_size = 22
text = "0/4"
`;

const resources = {
  terrain: "res://classes/solid/terrain/terrain_polygon.tscn",
  player: "res://classes/player/player.tscn",
  background: "res://scenes/levels/tutorial_1/bg/bg_t1.tscn",
  camera: "res://classes/zone/camera_area/camera_area.tscn",
  sign: "res://classes/interactable/sign/sign.tscn",
  bigTree: "res://classes/decorative/big_tree.tscn",
  smallTree: "res://classes/decorative/small_tree.tscn",
  flowers: "res://classes/decorative/flowers.tscn",
  goomba: "res://classes/entity/enemy/goomba/goomba.tscn",
  bobomb: "res://classes/entity/enemy/bobomb/bobomb.tscn",
  cheep: "res://classes/entity/enemy/cheep_cheep/cheep_cheep.tscn",
  parakoopa: "res://classes/entity/enemy/koopa/parakoopa.tscn",
  koopa: "res://classes/entity/enemy/koopa/koopa.tscn",
  goonie: "res://classes/entity/passive/goonie/goonie.tscn",
  thwomp: "res://classes/entity/enemy/thwomp/thwomp.tscn",
  thwump: "res://classes/entity/enemy/thwomp/thwump.tscn",
  coin: "res://classes/pickup/coin/yellow/coin_yellow.tscn",
  redCoin: "res://classes/pickup/coin/red/coin_red.tscn",
  blueCoin: "res://classes/pickup/coin/blue/coin_blue.tscn",
  bottle: "res://classes/pickup/bottle/bottle_big.tscn",
  fludd: "res://classes/pickup/fludd_box/fludd_box.tscn",
  fluddRocket: "res://classes/pickup/fludd_box/fludd_pickup_rocket.tscn",
  fluddTurbo: "res://classes/pickup/fludd_box/fludd_pickup_turbo.tscn",
  fluddHover: "res://classes/pickup/fludd_box/fludd_pickup_hover.tscn",
  water: "res://classes/water/water.tscn",
  log: "res://classes/solid/log/log.tscn",
  fallingLog: "res://classes/solid/log/log_fall.tscn",
  bigRock: "res://classes/solid/rocks/big_rock/big_rock.tscn",
  box: "res://classes/solid/breakable_box/breakable_box.tscn",
  wood: "res://classes/solid/wooden_platform/wooden_platform.tscn",
  fungus: "res://classes/solid/fungus_platform/fungus_stem.tscn",
  cloud: "res://classes/solid/telescoping/cloud/cloud.tscn",
  pivot: "res://classes/solid/moving_platform/pivot.tscn",
  tippingLog: "res://classes/solid/telescoping/tipping_log/tipping_log.tscn",
  rotating: "res://classes/solid/rotating_block/rotating_block.tscn",
  shuttle: "res://classes/solid/llr_shuttle/llr_shuttle.tscn",
  spring: "res://classes/solid/llr_spring/llr_spring.tscn",
  conveyor: "res://classes/solid/llr_conveyor/llr_conveyor.tscn",
  poundGate: "res://classes/solid/llr_pound_gate/llr_pound_gate.tscn",
  coinGate: "res://classes/solid/llr_coin_gate/llr_coin_gate.tscn",
  director: "res://classes/zone/llr_set_piece_director/llr_set_piece_director.tscn",
  objectiveTarget: "res://classes/solid/llr_objective_target/llr_objective_target.tscn",
  pipe: "res://classes/interactable/pipe/pipe.tscn",
  door: "res://classes/interactable/door/door.tscn",
  arrow: "res://classes/decorative/arrow/arrow.tscn",
  warp: "res://classes/zone/trigger/warpzone/warp_zone.tscn",
  death: "res://classes/zone/trigger/death_plane/death_plane.tscn"
};

const resourceIds = Object.fromEntries(
  Object.keys(resources).map((key, index) => [key, `llr_${index + 1}`])
);

const v4Blueprints = new Map([
  [1, V4_STAGE_ONE_BLUEPRINT],
  [2, V4_STAGE_TWO_BLUEPRINT],
  [3, V4_STAGE_THREE_BLUEPRINT],
  [4, V4_STAGE_FOUR_BLUEPRINT],
  [5, V4_STAGE_FIVE_BLUEPRINT],
  [6, V4_STAGE_SIX_BLUEPRINT],
  [7, V4_STAGE_SEVEN_BLUEPRINT],
  [8, V4_STAGE_EIGHT_BLUEPRINT],
  [9, V4_STAGE_NINE_BLUEPRINT],
  [10, V4_STAGE_TEN_BLUEPRINT]
]);

const v4Builders = new Map([
  [1, buildV4StageOneScene],
  [2, buildV4StageTwoScene],
  [3, buildV4StageThreeScene],
  [4, buildV4StageFourScene],
  [5, buildV4StageFiveScene],
  [6, buildV4StageSixScene],
  [7, buildV4StageSevenScene],
  [8, buildV4StageEightScene],
  [9, buildV4StageNineScene],
  [10, buildV4StageTenScene]
]);

const stages = V3_STAGE_BLUEPRINTS.map((stage) => ({
  ...(v4Blueprints.has(stage.id) ? { ...stage, ...v4Blueprints.get(stage.id) } : stage),
  resource: `res://scenes/levels/llr_complete/llr_complete_${stage.id}.tscn`,
  output: `${extrasRoot}/llr_complete_${stage.id}.tscn`
}));

function fmt(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function vector(x, y) {
  return `Vector2(${fmt(x)}, ${fmt(y)})`;
}

function packed(points) {
  return `PackedVector2Array(${points.flat().map(fmt).join(", ")})`;
}

function instanceNode(name, parent, resource, properties = {}) {
  const lines = [
    `[node name="${name}" parent="${parent}" instance=ExtResource("${resourceIds[resource]}")]`
  ];
  for (const [key, value] of Object.entries(properties)) {
    lines.push(`${key} = ${value}`);
  }
  return `${lines.join("\n")}\n`;
}

function plainNode(name, type, parent = ".") {
  if (parent === "") {
    return `[node name="${name}" type="${type}"]\n`;
  }
  return `[node name="${name}" type="${type}" parent="${parent}"]\n`;
}

function terrainNode(name, x, y, width, topProfile = [0, 0, 0, 0], depth = 420) {
  const step = width / (topProfile.length - 1);
  const top = topProfile.map((offset, index) => [index * step, offset]);
  const polygon = [...top, [width, depth], [0, depth]];
  return instanceNode(name, "Terrain", "terrain", {
    z_index: "1",
    position: vector(x, y),
    polygon: packed(polygon)
  });
}

function addCoinArc(nodes, prefix, x, y, count = 7, spacing = 58, height = 70) {
  for (let index = 0; index < count; index += 1) {
    const progress = count === 1 ? 0 : index / (count - 1);
    const offsetY = -Math.sin(progress * Math.PI) * height;
    nodes.push(instanceNode(`${prefix}Coin${index + 1}`, "Items/Coins", "coin", {
      position: vector(x + index * spacing, y + offsetY)
    }));
  }
}

function addEnemyLine(nodes, prefix, resource, x, y, count, spacing) {
  for (let index = 0; index < count; index += 1) {
    nodes.push(instanceNode(`${prefix}${resource}${index + 1}`, "Items/Enemies", resource, {
      position: vector(x + index * spacing, y)
    }));
  }
}

function addMainTerrain(nodes, segmentIndex, stage, raised = false) {
  const x = segmentIndex * segmentWidth;
  const entryY = stage.heights[segmentIndex];
  const exitY = stage.heights[segmentIndex + 1];
  const delta = exitY - entryY;
  const middleY = entryY + delta * 0.5 + (raised ? -80 : 0);

  nodes.push(terrainNode(`S${segmentIndex + 1}EntryTerrain`, x + 20, entryY, 610, [0, -12, 8, 0], 360));
  nodes.push(terrainNode(`S${segmentIndex + 1}MiddleTerrain`, x + 1540, middleY, 720, [0, -22, 14, 0], 330));
  nodes.push(terrainNode(`S${segmentIndex + 1}ExitTerrain`, x + 3040, exitY, 760, [0, -10, 6, 0], 430));

  const steps = Math.max(3, Math.min(8, Math.ceil(Math.abs(delta) / 105)));
  for (let index = 0; index < steps; index += 1) {
    const progress = (index + 1) / (steps + 1);
    const stepX = x + 620 + progress * 900;
    const stepY = entryY + delta * progress - 35;
    const resource = delta < -260 && index % 2 === 0 ? "cloud" : "wood";
    const properties = {
      position: vector(stepX, stepY),
      ...(resource === "cloud" ? { width: "2" } : {})
    };
    nodes.push(instanceNode(`S${segmentIndex + 1}ElevationStep${index + 1}`, "Items/Platforms", resource, properties));
  }

  const bridgeSteps = Math.max(3, Math.min(7, Math.ceil(Math.abs(delta) / 130) + 2));
  for (let index = 0; index < bridgeSteps; index += 1) {
    const progress = (index + 1) / (bridgeSteps + 1);
    nodes.push(instanceNode(`S${segmentIndex + 1}ExitStep${index + 1}`, "Items/Platforms", index % 3 === 0 ? "cloud" : "wood", {
      position: vector(x + 2260 + progress * 760, middleY + (exitY - middleY) * progress - 45),
      ...(index % 3 === 0 ? { width: "2" } : {})
    }));
  }
  return { x, baseY: middleY, entryY, exitY };
}

function addRecoveryRoute(nodes, segmentIndex, stage) {
  const x = segmentIndex * segmentWidth;
  const exitY = stage.heights[segmentIndex + 1];
  const recoveryY = 650 + ((segmentIndex + stage.id) % 2) * 25;
  nodes.push(terrainNode(`S${segmentIndex + 1}RecoveryGroundA`, x + 160, recoveryY, 1050, [0, -8, 12, 0], 360));
  nodes.push(terrainNode(`S${segmentIndex + 1}RecoveryGroundB`, x + 1390, recoveryY + 20, 940, [0, 10, -8, 0], 350));
  nodes.push(terrainNode(
    `S${segmentIndex + 1}RecoveryBlocker`,
    x + 2360,
    exitY + 70,
    210,
    [0, 0, 0, 0],
    recoveryY - exitY + 520
  ));
  addCoinArc(nodes, `S${segmentIndex + 1}Recovery`, x + 420, recoveryY - 55, 7, 92, 34);
  const climbHeight = recoveryY - exitY;
  const climbSteps = Math.max(5, Math.min(10, Math.ceil(climbHeight / 105)));
  for (let index = 0; index < climbSteps; index += 1) {
    const progress = (index + 1) / (climbSteps + 1);
    nodes.push(instanceNode(`S${segmentIndex + 1}RecoveryClimb${index + 1}`, "Items/Platforms", index % 2 === 0 ? "cloud" : "wood", {
      position: vector(x + 1760 + progress * 680, recoveryY - climbHeight * progress - 45),
      ...(index % 2 === 0 ? { width: "2" } : {})
    }));
  }
  nodes.push(instanceNode(`S${segmentIndex + 1}RecoveryTree`, "Items/Decoration", "smallTree", {
    position: vector(x + 1040, recoveryY - 30)
  }));
}

function addSegmentMarker(nodes, index, theme, stage) {
  nodes.push(`${plainNode(`LLRSegment${String(index + 1).padStart(2, "0")}_${theme}`, "Node2D").trimEnd()}
position = ${vector(index * segmentWidth, stage.heights[index])}
metadata/_llr_entry_y = ${fmt(stage.heights[index])}
metadata/_llr_exit_y = ${fmt(stage.heights[index + 1])}
`);
}

function buildMeadow(nodes, segmentIndex, stage) {
  const { x, baseY } = addMainTerrain(nodes, segmentIndex, stage);
  addCoinArc(nodes, `S${segmentIndex + 1}MeadowA`, x + 260, baseY - 55, 8, 64, 72);
  addCoinArc(nodes, `S${segmentIndex + 1}MeadowB`, x + 1620, baseY - 70, 7, 68, 92);
  addEnemyLine(nodes, `S${segmentIndex + 1}`, "goomba", x + 920, baseY - 22, 3 + (stage.id > 5 ? 1 : 0), 190);
  nodes.push(instanceNode(`S${segmentIndex + 1}Log1`, "Items/Platforms", "log", {
    position: vector(x + 1220, baseY - 75),
    rotation: fmt(-0.12)
  }));
  nodes.push(instanceNode(`S${segmentIndex + 1}Log2`, "Items/Platforms", "fallingLog", {
    position: vector(x + 2420, baseY - 110)
  }));
  nodes.push(instanceNode(`S${segmentIndex + 1}BigTree`, "Items/Decoration", "bigTree", {
    position: vector(x + 480, baseY - 28)
  }));
  nodes.push(instanceNode(`S${segmentIndex + 1}SmallTree`, "Items/Decoration", "smallTree", {
    position: vector(x + 2950, baseY - 22)
  }));
  nodes.push(instanceNode(`S${segmentIndex + 1}Flowers`, "Items/Decoration", "flowers", {
    position: vector(x + 2050, baseY - 10)
  }));
}

function buildLake(nodes, segmentIndex, stage) {
  const { x, baseY } = addMainTerrain(nodes, segmentIndex, stage);
  nodes.push(instanceNode(`S${segmentIndex + 1}Water1`, "Water", "water", {
    position: vector(x + 1120, baseY + 4),
    polygon: packed([[0, 0], [230, 0], [230, 245], [0, 245]])
  }));
  nodes.push(instanceNode(`S${segmentIndex + 1}Water2`, "Water", "water", {
    position: vector(x + 2340, baseY + 8),
    polygon: packed([[0, 0], [190, 0], [190, 255], [0, 255]])
  }));
  for (let index = 0; index < 4; index += 1) {
    nodes.push(instanceNode(`S${segmentIndex + 1}Bridge${index + 1}`, "Items/Platforms", "wood", {
      position: vector(x + 1080 + index * 115, baseY - 55 - (index % 2) * 18)
    }));
  }
  addEnemyLine(nodes, `S${segmentIndex + 1}`, "cheep", x + 1200, baseY + 105, 3, 150);
  addCoinArc(nodes, `S${segmentIndex + 1}LakeA`, x + 320, baseY - 62, 7, 70, 55);
  addCoinArc(nodes, `S${segmentIndex + 1}LakeB`, x + 2550, baseY - 75, 8, 62, 78);
  nodes.push(instanceNode(`S${segmentIndex + 1}LakeLog`, "Items/Platforms", "tippingLog", {
    position: vector(x + 2190, baseY - 90)
  }));
  nodes.push(instanceNode(`S${segmentIndex + 1}Bottle`, "Items/Pickups", "bottle", {
    position: vector(x + 3100, baseY - 85)
  }));
}

function buildBomb(nodes, segmentIndex, stage) {
  const { x, baseY } = addMainTerrain(nodes, segmentIndex, stage);
  addEnemyLine(nodes, `S${segmentIndex + 1}`, "bobomb", x + 480, baseY - 24, 4 + (stage.id > 6 ? 1 : 0), 330);
  for (let index = 0; index < 7; index += 1) {
    nodes.push(instanceNode(`S${segmentIndex + 1}Box${index + 1}`, "Items/Platforms", "box", {
      position: vector(x + 1540 + (index % 4) * 70, baseY - 35 - Math.floor(index / 4) * 70)
    }));
  }
  for (let index = 0; index < 4; index += 1) {
    nodes.push(instanceNode(`S${segmentIndex + 1}BombWood${index + 1}`, "Items/Platforms", "wood", {
      position: vector(x + 2350 + index * 240, baseY - 90 - (index % 2) * 70)
    }));
  }
  addCoinArc(nodes, `S${segmentIndex + 1}BombA`, x + 220, baseY - 70, 8, 65, 65);
  addCoinArc(nodes, `S${segmentIndex + 1}BombB`, x + 2500, baseY - 165, 7, 88, 55);
  nodes.push(instanceNode(`S${segmentIndex + 1}BombRotating`, "Items/Mechanisms", "rotating", {
    position: vector(x + 2140, baseY - 135),
    size: vector(86, 86),
    speed: fmt(stage.id >= 8 ? 1.35 : 1),
    wait: fmt(80 - Math.min(stage.id, 8) * 3),
    type: "1"
  }));
}

function buildFungus(nodes, segmentIndex, stage) {
  const { x, baseY } = addMainTerrain(nodes, segmentIndex, stage, true);
  const heights = [120, 210, 310, 230, 360, 260];
  for (let index = 0; index < heights.length; index += 1) {
    const height = heights[(index + stage.id) % heights.length];
    nodes.push(instanceNode(`S${segmentIndex + 1}Fungus${index + 1}`, "Items/Platforms", "fungus", {
      position: vector(x + 540 + index * 470, baseY + 5),
      points: packed([[0, 0], [-6, -height * 0.25], [4, -height * 0.5], [-3, -height * 0.75], [0, -height]])
    }));
  }
  addCoinArc(nodes, `S${segmentIndex + 1}FungusA`, x + 480, baseY - 220, 9, 62, 105);
  addCoinArc(nodes, `S${segmentIndex + 1}FungusB`, x + 2220, baseY - 260, 8, 70, 85);
  addEnemyLine(nodes, `S${segmentIndex + 1}`, "parakoopa", x + 980, baseY - 300, 3, 720);
  if (segmentIndex === 0 || segmentIndex === 4) {
    nodes.push(instanceNode(`S${segmentIndex + 1}Fludd`, "Items/Pickups", "fludd", {
      position: vector(x + 240, baseY - 70),
      nozzle: "1"
    }));
  }
}

function buildSky(nodes, segmentIndex, stage) {
  const { x, baseY } = addMainTerrain(nodes, segmentIndex, stage);
  for (let index = 0; index < 8; index += 1) {
    nodes.push(instanceNode(`S${segmentIndex + 1}Cloud${index + 1}`, "Items/Platforms", "cloud", {
      position: vector(x + 350 + index * 430, baseY - 220 - (index % 4) * 105),
      width: index % 3 === 0 ? "3" : "2"
    }));
  }
  nodes.push(instanceNode(`S${segmentIndex + 1}SkyPivot1`, "Items/Mechanisms", "pivot", {
    position: vector(x + 1450, baseY - 430),
    radius: "78",
    count: "3",
    speed: fmt(8 + stage.id * 0.4),
    offset: fmt(segmentIndex * 0.3)
  }));
  nodes.push(instanceNode(`S${segmentIndex + 1}SkyPivot2`, "Items/Mechanisms", "pivot", {
    position: vector(x + 2800, baseY - 480),
    radius: "92",
    count: "4",
    speed: fmt(-7 - stage.id * 0.35),
    offset: fmt(segmentIndex * 0.2)
  }));
  addCoinArc(nodes, `S${segmentIndex + 1}SkyA`, x + 320, baseY - 300, 9, 70, 115);
  addCoinArc(nodes, `S${segmentIndex + 1}SkyB`, x + 2150, baseY - 420, 8, 75, 95);
  addEnemyLine(nodes, `S${segmentIndex + 1}`, "parakoopa", x + 850, baseY - 390, 4, 760);
  nodes.push(instanceNode(`S${segmentIndex + 1}SkyBottle`, "Items/Pickups", "bottle", {
    position: vector(x + 2980, baseY - 600)
  }));
}

function buildRotor(nodes, segmentIndex, stage) {
  const { x, baseY } = addMainTerrain(nodes, segmentIndex, stage);
  for (let index = 0; index < 4; index += 1) {
    nodes.push(instanceNode(`S${segmentIndex + 1}RotorBlock${index + 1}`, "Items/Mechanisms", "rotating", {
      position: vector(x + 620 + index * 760, baseY - 130 - (index % 2) * 95),
      size: vector(78 + (index % 2) * 16, 78 + (index % 2) * 16),
      speed: fmt((index % 2 === 0 ? 1 : -1) * (1 + stage.id * 0.045)),
      wait: fmt(72 - Math.min(stage.id, 9) * 2),
      type: String(index % 2)
    }));
  }
  nodes.push(instanceNode(`S${segmentIndex + 1}RotorPivot1`, "Items/Mechanisms", "pivot", {
    position: vector(x + 1350, baseY - 280),
    radius: "86",
    count: "3",
    speed: fmt(9 + stage.id * 0.5),
    offset: "0.4"
  }));
  nodes.push(instanceNode(`S${segmentIndex + 1}RotorPivot2`, "Items/Mechanisms", "pivot", {
    position: vector(x + 2580, baseY - 310),
    radius: "105",
    count: "4",
    speed: fmt(-8 - stage.id * 0.45),
    offset: "1.1"
  }));
  for (let index = 0; index < 3; index += 1) {
    nodes.push(instanceNode(`S${segmentIndex + 1}Tipping${index + 1}`, "Items/Platforms", "tippingLog", {
      position: vector(x + 1850 + index * 420, baseY - 110 - index * 35)
    }));
  }
  addCoinArc(nodes, `S${segmentIndex + 1}RotorA`, x + 260, baseY - 80, 8, 64, 70);
  addCoinArc(nodes, `S${segmentIndex + 1}RotorB`, x + 2050, baseY - 250, 9, 70, 90);
}

function buildFlight(nodes, segmentIndex, stage) {
  const { x, baseY } = addMainTerrain(nodes, segmentIndex, stage);
  addEnemyLine(nodes, `S${segmentIndex + 1}`, "parakoopa", x + 520, baseY - 170, 5, 610);
  addEnemyLine(nodes, `S${segmentIndex + 1}`, "goonie", x + 260, baseY - 300, 6, 570);
  for (let index = 0; index < 5; index += 1) {
    nodes.push(instanceNode(`S${segmentIndex + 1}FlightWood${index + 1}`, "Items/Platforms", "wood", {
      position: vector(x + 720 + index * 600, baseY - 100 - (index % 3) * 90)
    }));
  }
  addCoinArc(nodes, `S${segmentIndex + 1}FlightA`, x + 300, baseY - 245, 10, 70, 120);
  addCoinArc(nodes, `S${segmentIndex + 1}FlightB`, x + 2200, baseY - 190, 8, 75, 85);
  nodes.push(instanceNode(`S${segmentIndex + 1}FlightBlueCoin`, "Items/Pickups", "blueCoin", {
    position: vector(x + 3320, baseY - 210)
  }));
}

function buildGauntlet(nodes, segmentIndex, stage) {
  const { x, baseY } = addMainTerrain(nodes, segmentIndex, stage, stage.id >= 9);
  addEnemyLine(nodes, `S${segmentIndex + 1}`, "goomba", x + 380, baseY - 22, 3, 210);
  addEnemyLine(nodes, `S${segmentIndex + 1}`, "bobomb", x + 1450, baseY - 22, 3, 260);
  addEnemyLine(nodes, `S${segmentIndex + 1}`, "parakoopa", x + 2300, baseY - 220, 3, 430);
  for (let index = 0; index < 4; index += 1) {
    nodes.push(instanceNode(`S${segmentIndex + 1}GauntletBox${index + 1}`, "Items/Platforms", "box", {
      position: vector(x + 1050 + index * 72, baseY - 36 - (index % 2) * 72)
    }));
  }
  for (let index = 0; index < 4; index += 1) {
    nodes.push(instanceNode(`S${segmentIndex + 1}GauntletCloud${index + 1}`, "Items/Platforms", "cloud", {
      position: vector(x + 2100 + index * 390, baseY - 270 - (index % 2) * 90),
      width: "2"
    }));
  }
  nodes.push(instanceNode(`S${segmentIndex + 1}GauntletPivot`, "Items/Mechanisms", "pivot", {
    position: vector(x + 1900, baseY - 260),
    radius: "92",
    count: "4",
    speed: fmt(10 + stage.id * 0.5),
    offset: "0.8"
  }));
  nodes.push(instanceNode(`S${segmentIndex + 1}GauntletRotor`, "Items/Mechanisms", "rotating", {
    position: vector(x + 3250, baseY - 155),
    size: vector(96, 96),
    speed: fmt(1.25 + stage.id * 0.03),
    wait: fmt(62 - Math.min(stage.id, 9)),
    type: "1"
  }));
  addCoinArc(nodes, `S${segmentIndex + 1}GauntletA`, x + 260, baseY - 80, 8, 65, 65);
  addCoinArc(nodes, `S${segmentIndex + 1}GauntletB`, x + 2080, baseY - 350, 10, 70, 110);
  nodes.push(instanceNode(`S${segmentIndex + 1}GauntletBottle`, "Items/Pickups", "bottle", {
    position: vector(x + 3000, baseY - 390)
  }));
}

function buildFinale(nodes, segmentIndex, stage) {
  buildGauntlet(nodes, segmentIndex, stage);
  const x = segmentIndex * segmentWidth;
  for (let index = 0; index < 5; index += 1) {
    nodes.push(instanceNode(`S${segmentIndex + 1}FinaleRotor${index + 1}`, "Items/Mechanisms", "rotating", {
      position: vector(x + 900 + index * 510, -120 - (index % 2) * 120),
      size: vector(72, 72),
      speed: fmt((index % 2 === 0 ? 1 : -1) * 1.6),
      wait: "48",
      type: "1"
    }));
  }
  addEnemyLine(nodes, `S${segmentIndex + 1}Final`, "goonie", x + 500, -340, 5, 630);
  addCoinArc(nodes, `S${segmentIndex + 1}Finale`, x + 420, -260, 12, 76, 155);
}

const builders = {
  meadow: buildMeadow,
  lake: buildLake,
  bomb: buildBomb,
  fungus: buildFungus,
  sky: buildSky,
  rotor: buildRotor,
  flight: buildFlight,
  gauntlet: buildGauntlet,
  finale: buildFinale
};

function buildStageLegacy(stage) {
  const nodes = [];
  nodes.push(plainNode("Main", "Node2D", ""));
  nodes.push(instanceNode("BGT1", ".", "background"));
  nodes.push(instanceNode("CameraArea", ".", "camera", {
    visible: "false",
    polygon: packed([[-180, -1050], [levelWidth + 180, -1050], [levelWidth + 180, 980], [-180, 980]])
  }));
  nodes.push(instanceNode("Player", ".", "player", {
    position: vector(140, stage.heights[0] - 58)
  }));
  nodes.push(plainNode("Terrain", "Node2D"));
  nodes.push(plainNode("Items", "Node2D"));
  nodes.push(plainNode("Coins", "Node2D", "Items"));
  nodes.push(plainNode("Enemies", "Node2D", "Items"));
  nodes.push(plainNode("Platforms", "Node2D", "Items"));
  nodes.push(plainNode("Mechanisms", "Node2D", "Items"));
  nodes.push(plainNode("Pickups", "Node2D", "Items"));
  nodes.push(plainNode("Decoration", "Node2D", "Items"));
  nodes.push(plainNode("Water", "Node2D"));

  nodes.push(instanceNode("LevelIntro", "Items", "sign", {
    position: vector(310, 185),
    lines: `Array[String]([${JSON.stringify(`[@n,老师快跑]${stage.title}`)}, ${JSON.stringify("本关包含十个大型段落。沿主路线前进；高空失足会落到下方回收路线，不会跳出本关。")}])`
  }));

  for (let index = 0; index < segmentCount; index += 1) {
    const theme = stage.themes[index];
    addSegmentMarker(nodes, index, theme, stage);
    if (["fungus", "sky", "rotor", "flight", "gauntlet", "finale"].includes(theme)) {
      addRecoveryRoute(nodes, index, stage);
    }
    builders[theme](nodes, index, stage);
  }

  const nextScene = stage.id < stages.length
    ? stages[stage.id].resource
    : mainMenuResource;
  nodes.push(instanceNode("FinishWarp", ".", "warp", {
    position: vector(levelWidth - 90, -60),
    sweep_direction: vector(-1, 0),
    spawn_location: stage.id < stages.length ? vector(140, stages[stage.id].heights[0] - 58) : vector(110, 153),
    scene_path: JSON.stringify(nextScene),
    size: vector(80, 2100)
  }));
  nodes.push(instanceNode("VoidRescue", ".", "death", {
    visible: "false",
    position: vector(0, 1120),
    polygon: packed([[-500, 0], [levelWidth + 1000, 0], [levelWidth + 1000, 500], [-500, 500]])
  }));
  nodes.push(instanceNode("FinishBlueCoin", "Items/Pickups", "blueCoin", {
    position: vector(levelWidth - 360, 90)
  }));

  const extResources = Object.entries(resources)
    .map(([key, path]) => `[ext_resource type="PackedScene" path="${path}" id="${resourceIds[key]}"]`)
    .join("\n");
  const scene = `[gd_scene load_steps=${Object.keys(resources).length + 1} format=3]\n\n${extResources}\n\n${nodes.join("\n").trimEnd()}\n`;
  mkdirSync(dirname(stage.output), { recursive: true });
  writeFileSync(stage.output, scene, "utf8");
}

function buildStage(stage) {
  const context = { stage, stages, resources, resourceIds, mainMenuResource };
  const v4Builder = v4Builders.get(stage.id);
  const scene = v4Builder
    ? v4Builder(context)
    : buildV3StageScene({ ...context, segmentWidth });
  mkdirSync(dirname(stage.output), { recursive: true });
  writeFileSync(stage.output, scene, "utf8");
}

function writeLlrSupportResources() {
  mkdirSync(shuttleRoot, { recursive: true });
  writeFileSync(shuttleScriptPath, shuttleScriptSource, "utf8");
  writeFileSync(shuttleScenePath, shuttleSceneSource, "utf8");
  mkdirSync(springRoot, { recursive: true });
  writeFileSync(springScriptPath, springScriptSource, "utf8");
  writeFileSync(springScenePath, springSceneSource, "utf8");
  mkdirSync(conveyorRoot, { recursive: true });
  writeFileSync(conveyorScriptPath, conveyorScriptSource, "utf8");
  writeFileSync(conveyorScenePath, conveyorSceneSource, "utf8");
  mkdirSync(poundGateRoot, { recursive: true });
  writeFileSync(poundGateScriptPath, poundGateScriptSource, "utf8");
  writeFileSync(poundGateScenePath, poundGateSceneSource, "utf8");
  mkdirSync(coinGateRoot, { recursive: true });
  writeFileSync(coinGateScriptPath, coinGateScriptSource, "utf8");
  writeFileSync(coinGateScenePath, coinGateSceneSource, "utf8");
  mkdirSync(directorRoot, { recursive: true });
  writeFileSync(directorScriptPath, readFileSync(directorScriptSourcePath, "utf8"), "utf8");
  writeFileSync(directorScenePath, readFileSync(directorSceneSourcePath, "utf8"), "utf8");
  mkdirSync(objectiveTargetRoot, { recursive: true });
  writeFileSync(objectiveTargetScriptPath, readFileSync(objectiveTargetScriptSourcePath, "utf8"), "utf8");
  writeFileSync(objectiveTargetScenePath, readFileSync(objectiveTargetSceneSourcePath, "utf8"), "utf8");
  writeFileSync(breakableBoxScriptPath, readFileSync(breakableBoxScriptSourcePath, "utf8"), "utf8");

  let waterViewportScript = readFileSync(waterViewportScriptPath, "utf8").replace(/\r\n/g, "\n");
  if (!waterViewportScript.includes("var _llr_water_extents := Vector2.ZERO")) {
    waterViewportScript = replaceOnce(
      waterViewportScript,
      "var current_frame = 0",
      "var current_frame = 0\nvar _llr_water_extents := Vector2.ZERO",
      "water extent state"
    );
    waterViewportScript = replaceOnce(
      waterViewportScript,
      "\tvar size_extents = max_vec - min_vec",
      "\tvar size_extents = max_vec - min_vec\n\t_llr_water_extents = size_extents",
      "water extent capture"
    );
    waterViewportScript = replaceOnce(
      waterViewportScript,
      "\nfunc _draw():",
      "\nfunc _physics_process(_delta):\n\tif !Engine.is_editor_hint() and detection_area != null and _llr_water_extents != Vector2.ZERO:\n\t\tdetection_area.top_left_corner = global_position - _llr_water_extents / 2\n\n\nfunc _draw():",
      "moving water coordinate sync"
    );
  }
  if (
    !waterViewportScript.includes("detection_area.top_left_corner = global_position - _llr_water_extents / 2") ||
    !waterViewportScript.includes("var _llr_water_extents := Vector2.ZERO")
  ) {
    throw new Error("Moving water coordinate patch was not applied");
  }
  writeFileSync(waterViewportScriptPath, waterViewportScript, "utf8");

  let thwompScript = readFileSync(thwompScriptPath, "utf8").replace(/\r\n/g, "\n");
  thwompScript = thwompScript.replace(
    /enum F \{\n\tIDLE = 0,?\n\tBLINK = 1,?\n\tANGRY = 2,?\n\tLOOKLEFT = 3,?\n\tLOOKRIGHT = 4,?\n\}/,
    "enum F {\n\tIDLE = 0,\n\tBLINK = 1,\n\tANGRY = 2,\n\tLOOKLEFT = 3,\n\tLOOKRIGHT = 4,\n}"
  );
  if (!thwompScript.includes("register_thwomp_impact")) {
    thwompScript = replaceOnce(
      thwompScript,
      "extends StaticBody2D\n",
      "extends StaticBody2D\n\n\nsignal landed(collider)\n",
      "Thwomp landed signal"
    );
    thwompScript = replaceOnce(
      thwompScript,
      "\t\t\tvar landed = false\n\t\t\tvar pushup = 0",
      "\t\t\tvar has_landed = false\n\t\t\tvar pushup = 0\n\t\t\tvar impact_colliders: Array[Object] = []",
      "Thwomp impact collider state"
    );
    thwompScript = replaceOnce(
      thwompScript,
      "\t\t\t\tif raycast.is_colliding():\n\t\t\t\t\tlanded = true\n\t\t\t\t\t\n\t\t\t\t\tif pushup < raycast.get_collision_point().y:",
      "\t\t\t\tif raycast.is_colliding():\n\t\t\t\t\thas_landed = true\n\t\t\t\t\tvar collider = raycast.get_collider()\n\t\t\t\t\tif is_instance_valid(collider) and !impact_colliders.has(collider):\n\t\t\t\t\t\timpact_colliders.append(collider)\n\t\t\t\t\t\n\t\t\t\t\tif pushup < raycast.get_collision_point().y:",
      "Thwomp impact collider capture"
    );
    thwompScript = replaceOnce(
      thwompScript,
      "\t\t\tif landed:\n\t\t\t\tglobal_position.y = pushup-_groundref",
      "\t\t\tif has_landed:\n\t\t\t\tglobal_position.y = pushup-_groundref",
      "Thwomp landed state rename"
    );
    thwompScript = replaceOnce(
      thwompScript,
      "\t\t\t\tdustright.emitting = true\n\t\t\t\t_switch_state(S.GROUNDED)",
      "\t\t\t\tdustright.emitting = true\n\t\t\t\tfor collider in impact_colliders:\n\t\t\t\t\tif collider.has_method(\"register_thwomp_impact\"):\n\t\t\t\t\t\tcollider.register_thwomp_impact(self)\n\t\t\t\t\tlanded.emit(collider)\n\t\t\t\t_switch_state(S.GROUNDED)",
      "Thwomp impact delivery"
    );
  }
  if (!/enum F \{\n\tIDLE = 0,\n\tBLINK = 1,/.test(thwompScript)) {
    throw new Error("Thwomp enum compatibility patch was not applied");
  }
  if (!thwompScript.includes('collider.register_thwomp_impact(self)')) {
    throw new Error("Thwomp objective impact patch was not applied");
  }
  writeFileSync(thwompScriptPath, thwompScript, "utf8");

  let rotatingBlockScript = readFileSync(rotatingBlockScriptPath, "utf8").replace(/\r\n/g, "\n");
  if (!rotatingBlockScript.includes("func llr_calibrate_phase()")) {
    rotatingBlockScript = replaceOnce(
      rotatingBlockScript,
      "\nfunc _physics_process(_delta):",
      "\nfunc llr_calibrate_phase() -> void:\n\ttimer = 0\n\tturning = false\n\ttotal_interval = 0\n\trotation = angle_offset\n\n\nfunc _physics_process(_delta):",
      "Rotating block phase calibration"
    );
  }
  if (!rotatingBlockScript.includes("func llr_calibrate_phase()")) {
    throw new Error("Rotating block phase calibration patch was not applied");
  }
  writeFileSync(rotatingBlockScriptPath, rotatingBlockScript, "utf8");

  let rebindScript = readFileSync(rebindOptionScriptPath, "utf8").replace(/\r\n/g, "\n");
  if (!rebindScript.includes("if !is_node_ready() or !is_instance_valid(key_list):")) {
    rebindScript = rebindScript.replace(
      "func update_list():\n\tkey_list.text = join_action_array(InputMap.action_get_events(action_id))",
      "func update_list():\n\tif !is_node_ready() or !is_instance_valid(key_list):\n\t\treturn\n\tkey_list.text = join_action_array(InputMap.action_get_events(action_id))"
    );
  }
  if (!rebindScript.includes("if !is_node_ready() or !is_instance_valid(key_list):")) {
    throw new Error("Rebind option node-readiness guard was not applied");
  }
  writeFileSync(rebindOptionScriptPath, rebindScript, "utf8");
}

const extrasDeclarations = `
const LLR_EXTRA_LEVELS = [
${stages.map((stage) => `\t{"title": "${stage.title}", "description": "${stage.description}", "path": "${stage.resource}"}`).join(",\n")}
]

var show_extras = false
var extras_control: ColorRect
var extras_first_button: Button`;

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
\tpanel.custom_minimum_size = Vector2(604, 346)
\tcenter.add_child(panel)

\tvar margin := MarginContainer.new()
\tfor side in ["margin_left", "margin_top", "margin_right", "margin_bottom"]:
\t\tmargin.add_theme_constant_override(side, 8)
\tpanel.add_child(margin)

\tvar column := VBoxContainer.new()
\tcolumn.add_theme_constant_override("separation", 4)
\tmargin.add_child(column)

\tvar title := Label.new()
\ttitle.text = "老师快跑：完整流程"
\ttitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
\ttitle.add_theme_font_size_override("font_size", 19)
\tcolumn.add_child(title)

\tvar hint := Label.new()
\thint.text = "从任意关开始；抵达终点会自动进入下一关"
\thint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
\thint.modulate = Color(0.78, 0.88, 1.0, 1.0)
\tcolumn.add_child(hint)

\tvar grid := GridContainer.new()
\tgrid.columns = 2
\tgrid.add_theme_constant_override("h_separation", 8)
\tgrid.add_theme_constant_override("v_separation", 4)
\tcolumn.add_child(grid)

\tfor level in LLR_EXTRA_LEVELS:
\t\tvar button := Button.new()
\t\tbutton.text = level["title"]
\t\tbutton.tooltip_text = level["description"]
\t\tbutton.custom_minimum_size = Vector2(286, 30)
\t\tbutton.focus_mode = Control.FOCUS_ALL
\t\tbutton.pressed.connect(_launch_extra_level.bind(level["path"]))
\t\tgrid.add_child(button)
\t\tif extras_first_button == null:
\t\t\textras_first_button = button

\tvar description := Label.new()
\tdescription.text = "十关均为 V4 长流程事件关卡；失足有实体回收路线"
\tdescription.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
\tdescription.modulate = Color(1.0, 0.86, 0.48, 1.0)
\tcolumn.add_child(description)

\tvar extras_back_button := Button.new()
\textras_back_button.text = "返回主菜单"
\textras_back_button.custom_minimum_size = Vector2(0, 30)
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
\t_menu_to_scene(scene)`;

function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) {
    throw new Error(`Missing block while patching ${label}`);
  }
  return text.replace(from, to);
}

function patchMainMenu() {
  let menu = readFileSync(mainMenuPath, "utf8").replace(/\r\n/g, "\n");

  menu = menu.replace(
    /\t\t\t2:\n\t\t\t\t(?:_menu_to_scene\("res:\/\/scenes\/levels\/llr_complete\/llr_complete_1\.tscn"\)|_show_extras_message\(\)|_open_extras_menu\(\))/,
    "\t\t\t2:\n\t\t\t\t_open_extras_menu()"
  );

  if (menu.includes("const LLR_EXTRA_LEVELS = [")) {
    menu = menu.replace(
      /const LLR_EXTRA_LEVELS = \[[\s\S]*?\n\]\n\nvar show_extras = false\nvar extras_control: ColorRect\nvar extras_first_button: Button/,
      extrasDeclarations
    );
  } else {
    menu = replaceOnce(
      menu,
      "@onready var preview_orb = $PreviewOrb\n",
      `@onready var preview_orb = $PreviewOrb\n\n${extrasDeclarations}\n`,
      "Extras declarations"
    );
  }

  const existingMethods = /func _ready\(\) -> void:\n\t_build_extras_menu\(\)[\s\S]*?func _launch_extra_level\(scene: String\) -> void:\n\tshow_extras = false\n\textras_control\.visible = false\n\t_menu_to_scene\(scene\)/;
  if (existingMethods.test(menu)) {
    menu = menu.replace(existingMethods, extrasMethods);
  } else {
    menu = replaceOnce(
      menu,
      "\n\nfunc _cycle_increment(increment_direction: int) -> void:",
      `\n\n${extrasMethods}\n\n\nfunc _cycle_increment(increment_direction: int) -> void:`,
      "Extras methods"
    );
  }

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
    "func _touch_cycle(step):\n\tif !show_options:",
    "func _touch_cycle(step):\n\tif !show_options and !show_extras:"
  );

  if (!menu.includes("\t\t\t2:\n\t\t\t\t_open_extras_menu()")) {
    throw new Error("Extras menu route was not patched");
  }
  writeFileSync(mainMenuPath, menu, "utf8");
}

function patchExportSources() {
  if (existsSync(designerItemsLegacyPath) && !existsSync(designerItemsPath)) {
    renameSync(designerItemsLegacyPath, designerItemsPath);
  }
  if (!existsSync(designerItemsPath)) {
    throw new Error("Level Designer XML item catalog is missing");
  }

  let designer = readFileSync(designerScriptPath, "utf8").replace(/\r\n/g, "\n");
  designer = designer
    .replaceAll("items.xml.tres", "items.xml")
    .replace("\n\tserializer.run_tests(true)", "");
  if (!designer.includes('parser.open("res://scenes/menus/level_designer/items.xml")')) {
    throw new Error("Level Designer XML path was not patched");
  }
  if (designer.includes("serializer.run_tests(true)")) {
    throw new Error("Level Designer production serializer self-test was not removed");
  }
  writeFileSync(designerScriptPath, designer, "utf8");

  let serializer = readFileSync(designerSerializerPath, "utf8").replace(/\r\n/g, "\n");
  serializer = serializer
    .replace("0, half - 1", "0, half")
    .replace("half, size - 1", "half, size")
    .replace(
      "if abs(val) > (1 << ((byte_count << 3) - 1)):\n\t\tlog_error",
      "var sign_bit = 1 << ((byte_count << 3) - 1)\n\tif val < -sign_bit or val > sign_bit - 1:\n\t\tlog_error"
    );
  if (!serializer.includes("\t\t\t\t0, half\n") || !serializer.includes("\t\t\t\thalf, size\n") || !serializer.includes("val > sign_bit - 1")) {
    throw new Error("Level Designer signed vector serialization was not patched");
  }
  writeFileSync(designerSerializerPath, serializer, "utf8");
  writeFileSync(designerMusicPath, designerMusicSource, "utf8");

  let singletonScene = readFileSync(singletonScenePath, "utf8").replace(/\r\n/g, "\n");
  singletonScene = singletonScene
    .replace('[gd_scene load_steps=16 format=3 uid="uid://bmo0pramhjdig"]', '[gd_scene load_steps=15 format=3 uid="uid://bmo0pramhjdig"]')
    .replace(/^\[ext_resource[^\n]*tutorial_1\.mp3[^\n]*\]\n/m, "")
    .replace(/^stream = ExtResource\("6"\)\n/m, "");
  if (singletonScene.includes("tutorial_1.mp3") || singletonScene.includes('stream = ExtResource("6")')) {
    throw new Error("Dangling tutorial music resource was not removed");
  }
  writeFileSync(singletonScenePath, singletonScene, "utf8");

  let music = readFileSync(musicScriptPath, "utf8").replace(/\r\n/g, "\n");
  music = music
    .replace(
      'if get_tree().get_current_scene().get_scene_file_path().count("tutorial"):',
      'if stream != null and get_tree().get_current_scene().get_scene_file_path().count("tutorial"):'
    )
    .replace(
      'if current_scene.get_scene_file_path().count("tutorial") and !playing:',
      'if stream != null and current_scene.get_scene_file_path().count("tutorial") and !playing:'
    );
  if ((music.match(/stream != null/g) || []).length < 2) {
    throw new Error("Empty tutorial music stream guards were not patched");
  }
  writeFileSync(musicScriptPath, music, "utf8");

  let presets = readFileSync(exportPresetsPath, "utf8").replace(/\r\n/g, "\n");
  presets = presets.replace(
    /(\[preset\.\d+\]\n\nname="Web"[\s\S]*?\ninclude_filter=)"[^"]*"/,
    '$1"*.xml"'
  );
  if (!/\[preset\.\d+\]\n\nname="Web"[\s\S]*?\ninclude_filter="\*\.xml"/.test(presets)) {
    throw new Error("Web export XML include filter was not patched");
  }
  writeFileSync(exportPresetsPath, presets, "utf8");
}

writeLlrSupportResources();
for (const stage of stages) {
  buildStage(stage);
}
patchMainMenu();
patchExportSources();

console.log(`llr Extras all-V4 campaign patch complete: ${v4Blueprints.size} event stages`);
