extends SceneTree


var failed := false


func fail(message: String) -> void:
	if failed:
		return
	failed = true
	push_error(message)
	quit(1)


func require_node(root: Node, name: String) -> Node:
	var node := root.find_child(name, true, false)
	if node == null:
		fail("Missing runtime node: %s" % name)
	return node


func load_stage(index: int) -> Node:
	var path := "res://scenes/levels/llr_complete/llr_complete_%d.tscn" % index
	var flag_server := root.get_node_or_null("FlagServer")
	if flag_server != null:
		flag_server.reset_assign_id()
	var error := change_scene_to_file(path)
	if error != OK:
		fail("Could not load stage %d: %s" % [index, error_string(error)])
		return null
	await process_frame
	await physics_frame
	await process_frame
	if current_scene == null:
		fail("Stage %d did not become the current scene" % index)
	return current_scene


func floor_hit(stage: Node2D, point: Vector2, rise := 48.0, drop := 220.0) -> Dictionary:
	var query := PhysicsRayQueryParameters2D.create(
		point - Vector2(0, rise),
		point + Vector2(0, drop),
		1
	)
	query.collide_with_areas = false
	return stage.get_world_2d().direct_space_state.intersect_ray(query)


func assert_floor(stage: Node2D, label: String, point: Vector2, drop := 220.0) -> Dictionary:
	var hit := floor_hit(stage, point, 48.0, drop)
	if hit.is_empty():
		fail("No physical recovery floor at %s (%s)" % [label, point])
	return hit


func assert_headroom(stage: Node2D, label: String, floor_position: Vector2, minimum := 120.0) -> void:
	var query := PhysicsRayQueryParameters2D.create(
		floor_position - Vector2(0, 8),
		floor_position - Vector2(0, minimum),
		1
	)
	query.collide_with_areas = false
	var hit := stage.get_world_2d().direct_space_state.intersect_ray(query)
	if !hit.is_empty():
		fail("Low collision ceiling remains above %s: floor=%s ceiling=%s" % [
			label,
			floor_position,
			hit.position
		])


func wait_physics_frames(count: int) -> void:
	for _index in range(count):
		await physics_frame


func probe_stage_one() -> void:
	var stage := await load_stage(1) as Node2D
	if failed or stage == null:
		return
	for removed in ["B5MidA", "B5MidB", "B5HighA", "B5HighB", "B5MidBridge1", "B5HighBridge", "B5MidSpring"]:
		if stage.find_child(removed, true, false) != null:
			fail("Stage 1 still contains the overhead soft-lock node %s" % removed)
			return
	for suffix in ["A", "B", "C", "D", "E"]:
		var platform := require_node(stage, "B5Shortcut%s" % suffix)
		if failed:
			return
		if float(platform.get_meta("_llr_walkable_width", 0)) < 320.0:
			fail("Stage 1 shortcut %s is too narrow" % platform.name)
			return
	var main_floor_probes := {
		"descent seam": Vector2(12260, 170),
		"shortcut A underpass": Vector2(12600, 175),
		"shortcut B underpass": Vector2(13030, 235),
		"shortcut C underpass": Vector2(13460, 235),
		"shortcut D underpass": Vector2(13890, 185),
		"shortcut E underpass": Vector2(14320, 180),
		"rejoin": Vector2(14580, 130),
	}
	for label in main_floor_probes:
		var floor := assert_floor(stage, label, main_floor_probes[label])
		if failed:
			return
		assert_headroom(stage, label, floor.position, 120.0)
		if failed:
			return


func water_extents(water: Node) -> Vector2:
	var polygon: PackedVector2Array = water.polygon
	var minimum := Vector2.INF
	var maximum := -Vector2.INF
	for point in polygon:
		minimum.x = min(minimum.x, point.x)
		minimum.y = min(minimum.y, point.y)
		maximum.x = max(maximum.x, point.x)
		maximum.y = max(maximum.y, point.y)
	return maximum - minimum


