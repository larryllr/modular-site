extends StaticBody2D

const COIN_PREFAB = preload("res://classes/pickup/coin/yellow/coin_yellow.tscn")
const PARTICLE_PREFAB = preload("./box_particle.tscn")
const BOOM_A = preload("./boom.wav")
const BOOM_B = preload("./box_break.wav")

@onready var pound_area = $PoundArea
@onready var spin_area = $SpinArea

var rng = RandomNumberGenerator.new()
var _pickup_ids = []
var _destroy_flag_id := -1
var _destroyed := false

@export var coin_count = 5
@export var persistent_destroy := false


func _ready():
	if persistent_destroy:
		_destroy_flag_id = FlagServer.claim_flag_id()
	_pickup_ids = FlagServer.claim_flag_id_array(coin_count)
	if persistent_destroy and FlagServer.get_flag_state(_destroy_flag_id):
		_destroyed = true
		queue_free()
		return
	rng.seed = hash(position.x + position.y * PI)
	$Sprite2D.frame = randi() % 3


func _process(_delta):
	if _destroyed:
		return
	for body in pound_area.get_overlapping_bodies():
		if _is_ground_pound(body):
			destroy()
			return
	for body in spin_area.get_overlapping_bodies():
		if body.has_method("is_spinning") and body.is_spinning():
			destroy()
			return


func _on_PoundArea_body_entered(body):
	if _is_ground_pound(body):
		destroy()


func _on_SpinArea_body_entered(body):
	if body.has_method("is_spinning") and body.is_spinning():
		destroy()


func _is_ground_pound(body) -> bool:
	if body == null or body.get("state") == null or body.get("pound_state") == null:
		return false
	return body.state == body.S.POUND and (
		body.pound_state == body.Pound.FALL or body.pound_state == body.Pound.LAND
	)


func destroy():
	if _destroyed:
		return
	_destroyed = true
	set_process(false)
	$CollisionShape2D.set_deferred("disabled", true)
	pound_area.set_deferred("monitoring", false)
	spin_area.set_deferred("monitoring", false)
	if persistent_destroy and _destroy_flag_id >= 0:
		FlagServer.set_flag_state(_destroy_flag_id, true)

	for _i in range(5):
		var inst = PARTICLE_PREFAB.instantiate()
		inst.position = position + Vector2((rng.randf() - 0.5) * 27, (rng.randf() - 0.5) * 27)
		inst.vel = Vector2((rng.randf() - 0.5) * 5, rng.randf() * -2.5)
		inst.get_node("AnimatedSprite2D").frame = rng.randi() % 7
		get_parent().call_deferred("add_child", inst)
	for _i in range(coin_count):
		var id = _pickup_ids[_i]
		if !FlagServer.get_flag_state(id):
			var inst = COIN_PREFAB.instantiate()
			inst.position = position
			inst.vel = Vector2((rng.randf() - 0.5) * 5.0, rng.randf() * -2.5)
			inst.dropped = true
			inst.get_pickup_node().assign_pickup_id(id)
			get_parent().call_deferred("add_child", inst)

	var sound
	if rng.randi() % 2 < 1:
		sound = BOOM_A
	else:
		sound = BOOM_B
	get_parent().add_child(ResidualSFX.new(sound, position))
	queue_free()
