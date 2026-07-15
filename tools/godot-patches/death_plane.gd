extends Polygon2D


const SAFE_GROUND_FRAMES := 6
const SAFE_HISTORY_LIMIT := 24
const SAFE_POSITION_SPACING := 40.0
const RESPAWN_LIFT := Vector2(0, -4)
const FLOOR_PROBE_START := Vector2(0, 10)
const FLOOR_PROBE_END := Vector2(0, 40)
const FLOOR_PROBE_X_OFFSETS := [-6.0, 0.0, 6.0]
const MAX_FLOOR_NORMAL_Y := -0.65
const PLAYER_NEUTRAL_STATE := 1

var _cached_player: Node2D
var _initial_spawn_position := Vector2.ZERO
var _has_initial_spawn := false
var _stable_ground_frames := 0
var _safe_positions: Array[Vector2] = []
var _checkpoint_positions: Array[Vector2] = []


func _ready():
	$Area2D/CollisionPolygon2D.polygon = polygon
	call_deferred("_seed_initial_spawn")


func _physics_process(_delta):
	var player = _find_player()
	if player == null:
		return
	if !_has_initial_spawn:
		_store_initial_spawn(player.global_position)
	if _can_remember_position(player):
		_stable_ground_frames += 1
		if _stable_ground_frames >= SAFE_GROUND_FRAMES:
			_remember_safe_position(player.global_position)
	else:
		_stable_ground_frames = 0


func _seed_initial_spawn():
	var player = _find_player()
	if player != null and !_has_initial_spawn:
		_store_initial_spawn(player.global_position)


func _find_player():
	if is_instance_valid(_cached_player):
		return _cached_player
	_cached_player = get_node_or_null("/root/Main/Player")
	return _cached_player


func _store_initial_spawn(spawn_position: Vector2):
	_initial_spawn_position = spawn_position
	_has_initial_spawn = true
	_remember_safe_position(spawn_position)


func register_checkpoint(checkpoint_position: Vector2):
	if _checkpoint_positions.is_empty() or _checkpoint_positions.back().distance_to(checkpoint_position) >= SAFE_POSITION_SPACING:
		_checkpoint_positions.append(checkpoint_position)
	else:
		_checkpoint_positions[-1] = checkpoint_position
	_remember_safe_position(checkpoint_position)


func _can_remember_position(player) -> bool:
	if $Area2D.overlaps_body(player):
		return false
	if player.get("dead") == true or player.get("swimming") == true:
		return false
	var player_velocity = player.get("vel")
	if player_velocity != null and abs(player_velocity.y) > 1.5:
		return false
	if player.has_method("get_ground_state"):
		return player.get_ground_state()
	return player is CharacterBody2D and player.is_on_floor()


func _remember_safe_position(safe_position: Vector2):
	if _safe_positions.is_empty():
		_safe_positions.append(safe_position)
		return
	if _safe_positions.back().distance_to(safe_position) < SAFE_POSITION_SPACING:
		_safe_positions[-1] = safe_position
	else:
		_safe_positions.append(safe_position)
	while _safe_positions.size() > SAFE_HISTORY_LIMIT:
		_safe_positions.pop_front()


func _on_Area2D_body_entered(body):
	var player = body if body and body.name == "Player" else _find_player()
	if player == null:
		return
	_rescue_player_from_void(player)


func _rescue_player_from_void(player):
	_reset_player_after_rescue(player)
	var respawn_position = _find_valid_respawn(player)
	player.global_position = respawn_position
	if player.get("vel") != null:
		player.vel = Vector2.ZERO
	_stable_ground_frames = 0
	if player.has_method("take_damage"):
		player.take_damage(1)
	Singleton.log_msg("掉出场地，已回到最近安全落脚点。")


func _reset_player_after_rescue(player):
	if player.has_method("switch_state"):
		player.switch_state(PLAYER_NEUTRAL_STATE)
	player.bouncing = false
	player.full_bounce = false
	player.locked = false
	player.swimming = false
	player.water_areas = 0
	player.swim_delay = false
	player.fludd_strain = false
	if player.has_method("end_fludd"):
		player.end_fludd()
	var camera = player.get_node_or_null("Camera")
	if camera != null:
		camera.offset = Vector2.ZERO


func _find_valid_respawn(player) -> Vector2:
	for index in range(_safe_positions.size() - 1, -1, -1):
		var candidate = _safe_positions[index] + RESPAWN_LIFT
		if _is_respawn_candidate_valid(player, candidate):
			return candidate
	for index in range(_checkpoint_positions.size() - 1, -1, -1):
		var checkpoint_candidate = _checkpoint_positions[index] + RESPAWN_LIFT
		if _is_respawn_candidate_valid(player, checkpoint_candidate):
			return checkpoint_candidate
	if _has_initial_spawn:
		return _initial_spawn_position + RESPAWN_LIFT
	return player.global_position + Vector2(0, -96)


func _is_respawn_candidate_valid(player, candidate: Vector2) -> bool:
	var space_state = get_world_2d().direct_space_state
	for offset_x in FLOOR_PROBE_X_OFFSETS:
		var offset := Vector2(offset_x, 0)
		var floor_query = PhysicsRayQueryParameters2D.create(
			candidate + FLOOR_PROBE_START + offset,
			candidate + FLOOR_PROBE_END + offset,
			player.collision_mask
		)
		floor_query.exclude = [player.get_rid()]
		var floor_hit := space_state.intersect_ray(floor_query)
		if floor_hit.is_empty():
			return false
		var floor_normal: Vector2 = floor_hit.get("normal", Vector2.ZERO)
		if floor_normal.y > MAX_FLOOR_NORMAL_Y:
			return false
	var hitbox = player.get_node_or_null("Hitbox")
	if hitbox == null or hitbox.shape == null:
		return true
	var shape_query = PhysicsShapeQueryParameters2D.new()
	shape_query.shape = hitbox.shape
	shape_query.transform = Transform2D(0.0, candidate + hitbox.position)
	shape_query.collision_mask = player.collision_mask
	shape_query.collide_with_areas = false
	shape_query.collide_with_bodies = true
	shape_query.exclude = [player.get_rid()]
	return space_state.intersect_shape(shape_query, 1).is_empty()