func probe_stage_two() -> void:
	var stage := await load_stage(2) as Node2D
	if failed or stage == null:
		return
	var recovery_probes := {
		"harbor bed": Vector2(1750, 510),
		"intentional dive bed": Vector2(4000, 520),
		"two-ferry swim route": Vector2(6500, 500),
		"raised-tide harbor bed": Vector2(12100, 610),
		"bridge foldback bed": Vector2(15550, 610),
		"drainage corridor bed": Vector2(19100, 610),
		"lighthouse pool bed": Vector2(23300, 610),
	}
	for label in recovery_probes:
		assert_floor(stage, label, recovery_probes[label], 260.0)
		if failed:
			return

	var player := require_node(stage, "Player")
	var director := require_node(stage, "B4RaiseTideDirector")
	var water := require_node(stage, "B5TideWater")
	if failed:
		return
	var water_start: Vector2 = water.position
	director.move_seconds = 0.0
	director._on_Trigger_body_entered(player)
	await physics_frame
	await process_frame
	if water.position.distance_to(water_start + Vector2(0, -240)) > 0.1:
		fail("Stage 2 tide water did not move by the physical -240px offset")
		return
	var detection_area := water.get_node("DetectionArea")
	var expected_top_left: Vector2 = water.global_position - water_extents(water) / 2.0
	if detection_area.top_left_corner.distance_to(expected_top_left) > 0.5:
		fail("Stage 2 moving-water collision/render origin did not stay synchronized")
		return

	var pipe := require_node(stage, "B6FoldbackPipe")
	if failed:
		return
	if pipe.target_pos.x > pipe.position.x - 2000.0:
		fail("Stage 2 foldback pipe no longer travels backward far enough")
		return
	assert_floor(stage, "foldback pipe destination", pipe.target_pos, 260.0)
	if failed:
		return

	for lift_name in ["B2WaterLift", "B7DrainLift", "B8LighthouseLift"]:
		var lift := require_node(stage, lift_name)
		if failed:
			return
		if float(lift.get_meta("_llr_walkable_width", 0)) < 160.0:
			fail("Stage 2 lift %s is narrower than the touch-safe landing budget" % lift_name)
			return


func probe_stage_three() -> void:
	var stage := await load_stage(3) as Node2D
	if failed or stage == null:
		return
	var floor_probes := {
		"break training yard": Vector2(3200, 240),
		"warehouse recovery floor": Vector2(6400, 360),
		"collapse plaza": Vector2(8750, 160),
		"sorting corridor": Vector2(12100, 20),
		"thwomp target line": Vector2(15500, 120),
		"foreman arena": Vector2(19400, 120),
		"changed-world finish": Vector2(24700, 555),
	}
	for label in floor_probes:
		assert_floor(stage, label, floor_probes[label], 240.0)
		if failed:
			return

	var collapse_target := require_node(stage, "B4CollapseTarget")
	var remove_director := require_node(stage, "B4RemoveOldSupport")
	var install_director := require_node(stage, "B4InstallCollapseSlope")
	var old_support := require_node(stage, "B4OldSupportGate") as Node2D
	var new_slope := require_node(stage, "B4NewCollapseSlope") as Node2D
	if failed:
		return
	remove_director.move_seconds = 0.0
	install_director.move_seconds = 0.0
	var old_start := old_support.position
	var slope_start := new_slope.position
	if !collapse_target.register_thwomp_impact(self):
		fail("Stage 3 collapse target rejected a valid impact")
		return
	await physics_frame
	await process_frame
	if old_support.position != old_start + Vector2(0, 420):
		fail("Stage 3 old support collision did not leave the route")
		return
	if new_slope.position != slope_start + Vector2(0, -420):
		fail("Stage 3 replacement slope collision did not enter the route")
		return
	assert_floor(stage, "installed collapse slope", Vector2(9500, 80), 180.0)
	if failed:
		return

	for index in range(1, 4):
		var target := require_node(stage, "B6FloorTarget%d" % index)
		var director := require_node(stage, "B6GateDirector%d" % index)
		var gate := require_node(stage, "B6SafetyGate%d" % index) as Node2D
		if failed:
			return
		director.move_seconds = 0.0
		var start := gate.position
		if !target.register_thwomp_impact(self):
			fail("Stage 3 Thwomp target %d rejected its collider impact" % index)
			return
		await process_frame
		if gate.position != start + Vector2(0, 300):
			fail("Stage 3 Thwomp gate %d did not physically open" % index)
			return

	var persistent_box := require_node(stage, "B2LaneAC1R1")
	if failed:
		return
	if persistent_box.get("persistent_destroy") != true or persistent_box.get("_destroyed") != false:
		fail("Stage 3 persistent breakable box state is not active")
		return


