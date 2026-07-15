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


class DirectorTarget:
	extends Node2D
	var speed := 4.5


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

	var shuttle = load("res://classes/solid/llr_shuttle/llr_shuttle.tscn").instantiate()
	shuttle.travel = Vector2(240, -80)
	shuttle.travel_seconds = 2.0
	shuttle.pause_seconds = 0.0
	shuttle.phase = 0.25
	add_child(shuttle)
	await get_tree().process_frame
	if shuttle.get_node("MovingPlatform").position.length() < 40.0:
		fail("Shuttle phase did not place the platform along its route")
		return

	var director_target := DirectorTarget.new()
	director_target.name = "DirectorTarget"
	add_child(director_target)
	var reveal_target := Node2D.new()
	reveal_target.name = "RevealTarget"
	reveal_target.visible = false
	add_child(reveal_target)
	var move_target := Node2D.new()
	move_target.name = "MoveTarget"
	add_child(move_target)
	var director = load("res://classes/zone/llr_set_piece_director/llr_set_piece_director.tscn").instantiate()
	director.name = "Director"
	director.target_paths.append(NodePath("../DirectorTarget"))
	director.reveal_paths.append(NodePath("../RevealTarget"))
	director.move_paths.append(NodePath("../MoveTarget"))
	director.move_offset = Vector2(0, -120)
	director.move_seconds = 0.0
	director.numeric_multiplier = -1.0
	director.checkpoint = false
	add_child(director)
	await get_tree().process_frame
	player.name = "Player"
	director._on_Trigger_body_entered(player)
	if (
		!director.triggered
		or director_target.get("speed") != -4.5
		or !reveal_target.visible
		or move_target.position != Vector2(0, -120)
	):
		fail("Set-piece director did not apply its one-shot state change")
		return

	var objective_target = load("res://classes/solid/llr_objective_target/llr_objective_target.tscn").instantiate()
	objective_target.name = "ObjectiveTarget"
	objective_target.objective_id = &"mechanism_test"
	add_child(objective_target)
	var objective_move_target := Node2D.new()
	objective_move_target.name = "ObjectiveMoveTarget"
	add_child(objective_move_target)
	var objective_director = load("res://classes/zone/llr_set_piece_director/llr_set_piece_director.tscn").instantiate()
	objective_director.name = "ObjectiveDirector"
	objective_director.objective_paths.append(NodePath("../ObjectiveTarget"))
	objective_director.move_paths.append(NodePath("../ObjectiveMoveTarget"))
	objective_director.move_offset = Vector2(0, -96)
	objective_director.move_seconds = 0.0
	objective_director.wait_for_objectives = true
	objective_director.checkpoint = false
	add_child(objective_director)
	await get_tree().process_frame
	player.state = player.S.POUND
	player.pound_state = player.Pound.LAND
	objective_target._on_PlayerHitArea_body_entered(player)
	await get_tree().process_frame
	if (
		!objective_target.has_completed
		or !objective_director.triggered
		or objective_move_target.position != Vector2(0, -96)
	):
		fail("Objective target did not drive a physical set-piece change")
		return

	var thwomp_target = load("res://classes/solid/llr_objective_target/llr_objective_target.tscn").instantiate()
	thwomp_target.accepted_hits = thwomp_target.THWOMP
	add_child(thwomp_target)
	await get_tree().process_frame
	if !thwomp_target.register_thwomp_impact(self) or !thwomp_target.has_completed:
		fail("Objective target did not accept a Thwomp collider impact")
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
	print("LLR mechanism smoke test OK: spring, conveyor, shuttle, director, objective target, pound gate, red-coin gate")
	get_tree().quit(0)
