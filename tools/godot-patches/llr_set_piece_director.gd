class_name LLRSetPieceDirector
extends Node2D


@export var trigger_size := Vector2(220, 190)
@export var target_paths: Array[NodePath] = []
@export var reveal_paths: Array[NodePath] = []
@export var hide_paths: Array[NodePath] = []
@export var numeric_property: StringName = &"speed"
@export var numeric_multiplier := -1.0
@export var announcement := ""
@export var checkpoint := true
@export var one_shot := true

var triggered := false
var announcement_tween: Tween


func _ready() -> void:
	var rectangle := $Trigger/CollisionShape2D.shape.duplicate() as RectangleShape2D
	rectangle.size = trigger_size
	$Trigger/CollisionShape2D.shape = rectangle


func _on_Trigger_body_entered(body) -> void:
	if body == null or body.name != "Player" or (one_shot and triggered):
		return
	triggered = true
	for path in target_paths:
		var target := get_node_or_null(path)
		if target == null:
			push_warning("LLR director target is missing: %s" % path)
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
	if checkpoint:
		var rescue := get_node_or_null("/root/Main/VoidRescue")
		if rescue != null and rescue.has_method("register_checkpoint"):
			rescue.register_checkpoint(body.global_position)
	_show_announcement()
	if one_shot:
		$Trigger.set_deferred("monitoring", false)


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