func probe_stage_four() -> void:
	var stage := await load_stage(4) as Node2D
	if failed or stage == null:
		return
	for probe in [
		["shaft one basin", Vector2(1800, 650)],
		["shaft two basin", Vector2(5600, 650)],
		["shaft three basin", Vector2(8800, 650)],
	]:
		assert_floor(stage, probe[0], probe[1], 180.0)
		if failed:
			return

	for contract_name in ["ShaftOneContract", "ShaftTwoContract", "ShaftThreeContract"]:
		var contract := require_node(stage, contract_name)
		if failed:
			return
		if contract.get_meta("_llr_real_rocket_shaft", false) != true:
			fail("Stage 4 %s is not marked as a real shaft" % contract_name)
			return

	for landing_name in [
		"B2FirstWideLanding", "B3MiddleRefillLanding", "B3ShaftOneTopLanding",
		"B5RocketShuttle", "B6DescentLandingUpper", "B6FalseTopLanding",
		"B7ShortRouteLanding", "B7FuelChoiceRejoin", "B8RelayTopLanding",
	]:
		var landing := require_node(stage, landing_name)
		if failed:
			return
		if float(landing.get_meta("_llr_walkable_width", 0)) < 224.0:
			fail("Stage 4 landing %s is below the touch-safe width" % landing_name)
			return

	var fake_top := require_node(stage, "B6FakeTopFacade")
	if failed:
		return
	if fake_top is CollisionObject2D or fake_top.get_meta("_llr_collision_enabled", true) != false:
		fail("Stage 4 false ceiling unexpectedly has collision")
		return
	for descent_name in ["B6DescentLandingUpper", "B6SideDoorThreshold"]:
		if require_node(stage, descent_name) == null:
			return

	var player := require_node(stage, "Player")
	var nozzle_director := require_node(stage, "B1NozzleLockDirector")
	if failed:
		return
	nozzle_director._on_Trigger_body_entered(player)
	await process_frame
	if player.current_nozzle != 2 or player.collected_nozzles[1] != true:
		fail("Stage 4 director did not force and award Rocket FLUDD")
		return


func probe_stage_five() -> void:
	var stage := await load_stage(5) as Node2D
	if failed or stage == null:
		return
	for probe in [
		["opening recovery line", Vector2(2500, 610)],
		["warehouse recovery line", Vector2(6000, 610)],
		["transfer recovery line", Vector2(10000, 610)],
		["collapse recovery line", Vector2(15000, 610)],
		["relay recovery line", Vector2(19000, 610)],
	]:
		assert_floor(stage, probe[0], probe[1], 180.0)
		if failed:
			return

	var freight_names := [
		"B2ProximityCargoLift", "B3FreightLegOne", "B3FreightLegTwo",
		"B5HorizontalFreight", "B5VerticalFreight", "B5LowerReserveCar",
		"B5CloudRecoveryLift", "B6LastFreightTrain", "B8RelayBridgeOne",
		"B8RelayBridgeTwo", "B8RelayBridgeThree",
	]
	for freight_name in freight_names:
		var freight := require_node(stage, freight_name)
		if failed:
			return
		if int(freight.mode) != 2 or freight.travel == Vector2.ZERO:
			fail("Stage 5 freight %s is not a real proximity one-shot" % freight_name)
			return
		if float(freight.get_meta("_llr_walkable_width", 0)) < 224.0:
			fail("Stage 5 freight %s is too narrow" % freight_name)
			return

	var player := require_node(stage, "Player") as Node2D
	var test_freight := require_node(stage, "B2ProximityCargoLift")
	if failed:
		return
	test_freight.travel_seconds = 0.05
	test_freight.start_delay = 0.0
	player.global_position = test_freight.global_position
	await wait_physics_frames(8)
	if !test_freight.finished or test_freight.get_node("MovingPlatform").position.distance_to(test_freight.travel) > 0.5:
		fail("Stage 5 proximity freight did not activate and remain at its destination")
		return


