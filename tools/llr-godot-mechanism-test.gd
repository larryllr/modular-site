extends Node


class FakePlayer:
	extends CharacterBody2D

	enum S {
		NEUTRAL = 1,
		POUND = 32,
	}
	enum Pound {
		NONE,
		SPIN,
		FALL,
		LAND,
	}

	var vel := Vector2.ZERO
	var state := S.NEUTRAL
	var pound_state := Pound.NONE
	var bouncing := false

	func off_ground() -> void:
		pass

	func switch_state(next_state: int) -> void:
		state = next_state


func fail(message: String) -> void:
	push_error(message)
	get_tree().quit(1)


func _ready() -> void:
	var player := FakePlayer.new()
	add_child(player)

	var spring = load("res://classes/solid/llr_spring/llr_spring.tscn").instantiate()
	add_child(spring)
	await get_tree().process_frame
	player.vel = Vector2(1.5, 3.0)
	spring._on_BounceArea_body_entered(player)
	if player.vel.y > -7.5 or player.state != player.S.NEUTRAL:
		fail("Spring did not launch the player cleanly")
		return

	var conveyor = load("res://classes/solid/llr_conveyor/llr_conveyor.tscn").instantiate()
	conveyor.width = 208.0
	conveyor.speed = -120.0
	add_child(conveyor)
	await get_tree().process_frame
	if abs(conveyor.get_node("CollisionShape2D").shape.size.x - 208.0) > 0.01:
		fail("Conveyor collision width did not match its visual width")
		return
	if conveyor.get_node("Arrows").scale.x >= 0.0:
		fail("Reverse conveyor arrows did not flip")
		return

	var pound_gate = load("res://classes/solid/llr_pound_gate/llr_pound_gate.tscn").instantiate()
	add_child(pound_gate)
	await get_tree().process_frame
	player.state = player.S.POUND
	player.pound_state = player.Pound.FALL
	if !pound_gate.is_pound_activation(player):
		fail("Pound gate did not recognize a landing ground pound")
		return
	pound_gate.open_gate()
	await get_tree().create_timer(0.75).timeout
	if !pound_gate.opened or pound_gate.get_node("Gate").collision_layer != 0:
		fail("Pound gate did not finish opening")
		return

	Singleton.red_coin_total = 0
	var coin_gate = load("res://classes/solid/llr_coin_gate/llr_coin_gate.tscn").instantiate()
	coin_gate.required_coins = 4
	add_child(coin_gate)
	await get_tree().process_frame
	Singleton.red_coin_total = 4
	coin_gate._process(0.016)
	await get_tree().create_timer(0.8).timeout
	if !coin_gate.opened or coin_gate.get_node("Gate").collision_layer != 0:
		fail("Red-coin gate did not open after four local red coins")
		return

	Singleton.red_coin_total = 0
	print("LLR mechanism smoke test OK: spring, conveyor, pound gate, red-coin gate")
	get_tree().quit(0)
