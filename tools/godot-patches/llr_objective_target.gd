@tool
class_name LLRObjectiveTarget
extends StaticBody2D


signal completed(target, objective_id, hit_kind, source)

enum {
	GROUND_POUND = 1,
	SPIN = 2,
	THWOMP = 4,
}

const ALL_HITS := GROUND_POUND | SPIN | THWOMP
const HIT_AREA_MARGIN := Vector2(8.0, 8.0)
const MINIMUM_SIZE := Vector2(24.0, 12.0)

@export var objective_id: StringName = &""
@export_flags("GROUND_POUND:1", "SPIN:2", "THWOMP:4") var accepted_hits: int = ALL_HITS:
	set(value):
		accepted_hits = value & ALL_HITS
		if is_inside_tree():
			queue_redraw()
@export var disable_collision_on_complete := false
@export var target_size := Vector2(96.0, 24.0):
	set(value):
		target_size = Vector2(
			maxf(absf(value.x), MINIMUM_SIZE.x),
			maxf(absf(value.y), MINIMUM_SIZE.y)
		)
		if is_node_ready():
			_apply_target_size()

var has_completed := false
var _player_hit_latches: Dictionary = {}

@onready var _solid_collision: CollisionShape2D = $CollisionShape2D
@onready var _player_hit_area: Area2D = $PlayerHitArea
@onready var _player_hit_collision: CollisionShape2D = $PlayerHitArea/CollisionShape2D


func _ready() -> void:
	_make_shapes_unique()
	_apply_target_size()


func _physics_process(_delta: float) -> void:
	if Engine.is_editor_hint() or has_completed:
		return
	for body in _player_hit_area.get_overlapping_bodies():
		_evaluate_player_hit(body)


func register_thwomp_impact(source) -> bool:
	return _register_hit(THWOMP, source)


func _on_PlayerHitArea_body_entered(body: Node2D) -> void:
	_evaluate_player_hit(body)


func _on_PlayerHitArea_body_exited(body: Node2D) -> void:
	_player_hit_latches.erase(body.get_instance_id())


func _evaluate_player_hit(body: Node) -> void:
	if Engine.is_editor_hint() or body == null or !is_instance_valid(body):
		return
	var instance_id := body.get_instance_id()
	var hit_kind := _get_player_hit_kind(body)
	if hit_kind == 0:
		_player_hit_latches.erase(instance_id)
		return
	if int(_player_hit_latches.get(instance_id, 0)) == hit_kind:
		return
	_player_hit_latches[instance_id] = hit_kind
	_register_hit(hit_kind, body)


func _get_player_hit_kind(body) -> int:
	if body.get("state") == null or body.get("pound_state") == null:
		return 0
	if body.state == body.S.POUND:
		if body.pound_state == body.Pound.SPIN:
			return 0
		if body.pound_state == body.Pound.FALL \
		or body.pound_state == body.Pound.LAND:
			return GROUND_POUND
		return 0
	if body.has_method("is_spinning") and body.is_spinning():
		return SPIN
	return 0


func _register_hit(hit_kind: int, source) -> bool:
	if hit_kind != GROUND_POUND and hit_kind != SPIN and hit_kind != THWOMP:
		return false
	if (accepted_hits & hit_kind) == 0 or has_completed:
		return false

	has_completed = true
	queue_redraw()
	_player_hit_area.set_deferred("monitoring", false)
	if disable_collision_on_complete:
		_solid_collision.set_deferred("disabled", true)

	completed.emit(self, objective_id, hit_kind, source)
	return true


func _make_shapes_unique() -> void:
	var solid_shape := _solid_collision.shape as RectangleShape2D
	if solid_shape != null:
		_solid_collision.shape = solid_shape.duplicate()
	var hit_shape := _player_hit_collision.shape as RectangleShape2D
	if hit_shape != null:
		_player_hit_collision.shape = hit_shape.duplicate()


func _apply_target_size() -> void:
	var solid_shape := _solid_collision.shape as RectangleShape2D
	if solid_shape != null:
		solid_shape.size = target_size
	var hit_shape := _player_hit_collision.shape as RectangleShape2D
	if hit_shape != null:
		hit_shape.size = target_size + HIT_AREA_MARGIN
	queue_redraw()


func _draw() -> void:
	var half_size := target_size * 0.5
	var panel := Rect2(-half_size, target_size)
	var accent := Color(0.35, 1.0, 0.58, 1.0) if has_completed else Color(1.0, 0.72, 0.18, 1.0)
	var fill := Color(0.08, 0.28, 0.22, 1.0) if has_completed else Color(0.10, 0.16, 0.25, 1.0)

	draw_rect(panel, Color(0.025, 0.045, 0.07, 1.0), true)
	draw_rect(panel.grow(-3.0), fill, true)
	draw_rect(Rect2(panel.position, Vector2(panel.size.x, minf(4.0, panel.size.y))), accent, true)
	draw_rect(panel, accent, false, 2.0, true)

	var icon_radius := minf(half_size.y - 3.0, minf(half_size.x * 0.22, 9.0))
	icon_radius = maxf(icon_radius, 3.0)
	if has_completed:
		_draw_completion_mark(icon_radius, accent)
	else:
		_draw_target_mark(icon_radius, accent, fill)
		_draw_hit_markers(half_size, accent)


func _draw_target_mark(radius: float, accent: Color, fill: Color) -> void:
	draw_circle(Vector2.ZERO, radius, accent)
	draw_circle(Vector2.ZERO, radius * 0.62, fill)
	draw_circle(Vector2.ZERO, radius * 0.25, accent)


func _draw_completion_mark(radius: float, accent: Color) -> void:
	draw_circle(Vector2.ZERO, radius, Color(0.03, 0.12, 0.10, 1.0))
	var points := PackedVector2Array([
		Vector2(-radius * 0.55, 0.0),
		Vector2(-radius * 0.12, radius * 0.42),
		Vector2(radius * 0.62, -radius * 0.48),
	])
	draw_polyline(points, accent, maxf(2.0, radius * 0.28), true)


func _draw_hit_markers(half_size: Vector2, accent: Color) -> void:
	var kinds := [GROUND_POUND, SPIN, THWOMP]
	var marker_radius := minf(2.0, maxf(1.0, target_size.y * 0.07))
	var spacing := marker_radius * 3.0
	var start_x := half_size.x - 5.0 - spacing * 2.0
	for index in range(kinds.size()):
		var color := accent if (accepted_hits & kinds[index]) != 0 else Color(0.18, 0.22, 0.28, 1.0)
		draw_circle(Vector2(start_x + index * spacing, half_size.y - 5.0), marker_radius, color)
