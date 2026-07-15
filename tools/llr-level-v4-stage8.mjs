import { createV4SceneBuilder } from "./llr-level-v4-kit.mjs";

function beat(id, name, topology, startX, endX, seconds, act, cadence, mechanics, event, failure, stateChange = false) {
  return {
    id, name, topology, startX, endX, seconds, act, cadence, mechanics, event, failure,
    input: "direction+one-action",
    stateChange
  };
}

export const V4_STAGE_EIGHT_BLUEPRINT = {
  id: 8,
  title: "8 钟楼机关城 · V4",
  description: "旋转周期、主动相位校准、逆带回程与钟王三击",
  tint: "Color(0.96, 0.93, 0.84, 1)",
  spawnY: 240,
  levelWidth: 25000,
  cameraTop: -620,
  cameraBottom: 780,
  finishY: 120,
  beats: [
    beat(1, "单摆观察台", "single-cycle-observation", 0, 2200, 18, 1, "introduction",
      ["rotating", "terrain", "preview"],
      "在完整安全台观察一个慢旋转块的全部周期，再自行选择窗口",
      "玩家可站在静态地面等任意轮次"),
    beat(2, "早晚双窗口", "two-offset-window-groups", 2200, 4900, 24, 1, "introduction",
      ["rotating", "branch", "static-island"],
      "两组错相机关提供早窗口和晚窗口，中间宽岛切断连续等待",
      "错过窗口最多等两秒，下方维修层持续接住"),
    beat(3, "三相校准台", "ground-pound-phase-calibration", 4900, 8200, 30, 2, "development",
      ["objective", "ground_pound", "rotating", "director"],
      "在安全校准台砸地，让三组旋转块真实归零并短暂同步",
      "不校准也能走下方静态维修路；目标允许旋转或砸地", true),
    beat(4, "钟室休息", "phase-display-rest-room", 8200, 10000, 14, 2, "development",
      ["checkpoint", "bottle", "terrain", "preview"],
      "灯带和三枚静态刻度展示当前相位，玩家在完整地面休息",
      "无敌人、无移动落点，段中保存检查点"),
    beat(5, "逆带短回程", "reverse-belt-switchback", 10000, 13900, 34, 2, "development",
      ["conveyor", "objective", "director", "terrain"],
      "顶住逆带前进后砸开开关，传送带真实反转形成短回程",
      "每条带两端都有静态挡板凹槽，开关可直接砸地", true),
    beat(6, "大钟面换乘环", "clock-face-transfer-ring", 13900, 17400, 32, 2, "twist",
      ["pivot", "shuttle", "rotating", "recovery"],
      "依次换乘外环、径向线和中心梯，每一段只读取一种运动周期",
      "下方慢速维修层与两座宽升降台持续回收"),
    beat(7, "钟王三击", "three-impact-clock-king", 17400, 22100, 44, 3, "twist",
      ["thwomp", "objective", "director", "checkpoint"],
      "三次诱导巨型冲压块砸中宽地板靶，每击真实移开一层门并保存",
      "每个阴影区两侧有宽安全凹槽，玩家砸地也是可靠兜底", true),
    beat(8, "三相同步离场", "synchronized-bell-exit", 22100, 25000, 20, 3, "resolution",
      ["static-platform", "director", "finish"],
      "三击完成后宽平台升成钟形离场线，大钟响起并交还静态终点",
      "终段无敌人、无等待、无新增操作", true)
  ]
};