func probe_stage_six() -> void:
	var stage := await load_stage(6) as Node2D
	if failed or stage == null:
		return
	for point in [
		Vector2(1200, 320), Vector2(4000, 280), Vector2(7000, 540),
		Vector2(12000, 500), Vector2(17000, 650), Vector2(22000, 650),
		Vector2(27000, 320),
	]:
		assert_floor(stage, "Turbo recovery at x=%d" % int(point.x), point, 220.0)
		if failed:
			return

	for index in range(1, 4):
		var gate := require_node(stage, "B5Gate%dFrame" % index)
		if failed:
			return
		if !(gate is StaticBody2D) or gate.get_meta("_llr_real_gate_frame", false) != true:
			fail("Stage 6 gate %d is not a physical frame" % index)
			return
	for index in range(1, 6):
		var belt := require_node(stage, "B6ReverseConveyor%d" % index)
		if failed:
			return
		if float(belt.speed) >= 0.0:
			fail("Stage 6 hairpin belt %d is not physically reversed" % index)
			return

	var player := require_node(stage, "Player")
	var turbo_director := require_node(stage, "B1TurboLockDirector")
	if failed:
		return
	turbo_director._on_Trigger_body_entered(player)
	await process_frame
	if player.current_nozzle != 3 or player.collected_nozzles[2] != true:
		fail("Stage 6 director did not force and award Turbo FLUDD")
		return


func probe_stage_seven() -> void:
	var stage := await load_stage(7) as Node2D
	if failed or stage == null:
		return
	for point in [Vector2(3000, 650), Vector2(10000, 650), Vector2(15000, 650), Vector2(19000, 650), Vector2(22500, 650)]:
		assert_floor(stage, "migration valley recovery at x=%d" % int(point.x), point, 180.0)
		if failed:
			return
	for landing_name in ["B2UpperCloud2", "B5HighCloud4", "B7RisingCloud5"]:
		var landing := require_node(stage, landing_name)
		if failed:
			return
		if float(landing.get_meta("_llr_walkable_width", 0)) < 190.0:
			fail("Stage 7 cloud %s is below the touch-safe width" % landing_name)
			return

	var player := require_node(stage, "Player")
	var storm := require_node(stage, "B6StormWaveA") as Node2D
	var storm_director := require_node(stage, "B6StormDirector")
	if failed:
		return
	var storm_start := storm.position
	storm_director.move_seconds = 0.0
	storm_director._on_Trigger_body_entered(player)
	await process_frame
	if storm.position != storm_start + Vector2(0, 80):
		fail("Stage 7 migration storm did not physically change the cloud route")
		return


