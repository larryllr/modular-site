import { createV4SceneBuilder } from "./llr-level-v4-kit.mjs";

function beat(id, name, topology, startX, endX, seconds, act, cadence, mechanics, event, failure, stateChange = false) {
  return {
    id,
    name,
    topology,
    startX,
    endX,
    seconds,
    act,
    cadence,
    mechanics,
    event,
    failure,
    input: "direction+one-action",
    stateChange
  };
}

export const V4_STAGE_SIX_BLUEPRINT = {
  id: 6,
  title: "6 涡轮海岸公路 · V4",
  description: "固定 Turbo、连续坡路、三门短冲刺、逆带 U 弯与双层夕阳公路",
  tint: "Color(1, 0.87, 0.7, 1)",
  spawnY: 320,
  levelWidth: 28200,
  cameraTop: -680,
  cameraBottom: 760,
  deathY: 900,
  finishY: 320,
  beats: [
    beat(1, "封闭涡轮试车", "sealed-turbo-test-lane", 0, 2200, 18, 1, "introduction",
      ["turbo", "soft-wall", "terrain", "director"],
      "拾取并固定 Turbo，在无坑直道练习按住喷水加速、松开喷水减速",
      "直道全封闭且没有敌人，末端软墙前有超宽减速区"),
    beat(2, "海风起伏坡", "wide-rolling-coast-slopes", 2200, 5200, 24, 1, "introduction",
      ["turbo", "rolling-slope", "grass", "runoff"],
      "只用方向与持续喷水通过两组宽缓起伏坡，建立速度节奏",
      "坡面连续无断口，偏离高速线只会进入同一块宽草地"),
    beat(3, "高架踏浪双线", "highway-over-shallow-water", 5200, 9000, 30, 2, "development",
      ["turbo", "branch", "water", "wood"],
      "选择上层高速木桥或下层浅水稳路，并在维修站前重新汇合",
      "上路任意缺口都直接落入有连续实体海床的浅水低路"),
    beat(4, "海岸维修站", "static-overlook-service-stop", 9000, 10800, 14, 2, "development",
      ["checkpoint", "bottle", "coins", "preview"],
      "在静态维修站补水补血，并俯瞰三门短冲刺与远处刹车隧道",
      "完整实体广场保存检查点，站内没有敌人与动态地板", true),
    beat(5, "三门短冲刺", "three-wide-sprint-gates", 10800, 15400, 34, 2, "development",
      ["turbo", "gate", "service-road", "soft-wall"],
      "连续完成三段 8–12 秒短冲刺；每扇宽门后都有可停稳平台",
      "漏门只会落入连续服务道，并由宽坡在下一扇门前重新汇合", true),
    beat(6, "红灯逆带 U 弯", "reverse-belt-hairpin-tunnel", 15400, 19400, 30, 2, "twist",
      ["turbo", "conveyor", "hairpin", "soft-wall"],
      "看见红灯后松开喷水，撞入软缓冲区并借逆向传送带完成 U 形折返",
      "继续喷水只会撞软墙；上下两次掉落都有完整实体承接路", true),
    beat(7, "双层海堤终段", "momentum-overpass-or-ground", 19400, 25000, 42, 3, "twist",
      ["turbo", "overpass", "shallow-water", "checkpoint"],
      "保持速度从长坡飞入高架快线，或落回连续浅水地面稳路",
      "高架所有断口都覆盖低路，段首检查点避免重复刹车隧道"),
    beat(8, "无敌夕阳释放", "enemy-free-sunset-release", 25000, 28200, 20, 3, "resolution",
      ["turbo", "sunset", "deceleration", "finish"],
      "在无敌人的夕阳直道完整释放一次全速 Turbo 冲刺",
      "终点前保留超长减速区，终点线后还有实体软缓冲墙", true)
  ]
};

