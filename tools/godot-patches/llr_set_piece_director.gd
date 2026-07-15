class_name LLRSetPieceDirector
extends Node2D


@export var trigger_size := Vector2(220, 190)
@export var target_paths: Array[NodePath] = []
@export var reveal_paths: Array[NodePath] = []
@export var hide_paths: Array[NodePath] = []
@export var move_paths: Array[NodePath] = []
@export var objective_paths: Array[NodePath] = []
@export var move_offset := Vector2.ZERO
@export_range(0.0, 4.0, 0.05) var move_seconds := 1.2
@export var numeric_property: StringName = &"speed"
@export var numeric_multiplier := -1.0
@export var target_method: StringName = &""
@export var announcement := ""
@export var checkpoint := true
@export var one_shot := true
@export var wait_for_objectives := false
@export_range(0, 3, 1) var forced_nozzle := 0
@export var lock_nozzle := false

var triggered := false
var announcement_tween: Tween


func _ready() -> void:
	var rectangle := $Trigger/CollisionShape2D.shape.duplicate() as RectangleShape2D
	rectangle.size = trigger_size
	$Trigger/CollisionShape2D.shape = rectangle
	if wait_for_objectives:
		$Trigger.set_deferred("monitoring", false)
		for path in objective_paths:
			var objective := get_node_or_null(path)
			if objective == null:
				push_warning("LLR director objective is missing: %s" % path)
				continue
			var callback := Callable(self, "_on_objective_completed")
			if objective.has_signal("completed") and !objective.is_connected("completed", callback):
				objective.connect("completed", callback)
		call_deferred("_check_objectives")


func _on_Trigger_body_entered(body) -> void:
	if wait_for_objectives or body == null or body.name != "Player":
		return
	_activate(body)


func _physics_process(_delta: float) -> void:
	if triggered and lock_nozzle and forced_nozzle > 0:
		_force_player_nozzle(get_node_or_null("/root/Main/Player"))


func _on_objective_completed(_target = null, _objective_id = &"", _hit_kind = 0, _source = null) -> void:
	_check_objectives()


func _check_objectives() -> void:
	if !wait_for_objectives or (one_shot and triggered) or objective_paths.is_empty():
		return
	for path in objective_paths:
		var objective := get_node_or_null(path)
		if objective == null or !bool(objective.get("has_completed")):
			return
	_activate(get_node_or_null("/root/Main/Player"))


func _activate(body) -> void:
	if one_shot and triggered:
		return
	triggered = true
	_force_player_nozzle(body)
	for path in target_paths:
		var target := get_node_or_null(path)
		if target == null:
			push_warning("LLR director target is missing: %s" % path)
			continue
		if !target_method.is_empty():
			if target.has_method(target_method):
				target.call(target_method)
			else:
				push_warning("LLR director target method is missing: %s.%s" % [path, target_method])
			continue
		var current = target.get(numeric_property)
		if current is float or current is int:
			target.set(numeric_property, float(current) * numeric_multiplier)
	for path in reveal_paths:
		var target := get_node_or_null(path)
		if target != null:
			target.visible = true
	for path in hide_paths:
		var target := get_node_or_null(path)
		if target != null:
			target.visible = false
	for path in move_paths:
		var target := get_node_or_null(path) as Node2D
		if target == null:
			push_warning("LLR director move target is missing or not Node2D: %s" % path)
			continue
		var destination := target.position + move_offset
		if move_seconds <= 0.0:
			target.position = destination
		else:
			var movement := create_tween()
			movement.set_process_mode(Tween.TWEEN_PROCESS_PHYSICS)
			movement.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
			movement.tween_property(target, "position", destination, move_seconds)
	if checkpoint and body != null:
		var rescue := get_node_or_null("/root/Main/VoidRescue")
		if rescue != null and rescue.has_method("register_checkpoint"):
			rescue.register_checkpoint(body.global_position)
	_show_announcement()
	if one_shot:
		$Trigger.set_deferred("monitoring", false)


func _force_player_nozzle(body) -> void:
	if body == null or forced_nozzle <= 0 or forced_nozzle > 3:
		return
	var nozzles = body.get("collected_nozzles")
	if nozzles is Array and nozzles.size() >= forced_nozzle:
		nozzles[forced_nozzle - 1] = true
		body.set("collected_nozzles", nozzles)
	if body.get("current_nozzle") != null:
		body.set("current_nozzle", forced_nozzle)


func _show_announcement() -> void:
	if announcement.is_empty():
		return
	if announcement_tween != null and announcement_tween.is_valid():
		announcement_tween.kill()
	$Announcement.text = announcement
	$Announcement.visible = true
	$Announcement.modulate.a = 0.0
	announcement_tween = create_tween()
	announcement_tween.tween_property($Announcement, "modulate:a", 1.0, 0.12)
	announcement_tween.tween_interval(1.9)
	announcement_tween.tween_property($Announcement, "modulate:a", 0.0, 0.35)
	announcement_tween.tween_callback($Announcement.hide)