func probe_stage_eight() -> void:
	var stage := await load_stage(8) as Node2D
	if failed or stage == null:
		return
	for point in [Vector2(3000, 650), Vector2(7000, 650), Vector2(12000, 650), Vector2(16000, 650), Vector2(20000, 650)]:
		assert_floor(stage, "clock maintenance floor at x=%d" % int(point.x), point, 180.0)
		if failed:
			return

	var calibration_target := require_node(stage, "B3CalibrationTarget")
	if failed:
		return
	for index in range(1, 7):
		var block := require_node(stage, "B3PhaseBlock%d" % index)
		if failed:
			return
		block.rotation = 0.42
		block.timer = 57
	if !calibration_target.register_thwomp_impact(self):
		fail("Stage 8 calibration target rejected a valid impact")
		return
	await process_frame
	for index in range(1, 7):
		var block := require_node(stage, "B3PhaseBlock%d" % index)
		if block.timer > 2 or abs(block.rotation - block.angle_offset) > 0.001:
			fail("Stage 8 phase block %d did not physically recalibrate" % index)
			return

	var bridge := require_node(stage, "B8BellBridge1") as Node2D
	var bridge_start := bridge.position
	var final_gate := require_node(stage, "B7FinalBellGate") as Node2D
	var final_gate_start := final_gate.position
	var bridge_director := require_node(stage, "B8RaiseBellBridge")
	var gate_director := require_node(stage, "B8RemoveFinalBellGate")
	if failed:
		return
	bridge_director.move_seconds = 0.0
	gate_director.move_seconds = 0.0
	for index in range(1, 4):
		var gate_move := require_node(stage, "B7ClockKingDirector%d" % index)
		gate_move.move_seconds = 0.0
		var target := require_node(stage, "B7ClockKingTarget%d" % index)
		if !target.register_thwomp_impact(self):
			fail("Stage 8 clock-king target %d rejected a valid impact" % index)
			return
		await process_frame
	if bridge.position != bridge_start + Vector2(0, -320):
		fail("Stage 8 synchronized exit bridge did not rise")
		return
	if final_gate.position != final_gate_start + Vector2(0, 320):
		fail("Stage 8 final bell gate did not leave the route")
		return


func probe_stage_nine() -> void:
	var stage := await load_stage(9) as Node2D
	if failed or stage == null:
		return
	var red_coin_names := [
		"B3WaterWingRedCoin", "B4BookshelfWingRedCoin", "B5MushroomWingRedCoin",
		"B6MechanicalWingRedCoin", "B6ExpertBranchRedCoin",
	]
	for coin_name in red_coin_names:
		if require_node(stage, coin_name) == null:
			return
	var gate := require_node(stage, "B1CentralCoinGate")
	if failed:
		return
	if int(gate.required_coins) != 4:
		fail("Stage 9 does not keep the five-take-four coin gate rule")
		return

	for return_name in [
		"B2TeachingReturnPipe", "B3WaterReturnPipe", "B4BookshelfReturnDoor",
		"B5MushroomReturnPipe", "B6MechanicalReturnDoor",
	]:
		var return_warp := require_node(stage, return_name)
		if failed:
			return
		if return_warp.move_to_scene != false or abs(return_warp.target_pos.x - 9000.0) > 1200.0:
			fail("Stage 9 return warp %s does not physically return to the central hall" % return_name)
			return

	var relay := require_node(stage, "B7MechanicalReverseRelayPipe") as Node2D
	var exit_door := require_node(stage, "B7BooksReverseExitDoor") as Node2D
	var relay_start := relay.position
	var exit_start := exit_door.position
	var deploy := require_node(stage, "B7DeployReverseExitDirector")
	var player := require_node(stage, "Player")
	if failed:
		return
	deploy.move_seconds = 0.0
	deploy._on_Trigger_body_entered(player)
	await process_frame
	if relay.position != relay_start + Vector2(-20000, 0) or exit_door.position != exit_start + Vector2(-20000, 0):
		fail("Stage 9 red-gate relay did not deploy into the reverse route")
		return


func complete_ground_pound_target(target) -> bool:
	return target._register_hit(target.GROUND_POUND, self)