export function buildV4StageSixScene(context) {
  const stage = context.stage;
  const b = createV4SceneBuilder(context);
  const {
    vector,
    packed,
    addInstance,
    addPlainNode,
    addContract,
    addTerrain,
    grounded,
    airborne,
    recordRoute,
    addWood,
    addWater,
    assertConservativePlatformChain,
    finalize
  } = b;

  function addFlatRun(prefix, startX, endX, y, profile = [0, 4, -4, 0]) {
    const ids = [];
    let x = startX;
    let index = 1;
    while (x < endX) {
      const width = Math.min(850, endX - x);
      ids.push(addTerrain(`${prefix}${index}`, x, y, width, width < 300 ? [0, 0] : profile));
      x += width;
      index += 1;
    }
    return ids;
  }

  function addSoftBuffer(name, x, topY, width, height, color = "Color(0.32, 0.76, 0.84, 0.9)") {
    const polygon = packed([[0, 0], [width, 0], [width, height], [0, height]]);
    addPlainNode(name, "StaticBody2D", "Terrain", {
      position: vector(x, topY),
      collision_layer: "8388609",
      collision_mask: "0",
      "metadata/_llr_real_soft_buffer": "true"
    });
    addPlainNode(`${name}Collision`, "CollisionPolygon2D", `Terrain/${name}`, { polygon });
    addPlainNode(`${name}Body`, "Polygon2D", `Terrain/${name}`, {
      z_index: "2",
      polygon,
      color
    });
    const stripeHeight = Math.min(18, height / 4);
    addPlainNode(`${name}Stripe`, "Polygon2D", `Terrain/${name}`, {
      z_index: "3",
      polygon: packed([[0, height * 0.42], [width, height * 0.42], [width, height * 0.42 + stripeHeight], [0, height * 0.42 + stripeHeight]]),
      color: "Color(1, 0.92, 0.55, 0.92)"
    });
    return name;
  }

  function addTurboDirector(name, x, y, options = {}) {
    addInstance(name, ".", "director", {
      position: vector(x, y),
      trigger_size: vector(options.width || 260, options.height || 210),
      announcement: JSON.stringify(options.announcement || ""),
      checkpoint: options.checkpoint === false ? "false" : "true",
      one_shot: options.oneShot === false ? "false" : "true",
      forced_nozzle: "3",
      lock_nozzle: "true",
      "metadata/_llr_real_turbo_lock": "true"
    });
    return name;
  }

  function addGateFrame(name, x, roadY, number) {
    const beam = packed([[-34, -190], [34, -190], [34, -152], [-34, -152]]);
    addPlainNode(name, "StaticBody2D", "Terrain", {
      position: vector(x, roadY),
      collision_layer: "8388609",
      collision_mask: "0",
      "metadata/_llr_real_gate_frame": "true",
      "metadata/_llr_gate_number": String(number)
    });
    addPlainNode(`${name}Collision`, "CollisionPolygon2D", `Terrain/${name}`, { polygon: beam });
    addPlainNode(`${name}Beam`, "Polygon2D", `Terrain/${name}`, {
      z_index: "4",
      polygon: beam,
      color: "Color(0.16, 0.44, 0.64, 1)"
    });
    addPlainNode(`${name}LeftMarker`, "Polygon2D", `Terrain/${name}`, {
      z_index: "4",
      polygon: packed([[-34, -152], [-24, -152], [-24, -8], [-34, -8]]),
      color: "Color(1, 0.84, 0.28, 1)"
    });
    addPlainNode(`${name}RightMarker`, "Polygon2D", `Terrain/${name}`, {
      z_index: "4",
      polygon: packed([[24, -152], [34, -152], [34, -8], [24, -8]]),
      color: "Color(1, 0.84, 0.28, 1)"
    });
  }

  function addGateTrigger(number, x, roadY) {
    addTurboDirector(`B5Gate${number}Director`, x, roadY - 82, {
      announcement: `检查门 ${number}/3`,
      checkpoint: false,
      width: 150,
      height: 180
    });
    addGateFrame(`B5Gate${number}Frame`, x, roadY, number);
  }

  function addCoinLine(prefix, points) {
    points.forEach((point, index) => {
      airborne(`${prefix}${index + 1}`, "Items/Coins", "coin", point.x, point.y);
    });
  }

  function addRedSignal(name, x, y) {
    const octagon = [];
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      octagon.push([Math.cos(angle) * 28, Math.sin(angle) * 28]);
    }
    addPlainNode(name, "Polygon2D", "Items/Decoration", {
      position: vector(x, y),
      z_index: "6",
      polygon: packed(octagon),
      color: "Color(1, 0.12, 0.1, 1)",
      "metadata/_llr_brake_signal": "true"
    });
  }

  addContract("V4StageSixStructureContract", {
    target_seconds: 212,
    beat_count: 8,
    unequal_beat_widths: true,
    actual_turbo_pickup_count: 1,
    forced_nozzle: 3,
    lock_nozzle: true,
    actual_reverse_conveyor_count: 5,
    physical_check_gate_count: 3,
    continuous_low_recovery: true,
    enemy_count: 0,
    max_required_jump_gap: 0,
    max_optional_open_gap: 88,
    single_camera_area: true,
    void_required: false
  });

  // Beat 1: one real Turbo pickup and a real nozzle-locking director begin a sealed, pit-free test lane.
  const b1start = addTerrain("B1TurboStart", -40, 320, 760, [0, -4, 4, 0]);
  addTerrain("B1TestStraightA", 720, 320, 850, [0, 0, 0, 0]);
  addTerrain("B1TestStraightB", 1570, 320, 480, [0, 0, 0, 0]);
  addTerrain("B1DecelerationDip", 2050, 320, 300, [0, 24, 58, 80]);
  grounded("B1ActualTurboPickup", "Items/Pickups", "fluddTurbo", b1start, 0.46, -30);
  addTurboDirector("B1TurboLockDirector", 610, 245, {
    announcement: "Turbo 已锁定：按住喷水加速，松开喷水减速",
    checkpoint: false,
    width: 300,
    height: 220
  });
  addSoftBuffer("B1EndSoftBuffer", 2270, 70, 120, 250);
  addContract("B1RealTurboTestContract", {
    real_fludd_turbo_scene: true,
    forced_nozzle: 3,
    lock_nozzle: true,
    test_lane_sealed: true,
    enemy_count: 0,
    pit_count: 0,
    deceleration_length: 650,
    physical_soft_wall: true,
    void_required: false
  });
  recordRoute(stage.beats[0], "main", [
    { x: 80, y: 318 }, { x: 520, y: 318 }, { x: 1050, y: 320 },
    { x: 1570, y: 320 }, { x: 1970, y: 320 }, { x: 2240, y: 392 }
  ], { coinLimit: 5 });

  // Beat 2: every rise is broad and every seam is closed; no jump is required to keep moving right.
  addTerrain("B2RiseOne", 2200, 400, 750, [0, -34, -78, -110]);
  addTerrain("B2FallOne", 2950, 290, 760, [0, 42, 92, 120]);
  addTerrain("B2RestGrass", 3710, 410, 430, [0, 4, -4, 0]);
  addTerrain("B2RiseTwo", 4140, 410, 560, [0, -36, -80, -110]);
  addTerrain("B2FallTwo", 4700, 300, 520, [0, 28, 66, 90]);
  grounded("B2RunoffFlowersA", "Items/Decoration", "flowers", "B2FallOne", 0.7, -10);
  grounded("B2RunoffFlowersB", "Items/Decoration", "flowers", "B2FallTwo", 0.64, -10);
  addContract("B2RollingSlopeContract", {
    rolling_slope_count: 2,
    continuous_ground: true,
    required_jump_count: 0,
    broad_runoff_grass: true,
    max_profile_rise: 120,
    void_required: false
  });
  recordRoute(stage.beats[1], "main", [
    { x: 2220, y: 398 }, { x: 2600, y: 350 }, { x: 2940, y: 290 },
    { x: 3330, y: 350 }, { x: 3710, y: 410 }, { x: 4140, y: 408 },
    { x: 4460, y: 350 }, { x: 4700, y: 300 }, { x: 5180, y: 388 }
  ], { coinLimit: 6 });

  // Beat 3: the low line is an uninterrupted shallow-water road; the optional high line is fully catchable.
  addTerrain("B3LowEntry", 5200, 390, 700, [0, 35, 78, 120]);
  addFlatRun("B3ShallowBed", 5900, 8400, 540, [0, 5, -5, 0]);
  addTerrain("B3LowExitRiseA", 8400, 540, 420, [0, -34, -72, -110]);
  addTerrain("B3LowExitRiseB", 8820, 430, 300, [0, -38, -82, -120]);
  addWater("B3ShallowWater", 5580, 430, 3220, 290, {
    "metadata/_llr_shallow_water": "true",
    "metadata/_llr_solid_bed_below": "true"
  });
  const b3high = [
    addWood("B3Highway01", 5710, 300, 12),
    addWood("B3Highway02", 6070, 250, 12),
    addWood("B3Highway03", 6430, 205, 12),
    addWood("B3Highway04", 6860, 190, 12),
    addWood("B3Highway05", 7310, 205, 12),
    addWood("B3Highway06", 7760, 180, 12),
    addWood("B3Highway07", 8210, 205, 12),
    addWood("B3Highway08", 8640, 230, 12)
  ];
  assertConservativePlatformChain("B3HighwayCatchableChain", b3high, {
    maxGap: 70,
    maxRise: 55,
    minLandingWidth: 320
  });
  airborne("B3HighwayBottle", "Items/Pickups", "bottle", 7530, 145);
  addContract("B3DualRouteContract", {
    high_route_platform_count: b3high.length,
    high_route_min_width: 384,
    high_route_max_gap: 66,
    low_route_continuous: true,
    shallow_water_depth: 110,
    continuous_solid_bed: true,
    high_failure_to_low: true,
    required_jump_count: 0,
    void_required: false
  });
  recordRoute(stage.beats[2], "main", [
    { x: 5220, y: 388 }, { x: 5600, y: 450 }, { x: 5900, y: 510 },
    { x: 6600, y: 535 }, { x: 7350, y: 535 }, { x: 8100, y: 535 },
    { x: 8420, y: 530 }, { x: 8800, y: 440 }, { x: 9050, y: 315 }
  ], { coinLimit: 6 });
  recordRoute(stage.beats[2], "bonus", [
    { x: 5480, y: 360 }, { x: 5710, y: 300 }, { x: 6070, y: 250 },
    { x: 6430, y: 205 }, { x: 6860, y: 190 }, { x: 7310, y: 205 },
    { x: 7760, y: 180 }, { x: 8210, y: 205 }, { x: 8640, y: 230 },
    { x: 9000, y: 310 }
  ], { coinLimit: 6 });
  recordRoute(stage.beats[2], "recovery", [
    { x: 6100, y: 520 }, { x: 6800, y: 535 }, { x: 7500, y: 535 },
    { x: 8200, y: 535 }, { x: 8600, y: 490 }, { x: 9000, y: 315 }
  ], { recoverySeconds: 10, coins: false });

  // Beat 4: a static overlook restores water and health before the three sprint gates.
  const b4floors = addFlatRun("B4ServiceFloor", 9000, 10800, 310, [0, -4, 4, 0]);
  grounded("B4ServiceBottleA", "Items/Pickups", "bottle", b4floors[0], 0.42, -30);
  grounded("B4ServiceBottleB", "Items/Pickups", "bottle", b4floors[1], 0.6, -30);
  addCoinLine("B4RepairCoin", [
    { x: 9480, y: 245 }, { x: 9560, y: 230 }, { x: 9640, y: 225 },
    { x: 9720, y: 230 }, { x: 9800, y: 245 }
  ]);
  grounded("B4OverlookSign", "Items/Decoration", "sign", b4floors[1], 0.42, -3, {
    lines: `Array[String](["三扇门都是短冲刺。漏门会落进下方服务道，沿坡继续即可。"] )`
  });
  grounded("B4CoastTree", "Items/Decoration", "smallTree", b4floors[2], 0.72, -38);
  addTurboDirector("B4ServiceCheckpoint", 10120, 230, {
    announcement: "维修站：补给完成，前方三门短冲刺",
    checkpoint: true,
    width: 320,
    height: 240
  });
  addContract("B4StaticServiceContract", {
    checkpoint: true,
    bottle_count: 2,
    healing_coin_count: 5,
    enemy_count: 0,
    moving_floor_count: 0,
    next_set_piece_preview: true,
    void_required: false
  });
  recordRoute(stage.beats[3], "main", [
    { x: 9020, y: 308 }, { x: 9400, y: 308 }, { x: 9800, y: 310 },
    { x: 10200, y: 310 }, { x: 10600, y: 310 }, { x: 10820, y: 308 }
  ], { coinLimit: 4 });

  // Beat 5: three momentum gaps sit above one continuous service floor and two broad automatic rejoin ramps.
  addFlatRun("B5ContinuousServiceRoad", 10800, 15400, 500, [0, 4, -4, 0]);
  addTerrain("B5GateOneLaunch", 10800, 310, 600, [0, -24, -58, -90]);
  const b5gate1 = [
    addWood("B5Gate1Approach", 11590, 220, 12),
    addWood("B5Gate1Landing", 12046, 220, 12)
  ];
  addGateTrigger(1, 12046, 220);
  addTerrain("B5GateTwoRejoinA", 12000, 500, 500, [0, -36, -76, -120]);
  addTerrain("B5GateTwoRejoinB", 12500, 380, 500, [0, -46, -104, -160]);
  const b5gate2 = [
    addWood("B5Gate2Approach", 13200, 220, 12),
    addWood("B5Gate2Landing", 13664, 220, 12)
  ];
  addGateTrigger(2, 13664, 220);
  addTerrain("B5GateThreeRejoinA", 13600, 500, 500, [0, -36, -76, -120]);
  addTerrain("B5GateThreeRejoinB", 14100, 380, 500, [0, -46, -104, -160]);
  const b5gate3 = [
    addWood("B5Gate3Approach", 14760, 220, 10),
    addWood("B5Gate3Landing", 15152, 220, 10)
  ];
  addGateTrigger(3, 15152, 220);
  addWood("B5Gate1StopBay", 12400, 220, 10);
  addWood("B5Gate2StopBay", 14020, 220, 10);
  addWood("B5Gate3StopBay", 15380, 220, 10);
  assertConservativePlatformChain("B5GateOneMomentumGap", b5gate1, {
    maxGap: 80, maxRise: 0, minLandingWidth: 320
  });
  assertConservativePlatformChain("B5GateTwoMomentumGap", b5gate2, {
    maxGap: 80, maxRise: 0, minLandingWidth: 320
  });
  assertConservativePlatformChain("B5GateThreeMomentumGap", b5gate3, {
    maxGap: 80, maxRise: 0, minLandingWidth: 320
  });
  addContract("B5ThreeGateContract", {
    physical_gate_count: 3,
    actual_trigger_count: 3,
    short_sprint_seconds_min: 8,
    short_sprint_seconds_max: 12,
    stop_bay_count: 3,
    service_road_continuous: true,
    broad_rejoin_ramp_count: 2,
    maximum_momentum_gap: 80,
    required_jump_count: 0,
    void_required: false
  });
  recordRoute(stage.beats[4], "main", [
    { x: 10820, y: 308 }, { x: 11200, y: 260 }, { x: 11590, y: 220 },
    { x: 12046, y: 220 }, { x: 12500, y: 220 }, { x: 13200, y: 220 },
    { x: 13664, y: 220 }, { x: 14100, y: 220 }, { x: 14760, y: 220 },
    { x: 15152, y: 220 }, { x: 15380, y: 220 }
  ], { coinLimit: 6 });
  recordRoute(stage.beats[4], "recovery", [
    { x: 11820, y: 500 }, { x: 12250, y: 440 }, { x: 12600, y: 350 },
    { x: 13000, y: 220 }, { x: 13400, y: 220 }, { x: 13800, y: 470 },
    { x: 14200, y: 350 }, { x: 14600, y: 220 }, { x: 15100, y: 220 }
  ], { recoverySeconds: 12, coins: false });

  // Beat 6: the U bend is real geometry—top road, reverse belts, and a lower exit road, all caught by solid floors.
  addFlatRun("B6LowerSafetyRoad", 15400, 19400, 650, [0, 3, -3, 0]);
  const b6top = [
    addWood("B6TopLane01", 15592, 220, 12),
    addWood("B6TopLane02", 15976, 220, 12),
    addWood("B6TopLane03", 16360, 220, 12),
    addWood("B6TopLane04", 16744, 220, 12),
    addWood("B6TopLane05", 17128, 220, 12),
    addWood("B6TopLane06", 17512, 220, 12)
  ];
  assertConservativePlatformChain("B6TopBrakeLane", b6top, {
    maxGap: 0, maxRise: 0, minLandingWidth: 384
  });
  const reverseBelts = [15980, 16340, 16700, 17060, 17420];
  reverseBelts.forEach((x, index) => {
    airborne(`B6ReverseConveyor${index + 1}`, "Items/Mechanisms", "conveyor", x, 420, {
      width: "368",
      speed: String(-115 - index * 5),
      "metadata/_llr_hairpin_belt": "true"
    });
  });
  addWood("B6RightTurnLanding", 17690, 420, 6);
  addSoftBuffer("B6RightBrakeWall", 17820, 20, 130, 450, "Color(0.25, 0.7, 0.82, 0.94)");
  addSoftBuffer("B6LeftTurnWall", 15640, 250, 110, 245, "Color(0.25, 0.7, 0.82, 0.94)");
  addRedSignal("B6RedBrakeSignal", 17480, 80);
  addTurboDirector("B6BrakeDirector", 17360, 135, {
    announcement: "红灯：松开喷水，让逆带带你向左折返",
    checkpoint: true,
    width: 300,
    height: 250
  });
  addContract("B6PhysicalHairpinContract", {
    actual_reverse_conveyor_count: reverseBelts.length,
    conveyor_speed_min: -135,
    conveyor_speed_max: -115,
    physical_soft_wall_count: 2,
    upper_to_middle_drop: 200,
    right_turn_landing_width: 192,
    middle_to_lower_drop: 230,
    continuous_lower_exit: true,
    brake_requires_release: true,
    fake_turbo_hook: false,
    void_required: false
  });
  recordRoute(stage.beats[5], "main", [
    { x: 15420, y: 220 }, { x: 16000, y: 220 }, { x: 16800, y: 220 },
    { x: 17580, y: 220 }, { x: 17740, y: 420 }, { x: 17000, y: 420 },
    { x: 16300, y: 420 }, { x: 15820, y: 420 }, { x: 15770, y: 650 },
    { x: 16600, y: 650 }, { x: 17600, y: 650 }, { x: 18600, y: 650 },
    { x: 19380, y: 650 }
  ], { coinLimit: 6 });
  recordRoute(stage.beats[5], "recovery", [
    { x: 16000, y: 640 }, { x: 16800, y: 645 }, { x: 17600, y: 645 },
    { x: 18400, y: 645 }, { x: 19200, y: 648 }
  ], { recoverySeconds: 10, coins: false });

  // Beat 7: momentum reaches the high overpass; every high gap is narrow and has a continuous low road beneath it.
  addFlatRun("B7ContinuousLowRoad", 19400, 25000, 650, [0, 4, -4, 0]);
  addTerrain("B7MomentumRampA", 19400, 650, 500, [0, -36, -78, -120]);
  addTerrain("B7MomentumRampB", 19900, 530, 500, [0, -36, -78, -120]);
  addTerrain("B7MomentumRampC", 20400, 410, 500, [0, -36, -78, -120]);
  addWater("B7LowRoadShallowsA", 20700, 540, 1450, 260, {
    "metadata/_llr_shallow_water": "true",
    "metadata/_llr_solid_bed_below": "true"
  });
  addWater("B7LowRoadShallowsB", 22400, 540, 1400, 260, {
    "metadata/_llr_shallow_water": "true",
    "metadata/_llr_solid_bed_below": "true"
  });
  const b7high = [
    addWood("B7Overpass01", 21212, 285, 14),
    addWood("B7Overpass02", 21732, 260, 14),
    addWood("B7Overpass03", 22244, 280, 14),
    addWood("B7Overpass04", 22760, 250, 14),
    addWood("B7Overpass05", 23280, 275, 14),
    addWood("B7Overpass06", 23788, 255, 14),
    addWood("B7Overpass07", 24300, 280, 14)
  ];
  assertConservativePlatformChain("B7CatchableOverpass", b7high, {
    maxGap: 88,
    maxRise: 40,
    minLandingWidth: 448
  });
  addTerrain("B7LowExitRiseA", 23800, 650, 500, [0, -36, -78, -120]);
  addTerrain("B7LowExitRiseB", 24300, 530, 500, [0, -34, -76, -110]);
  addTerrain("B7LowExitRiseC", 24800, 420, 300, [0, -30, -66, -100]);
  addTurboDirector("B7DualRouteCheckpoint", 19520, 570, {
    announcement: "双层终段：保持速度上高架，失手就走下方稳路",
    checkpoint: true,
    width: 320,
    height: 240
  });
  airborne("B7OverpassBottle", "Items/Pickups", "bottle", 23280, 215);
  addContract("B7DualLayerContract", {
    checkpoint: true,
    momentum_ramp_count: 3,
    high_platform_count: b7high.length,
    high_min_landing_width: 448,
    high_max_open_gap: 72,
    entry_momentum_gap: 88,
    low_road_continuous: true,
    shallow_water_depth: 110,
    high_failure_to_low: true,
    required_jump_count: 0,
    void_required: false
  });
  recordRoute(stage.beats[6], "main", [
    { x: 19420, y: 648 }, { x: 19900, y: 530 }, { x: 20400, y: 410 },
    { x: 20900, y: 290 }, { x: 21020, y: 650 }, { x: 21800, y: 645 },
    { x: 22600, y: 645 }, { x: 23400, y: 645 }, { x: 23800, y: 648 },
    { x: 24300, y: 530 }, { x: 24800, y: 420 }, { x: 25020, y: 320 }
  ], { coinLimit: 6 });
  recordRoute(stage.beats[6], "bonus", [
    { x: 19420, y: 648 }, { x: 19900, y: 530 }, { x: 20400, y: 410 },
    { x: 20900, y: 290 }, { x: 21212, y: 285 }, { x: 21732, y: 260 },
    { x: 22244, y: 280 }, { x: 22760, y: 250 }, { x: 23280, y: 275 },
    { x: 23788, y: 255 }, { x: 24300, y: 280 }, { x: 24800, y: 370 }
  ], { coinLimit: 6 });
  recordRoute(stage.beats[6], "recovery", [
    { x: 21200, y: 640 }, { x: 22000, y: 645 }, { x: 22800, y: 645 },
    { x: 23600, y: 645 }, { x: 24100, y: 590 }, { x: 24600, y: 470 },
    { x: 25000, y: 320 }
  ], { recoverySeconds: 12, coins: false });

  // Beat 8: no enemies, hazards, moving floors, or route splits—only one final full-speed release and a long stop zone.
  const b8floors = addFlatRun("B8SunsetStraight", 25000, 28200, 320, [0, -3, 3, 0]);
  grounded("B8FinalBottle", "Items/Pickups", "bottle", b8floors[0], 0.35, -30);
  grounded("B8SunsetTreeA", "Items/Decoration", "smallTree", b8floors[1], 0.7, -38);
  grounded("B8SunsetFlowers", "Items/Decoration", "flowers", b8floors[2], 0.58, -10);
  addTurboDirector("B8SunsetReleaseDirector", 25200, 240, {
    announcement: "夕阳直道：前方无人无坑，放心全速释放",
    checkpoint: true,
    width: 340,
    height: 250
  });
  addSoftBuffer("B8FinishSoftBuffer", 28310, 80, 150, 300, "Color(0.9, 0.47, 0.3, 0.94)");
  addContract("B8EnemyFreeReleaseContract", {
    enemy_count: 0,
    hazard_count: 0,
    moving_floor_count: 0,
    continuous_ground: true,
    full_speed_release_length: 2100,
    deceleration_zone_length: 1100,
    physical_finish_buffer: true,
    void_required: false
  });
  recordRoute(stage.beats[7], "main", [
    { x: 25020, y: 318 }, { x: 25500, y: 318 }, { x: 26100, y: 320 },
    { x: 26700, y: 320 }, { x: 27300, y: 320 }, { x: 27800, y: 320 },
    { x: 28180, y: 318 }
  ], { coinLimit: 6 });

  return finalize({
    startSurface: b1start,
    introLines: [
      "[@n,老师快跑]6 涡轮海岸公路 · V4",
      "本关开场固定 Turbo：按住喷水加速，松开喷水减速。高速路线失手只会落入连续低路。"
    ],
    finishPosition: { x: 28245, y: 320 },
    finishSize: { x: 92, y: 360 },
    finishBlueCoin: { x: 27820, y: 245 },
    extraFlowMetadata: {
      actual_turbo_pickup: true,
      forced_nozzle: 3,
      physical_reverse_belts: 5,
      physical_check_gates: 3,
      enemy_free_finale: true,
      safe_low_route: true
    }
  });
}