export function buildV4StageEightScene(context) {
  const stage = context.stage;
  const b = createV4SceneBuilder(context);
  const {
    vector,
    addInstance,
    addContract,
    addTerrain,
    grounded,
    airborne,
    recordRoute,
    addPivot,
    addShuttle,
    addCloud,
    addWood,
    addDirector,
    finalize
  } = b;

  function addGroundChain(prefix, startX, endX, y, profile = [0, 5, -4, 0]) {
    const ids = [];
    let x = startX;
    let index = 1;
    while (x < endX) {
      const width = Math.min(850, endX - x);
      ids.push(addTerrain(`${prefix}${index}`, x, y + (index % 2 ? 0 : 4), width, profile));
      if (x + width >= endX) break;
      x += width - 10;
      index += 1;
    }
    return ids;
  }

  function addRotating(name, x, y, options = {}) {
    const width = options.width || 360;
    return airborne(name, "Items/Mechanisms", "rotating", x, y, {
      size: vector(width, options.height || 40),
      speed: String(options.speed || 1),
      wait: String(options.wait || 90),
      interval: String(options.interval || 90),
      time_offset: String(options.timeOffset || 0),
      angle_offset: String(options.angleOffset || 0),
      type: "1",
      "metadata/_llr_walkable_width": String(width)
    });
  }

  function addObjective(name, x, y, role) {
    return airborne(name, "Items/Mechanisms", "objectiveTarget", x, y, {
      objective_id: JSON.stringify(name),
      accepted_hits: "7",
      target_size: vector(128, 24),
      "metadata/_llr_objective_role": JSON.stringify(role),
      "metadata/_llr_ground_pound_fallback": "true"
    });
  }

  function addRecoveryLift(name, x, topY) {
    return addShuttle(name, x, 620, { x: 0, y: topY - 620 }, {
      travelSeconds: 3.0,
      pauseSeconds: 0.55,
      phase: 0.35,
      scaleX: 2.5,
      walkableWidth: 224
    });
  }

  // Continuous physical maintenance floor; no clock mechanism can trap the player above void.
  addGroundChain("ClockMaintenanceFloor", 1800, 24800, 650, [0, 8, -6, 0]);
  addContract("WholeClockRecoveryContract", {
    continuous_maintenance_floor: true,
    recovery_y: 650,
    maximum_lift_spacing: 2600,
    void_required: false
  });

  // Beat 1: one slow mechanism is shown in isolation over static ground.
  const b1start = addTerrain("B1ClockStart", -40, 240, 760, [0, -8, 6, 0]);
  const b1observe = addTerrain("B1ObservationDeck", 700, 240, 850, [0, 6, -6, 0]);
  const b1exit = addTerrain("B1ObservationExit", 1530, 240, 750, [0, -5, 5, 0]);
  addRotating("B1SingleSlowBlock", 1180, 120, { width: 400, wait: 120, interval: 90 });
  grounded("B1ClockSign", "Items/Decoration", "sign", b1observe, 0.45, -3, {
    lines: `Array[String](["先看完整一轮：钟块停稳后会给出很长的通过窗口。"] )`
  });
  addContract("B1CycleObservationContract", {
    rotating_block_count: 1,
    static_waiting_floor: true,
    minimum_window_seconds: 2,
    void_required: false
  });
  recordRoute(stage.beats[0], "main", [
    { x: 100, y: 238 }, { x: 600, y: 235 }, { x: 1050, y: 238 },
    { x: 1500, y: 238 }, { x: 2180, y: 238 }
  ]);

  // Beat 2: two independently offset groups with a large static island between them.
  const b2entry = addTerrain("B2WindowEntry", 2200, 240, 480, [0, 0]);
  const b2island = addTerrain("B2WindowRestIsland", 3380, 210, 720, [0, 6, -6, 0]);
  const b2exit = addTerrain("B2WindowExit", 4580, 240, 420, [0, 0]);
  [2740, 3180].forEach((x, index) => addRotating(`B2EarlyWindow${index + 1}`, x, 180, {
    width: 360, wait: 100, timeOffset: 0, speed: 1
  }));
  [4140, 4520].forEach((x, index) => addRotating(`B2LateWindow${index + 1}`, x, 180, {
    width: 360, wait: 100, timeOffset: 60, speed: -1
  }));
  addRecoveryLift("B2MaintenanceLift", 4700, 230);
  addContract("B2WindowContract", {
    phase_group_count: 2,
    static_island_between_groups: true,
    maximum_wait_seconds: 2,
    maintenance_floor_below: true,
    void_required: false
  });
  recordRoute(stage.beats[1], "main", [
    { x: 2200, y: 238 }, { x: 2740, y: 170 }, { x: 3180, y: 170 },
    { x: 3450, y: 208 }, { x: 4000, y: 208 }, { x: 4140, y: 170 },
    { x: 4520, y: 170 }, { x: 4860, y: 238 }
  ]);
  recordRoute(stage.beats[1], "recovery", [
    { x: 2250, y: 620 }, { x: 3400, y: 620 }, { x: 4400, y: 620 },
    { x: 4700, y: 620 }, { x: 4700, y: 230 }
  ], { recoverySeconds: 10, coinLimit: 3 });

  // Beat 3: one objective calls the real phase-reset method on all three groups.
  const b3plaza = addTerrain("B3CalibrationPlaza", 4900, 240, 760, [0, -6, 6, 0]);
  addObjective("B3CalibrationTarget", 5350, 226, "phase-calibration");
  const calibrationBlocks = [];
  const calibrationXs = [5900, 6320, 6740, 7160, 7580, 7980];
  calibrationXs.forEach((x, index) => calibrationBlocks.push(addRotating(`B3PhaseBlock${index + 1}`, x, 120, {
    width: 340,
    wait: 105,
    timeOffset: (index % 3) * 35,
    speed: index % 2 ? -1 : 1
  })));
  addDirector("B3CalibrationDirector", 0, 0, {
    objectives: ["../Items/Mechanisms/B3CalibrationTarget"],
    waitForObjectives: true,
    targets: calibrationBlocks.map((_, index) => `../Items/Mechanisms/B3PhaseBlock${index + 1}`),
    targetMethod: "llr_calibrate_phase",
    announcement: "三相已归零：同步窗口已打开",
    checkpoint: true,
    width: 16,
    height: 16
  });
  const b3repairClouds = [];
  for (let index = 0; index < 8; index += 1) {
    b3repairClouds.push(addCloud(`B3RepairCloud${index + 1}`, 5750 + index * 300, 410 + (index % 2) * 18, 12));
  }
  addRecoveryLift("B3CalibrationLift", 8050, 210);
  addContract("B3CalibrationContract", {
    phase_group_count: 3,
    physical_phase_reset: true,
    calibration_method: "llr_calibrate_phase",
    static_repair_route: true,
    target_fallback: true,
    void_required: false
  });
  recordRoute(stage.beats[2], "main", [
    { x: 4900, y: 238 }, { x: 5350, y: 225 }, { x: 5900, y: 110 },
    { x: 6320, y: 110 }, { x: 6740, y: 110 }, { x: 7160, y: 110 },
    { x: 7580, y: 110 }, { x: 7980, y: 110 }, { x: 8180, y: 230 }
  ]);
  recordRoute(stage.beats[2], "recovery", [
    { x: 5000, y: 620 }, { x: 5750, y: 410 }, { x: 6650, y: 425 },
    { x: 7550, y: 410 }, { x: 8050, y: 620 }, { x: 8050, y: 210 }
  ], { recoverySeconds: 12, coinLimit: 4 });

  // Beat 4: grounded phase display and checkpoint.
  const b4rest = addGroundChain("B4ClockRoom", 8200, 10000, 230, [0, 4, -4, 0]);
  [8550, 9000, 9450].forEach((x, index) => {
    addRotating(`B4PhaseDisplay${index + 1}`, x, 110, {
      width: 220, wait: 180, timeOffset: index * 60, speed: 1
    });
  });
  airborne("B4ClockBottle", "Items/Pickups", "bottle", 9120, 180);
  addDirector("B4ClockRoomCheckpoint", 9200, 150, {
    announcement: "钟室休息：三枚刻度分别显示三相位置",
    checkpoint: true,
    width: 300,
    height: 220
  });
  addContract("B4ClockRoomContract", {
    static_floor: true,
    phase_display_count: 3,
    enemy_count: 0,
    checkpoint: true,
    void_required: false
  });
  recordRoute(stage.beats[3], "main", [
    { x: 8200, y: 228 }, { x: 8600, y: 228 }, { x: 9050, y: 230 },
    { x: 9500, y: 228 }, { x: 9980, y: 228 }
  ]);

  // Beat 5: reversing the belts is an actual speed multiplier, but static bays keep both states safe.
  const b5floor = addGroundChain("B5ReverseFloor", 10000, 13900, 240, [0, 5, -5, 0]);
  const beltSpecs = [[10400, -95], [11150, -110], [11900, -90], [12650, -105], [13400, -85]];
  beltSpecs.forEach(([x, speed], index) => airborne(`B5ClockBelt${index + 1}`, "Items/Mechanisms", "conveyor", x, 228, {
    width: "288",
    speed: String(speed),
    "metadata/_llr_end_bays": "true"
  }));
  addObjective("B5ReverseTarget", 12950, 226, "belt-reverse");
  addDirector("B5ReverseDirector", 0, 0, {
    objectives: ["../Items/Mechanisms/B5ReverseTarget"],
    waitForObjectives: true,
    targets: beltSpecs.map((_, index) => `../Items/Mechanisms/B5ClockBelt${index + 1}`),
    numericProperty: "speed",
    multiplier: -1,
    announcement: "传送带已反转：短回程形成",
    checkpoint: true,
    width: 16,
    height: 16
  });
  addContract("B5ReverseBeltContract", {
    physical_speed_reversal: true,
    belt_count: 5,
    static_end_bays: 6,
    target_fallback: true,
    void_required: false
  });
  recordRoute(stage.beats[4], "main", [
    { x: 10000, y: 238 }, { x: 10400, y: 228 }, { x: 10800, y: 238 },
    { x: 11200, y: 228 }, { x: 11600, y: 238 }, { x: 12000, y: 228 },
    { x: 12400, y: 238 }, { x: 12950, y: 226 }, { x: 13400, y: 228 },
    { x: 13880, y: 238 }
  ]);

  // Beat 6: each transfer reads one motion type, with a full repair floor below.
  const b6entry = addTerrain("B6ClockFaceEntry", 13900, 240, 620, [0, -6, 6, 0]);
  addPivot("B6OuterRing", 14900, 80, 190, 0.7, 0, 4);
  addShuttle("B6RadialShuttle", 15300, 220, { x: 760, y: -180 }, {
    travelSeconds: 3.2, pauseSeconds: 0.6, phase: 0.25, scaleX: 2.5, walkableWidth: 224
  });
  addRotating("B6CenterClockStep", 16500, -20, { width: 400, wait: 110, speed: -1 });
  const b6exit = addTerrain("B6ClockFaceExit", 17020, 120, 520, [0, 0]);
  addCloud("B6OuterWait", 14550, 300, 15);
  addCloud("B6RadialWait", 15700, 300, 15);
  addCloud("B6CenterWait", 16650, 260, 15);
  addRecoveryLift("B6MaintenanceLiftA", 14600, 240);
  addRecoveryLift("B6MaintenanceLiftB", 16900, 120);
  addContract("B6ClockFaceContract", {
    motion_types: 3,
    simultaneous_large_mechanisms: 3,
    moving_landing_width: 224,
    maintenance_floor_below: true,
    recovery_lift_count: 2,
    void_required: false
  });
  recordRoute(stage.beats[5], "main", [
    { x: 13900, y: 238 }, { x: 14550, y: 300 }, { x: 14900, y: 250 },
    { x: 15300, y: 210 }, { x: 16060, y: 30 }, { x: 16500, y: -30 },
    { x: 17020, y: 118 }, { x: 17380, y: 118 }
  ]);
  recordRoute(stage.beats[5], "recovery", [
    { x: 14000, y: 620 }, { x: 14600, y: 620 }, { x: 14600, y: 240 },
    { x: 15800, y: 620 }, { x: 16900, y: 620 }, { x: 16900, y: 120 }
  ], { recoverySeconds: 12, coinLimit: 4 });

  // Beat 7: three wide target bays; each impact opens one physical gate.
  const b7floor = addGroundChain("B7ClockKingFloor", 17400, 22100, 240, [0, 4, -4, 0]);
  const strikes = [
    { x: 18050, gateX: 18700 },
    { x: 19250, gateX: 19900 },
    { x: 20450, gateX: 21100 }
  ];
  strikes.forEach((strike, index) => {
    const number = index + 1;
    addObjective(`B7ClockKingTarget${number}`, strike.x, 226, "clock-king-impact");
    airborne(`B7ClockKingThwomp${number}`, "Items/Enemies", "thwomp", strike.x, -170, {
      attack_mode: "0",
      attack_delay: "0.75",
      ground_wait: "0.9",
      detection_range: vector(180, 370),
      scale: vector(1.7, 1.7)
    });
    addTerrain(`B7ClockKingGate${number}`, strike.gateX, 45, 130, [0, 0], 200);
    addCloud(`B7ClockKingAlcove${number}A`, strike.x - 180, 120, 12);
    addCloud(`B7ClockKingAlcove${number}B`, strike.x + 180, 120, 12);
    addDirector(`B7ClockKingDirector${number}`, 0, 0, {
      objectives: [`../Items/Mechanisms/B7ClockKingTarget${number}`],
      waitForObjectives: true,
      move: [`../Terrain/B7ClockKingGate${number}`],
      moveOffset: { x: 0, y: 300 },
      moveSeconds: 0.7,
      announcement: `钟王第 ${number} 击完成`,
      checkpoint: true,
      width: 16,
      height: 16
    });
  });
  addTerrain("B7FinalBellGate", 21750, 45, 140, [0, 0], 200);
  addContract("B7ClockKingContract", {
    impact_count: 3,
    warning_seconds: 1.5,
    side_alcove_count: 6,
    per_impact_checkpoint: true,
    ground_pound_fallback: true,
    physical_gate_count: 3,
    void_required: false
  });
  recordRoute(stage.beats[6], "main", [
    { x: 17400, y: 238 }, { x: 18050, y: 226 }, { x: 18600, y: 238 },
    { x: 19250, y: 226 }, { x: 19800, y: 238 }, { x: 20450, y: 226 },
    { x: 21100, y: 238 }, { x: 21700, y: 238 }, { x: 22080, y: 238 }
  ]);

  // Beat 8: all three completed objectives raise a physical, wide exit bridge and remove the final gate.
  const bridgePaths = [];
  for (let index = 0; index < 8; index += 1) {
    addWood(`B8BellBridge${index + 1}`, 22120 + index * 330, 500, 8);
    bridgePaths.push(`../Items/Platforms/B8BellBridge${index + 1}`);
  }
  const b8finish = addTerrain("B8BellFinish", 24500, 120, 580, [0, -6, 0]);
  const allTargets = [1, 2, 3].map((index) => `../Items/Mechanisms/B7ClockKingTarget${index}`);
  addDirector("B8RaiseBellBridge", 0, 0, {
    objectives: allTargets,
    waitForObjectives: true,
    move: bridgePaths,
    moveOffset: { x: 0, y: -320 },
    moveSeconds: 1.1,
    announcement: "三相同步：钟形离场线已组成",
    checkpoint: true,
    width: 16,
    height: 16
  });
  addDirector("B8RemoveFinalBellGate", 0, 0, {
    objectives: allTargets,
    waitForObjectives: true,
    move: ["../Terrain/B7FinalBellGate"],
    moveOffset: { x: 0, y: 320 },
    moveSeconds: 0.8,
    checkpoint: false,
    width: 16,
    height: 16
  });
  grounded("B8BellFlowers", "Items/Decoration", "flowers", b8finish, 0.66, -10);
  addContract("B8SynchronizedExitContract", {
    required_objectives: 3,
    physical_bridge_platforms: 8,
    bridge_landing_width: 256,
    open_gap: 74,
    static_finish: true,
    enemy_count: 0,
    void_required: false
  });
  recordRoute(stage.beats[7], "main", [
    { x: 22100, y: 238 }, { x: 22120, y: 180 }, { x: 22450, y: 180 },
    { x: 22780, y: 180 }, { x: 23110, y: 180 }, { x: 23440, y: 180 },
    { x: 23770, y: 180 }, { x: 24100, y: 180 }, { x: 24430, y: 180 },
    { x: 24700, y: 118 }, { x: 24950, y: 118 }
  ]);

  return finalize({
    startSurface: b1start,
    introLines: [
      "[@n,老师快跑]8 钟楼机关城 · V4",
      "先观察，再主动校准。下方维修层始终开放，所有冲压靶也能由你直接砸地完成。"
    ],
    finishPosition: { x: 25045, y: 120 },
    finishSize: { x: 92, y: 360 },
    finishBlueCoin: { x: 24780, y: 60 },
    extraFlowMetadata: {
      physical_phase_calibration: true,
      physical_belt_reversal: true,
      clock_king_impacts: 3,
      continuous_maintenance_floor: true,
      synchronized_exit_platforms: 8,
      void_required: false
    }
  });
}