func probe_stage_ten() -> void:
	var stage := await load_stage(10) as Node2D
	if failed or stage == null:
		return
	for point in [Vector2(6000, 650), Vector2(14000, 650), Vector2(20000, 650), Vector2(26000, 650), Vector2(31000, 650)]:
		assert_floor(stage, "orchestra pit at x=%d" % int(point.x), point, 180.0)
		if failed:
			return

	var target_names := [
		"B2CentralWideBellPad", "B3OrdinaryRouteBellPad", "B3SpringRouteBellPad",
		"B5LeftSideBellPad", "B5RightSideBellPad", "B6ConductorBellPad", "B8TenthBellPad",
	]
	for target_name in target_names:
		var target := require_node(stage, target_name)
		if failed:
			return
		if int(target.accepted_hits) != 1 or target.target_size.x < 320.0:
			fail("Stage 10 bell target %s is not a wide reliable ground-pound pad" % target_name)
			return

	var distant_gate := require_node(stage, "B2DistantBellGate") as Node2D
	var distant_start := distant_gate.position
	var distant_director := require_node(stage, "B2DistantGateDirector")
	distant_director.move_seconds = 0.0
	if !complete_ground_pound_target(require_node(stage, "B2CentralWideBellPad")):
		fail("Stage 10 central bell rejected a ground pound")
		return
	await process_frame
	if distant_gate.position != distant_start + Vector2(0, -360):
		fail("Stage 10 distant gate did not physically open")
		return

	var ordinary_step := require_node(stage, "B3OrdinaryStep1") as Node2D
	var ordinary_start := ordinary_step.position
	var ordinary_director := require_node(stage, "B3OrdinaryStairDirector")
	ordinary_director.move_seconds = 0.0
	complete_ground_pound_target(require_node(stage, "B3OrdinaryRouteBellPad"))
	await process_frame
	if ordinary_step.position != ordinary_start + Vector2(0, -1000):
		fail("Stage 10 generated ordinary stairs did not enter the stage")
		return

	var both_gate := require_node(stage, "B5BothWingsExitGate") as Node2D
	var both_gate_start := both_gate.position
	for director_name in ["B5LeftWingDirector", "B5RightWingDirector", "B5BothWingsUnlockDirector"]:
		require_node(stage, director_name).move_seconds = 0.0
	complete_ground_pound_target(require_node(stage, "B5LeftSideBellPad"))
	complete_ground_pound_target(require_node(stage, "B5RightSideBellPad"))
	await process_frame
	if both_gate.position == both_gate_start:
		fail("Stage 10 independent side wings did not unlock the shared return")
		return

	var lowering_floor := require_node(stage, "B6LoweringFloor1") as Node2D
	var conductor_gate := require_node(stage, "B6ConductorGate1") as Node2D
	var lowering_start := lowering_floor.position
	var conductor_start := conductor_gate.position
	require_node(stage, "B6LowerStageDirector").move_seconds = 0.0
	require_node(stage, "B6OpenThreeGatesDirector").move_seconds = 0.0
	complete_ground_pound_target(require_node(stage, "B6ConductorBellPad"))
	await process_frame
	if lowering_floor.position != lowering_start + Vector2(0, 260) or conductor_gate.position != conductor_start + Vector2(0, -360):
		fail("Stage 10 conductor pad did not lower the floor and open the gates")
		return

	var victory_road := require_node(stage, "B8VictoryRoad1") as Node2D
	var victory_start := victory_road.position
	require_node(stage, "B8BuildVictoryRoadDirector").move_seconds = 0.0
	complete_ground_pound_target(require_node(stage, "B8TenthBellPad"))
	await process_frame
	if victory_road.position != victory_start + Vector2(0, -1000):
		fail("Stage 10 final bell did not build the physical victory road")
		return

func run() -> void:
	await probe_stage_one()
	if failed:
		return
	await probe_stage_two()
	if failed:
		return
	await probe_stage_three()
	if failed:
		return
	await probe_stage_four()
	if failed:
		return
	await probe_stage_five()
	if failed:
		return
	await probe_stage_six()
	if failed:
		return
	await probe_stage_seven()
	if failed:
		return
	await probe_stage_eight()
	if failed:
		return
	await probe_stage_nine()
	if failed:
		return
	await probe_stage_ten()
	if failed:
		return
	print("LLR level runtime probes OK: all 10 V4 stages loaded; recovery floors and physical events verified")
	quit(0)


func _initialize() -> void:
	call_deferred("run")
