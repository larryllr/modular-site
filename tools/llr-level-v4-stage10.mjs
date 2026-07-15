import { createV4SceneBuilder } from "./llr-level-v4-kit.mjs";

function beat(id, name, topology, startX, endX, seconds, act, cadence, mechanics, event, failure, stateChange = false) {
  return {
    id, name, topology, startX, endX, seconds, act, cadence, mechanics, event, failure,
    input: "direction+one-action",
    stateChange
  };
}

export const V4_STAGE_TEN_BLUEPRINT = {
  id: 10,
  title: "10 老师城·万响礼堂 · V4",
  description: "七座宽铃垫、永久舞台变形、双侧席回环与四段合奏终局",
  tint: "Color(1, 0.91, 0.86, 1)",
  spawnY: 260,
  levelWidth: 33200,
  cameraTop: -720,
  cameraBottom: 780,
  deathY: 930,
  finishY: 240,
  beats: [
    beat(1, "九声回响序厅", "nine-echo-safe-overture", 0, 2400, 20, 1, "introduction",
      ["bell", "audience", "terrain", "preview"],
      "沿完整观众席听前九口铃依次回响，中央巨钟保持无声，学生剪影等待第十响",
      "全段为连续实体地面，无敌人、无移动落点"),
    beat(2, "中央宽铃开远门", "wide-bell-opens-distant-gate", 2400, 5200, 24, 1, "introduction",
      ["objective", "ground_pound", "director", "gate"],
      "在超宽中央铃垫跳起后砸地，发光连线显现并让远处实体门真实升起",
      "铃垫宽 384px、位于完整地面；失败只需原地再次跳起砸地", true),
    beat(3, "双铃生成台阶", "ordinary-and-spring-bell-stairs", 5200, 9800, 30, 2, "development",
      ["objective", "spring", "director", "physical-stairs"],
      "普通路线与弹簧路线各抵达一枚宽铃垫，每砸一枚都从台下永久升起一组实体宽台阶",
      "两处铃垫下方均有连续乐池、回收升降台和可反复使用的弹簧", true),
    beat(4, "后台静态休息", "backstage-static-intermission", 9800, 11600, 14, 2, "development",
      ["checkpoint", "bottle", "audience", "route-map"],
      "在后台完整地板补给，查看左右侧席、中央指挥台和终局路线图",
      "静态检查点、无敌人、无移动平台、无强制等待"),
    beat(5, "左右侧席自由复习", "independent-side-wing-loops", 11600, 18000, 34, 2, "development",
      ["shuttle", "water", "objective", "branch"],
      "左右侧席任选顺序：左翼复习宽移动平台，右翼选择水路或陆路；各自宽铃垫独立完成并生成返场桥",
      "两翼状态分别保存，失足落到实体乐池；任一侧完成后都能立即走新桥返回中央", true),
    beat(6, "中央指挥台下沉环路", "three-gates-and-lowering-stage", 18000, 22400, 32, 2, "twist",
      ["objective", "gate", "director", "moving-floor"],
      "砸响中央指挥垫，三扇实体门同时升起，四块实体舞台地板安全下沉并组成下层环路",
      "变化在固定指挥台上触发；下沉台下仍是实体乐池，两端永久台阶可进可退", true),
    beat(7, "四段合奏环", "four-movement-orchestra-relay", 22400, 29600, 48, 3, "twist",
      ["shuttle", "spring", "hover", "thwomp"],
      "依次完成宽 Shuttle、弹簧、短 Hover、短冲压廊；每段先落到宽静态台，再介绍下一种动作",
      "每两段保存一次；环形乐池、四座宽升降台在 10–15 秒内送回当前稳定落点"),
    beat(8, "第十响胜利直路", "final-pound-builds-victory-road", 29600, 33200, 24, 3, "resolution",
      ["objective", "physical-platforms", "bell", "finish"],
      "最后一砸让九块实体平台升成无伤终点直路，十口铃依次亮起后进入可靠 FinishWarp",
      "最终铃垫位于完整地面；终段无敌人、无新操作，桥下乐池只把玩家送回铃垫", true)
  ]
};

export function buildV4StageTenScene(context) {
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
    addShuttle,
    addCloud,
    addWood,
    addWater,
    addDirector,
    assertConservativePlatformChain,
    finalize
  } = b;

  const objectives = [];
  const physicalChanges = [];
  const WIDE_PAD = 320;
  const DORMANT_OFFSET = 1000;
  const RECOVERY_Y = 650;

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

  function addSolidRect(name, parent, x, y, width, height, color, metadata = {}) {
    const polygon = packed([[0, 0], [width, 0], [width, height], [0, height]]);
    addPlainNode(name, "StaticBody2D", parent, {
      position: vector(x, y),
      collision_layer: "1",
      collision_mask: "0",
      ...metadata
    });
    addPlainNode(`${name}Collision`, "CollisionPolygon2D", `${parent}/${name}`, { polygon });
    addPlainNode(`${name}Face`, "Polygon2D", `${parent}/${name}`, {
      z_index: "2",
      polygon,
      color
    });
    return `../${parent}/${name}`;
  }

  function addObjective(name, x, floorY, role, width = WIDE_PAD) {
    objectives.push({ name, width, acceptedHits: 1, role });
    airborne(name, "Items/Mechanisms", "objectiveTarget", x, floorY - 15, {
      objective_id: JSON.stringify(name),
      accepted_hits: "1",
      target_size: vector(width, 30),
      "metadata/_llr_objective_role": JSON.stringify(role),
      "metadata/_llr_reliable_ground_pound": "true",
      "metadata/_llr_one_shot_permanent": "true"
    });
    return `../Items/Mechanisms/${name}`;
  }

  function addDormantWood(name, x, finalY, widthUnits = 9, dormantOffset = DORMANT_OFFSET) {
    const walkableWidth = 32 * widthUnits;
    addInstance(name, "Items/Platforms", "wood", {
      position: vector(x, finalY + dormantOffset),
      scale: vector(widthUnits / 2, 1),
      "metadata/_llr_walkable_width": String(walkableWidth),
      "metadata/_llr_final_y": String(finalY),
      "metadata/_llr_dormant_offset_y": String(dormantOffset),
      "metadata/_llr_physical_stage_change": "true"
    });
    physicalChanges.push(name);
    return {
      name,
      path: `../Items/Platforms/${name}`,
      x,
      y: finalY,
      walkableWidth,
      halfWidth: walkableWidth / 2
    };
  }

  function addRecoveryLift(name, x, topY, options = {}) {
    return addShuttle(name, x, RECOVERY_Y, { x: 0, y: topY - RECOVERY_Y }, {
      travelSeconds: options.travelSeconds || 2.8,
      pauseSeconds: options.pauseSeconds ?? 0.55,
      phase: options.phase ?? 0.25,
      scaleX: options.scaleX || 2.75,
      walkableWidth: options.walkableWidth || 240
    });
  }

  function addBellFacade(name, x, y, order, options = {}) {
    const radius = options.radius || 28;
    const visible = options.visible === false ? "false" : "true";
    const bell = [];
    for (let index = 0; index < 12; index += 1) {
      const angle = Math.PI + (Math.PI * index) / 11;
      bell.push([Math.cos(angle) * radius, Math.sin(angle) * radius * 0.82]);
    }
    bell.push([radius * 1.08, radius * 0.7], [-radius * 1.08, radius * 0.7]);
    addPlainNode(`${name}Bell`, "Polygon2D", "Items/Decoration", {
      z_index: "4",
      position: vector(x, y),
      polygon: packed(bell),
      color: options.color || "Color(0.95, 0.66, 0.16, 1)",
      visible,
      "metadata/_llr_bell_order": String(order)
    });
    addPlainNode(`${name}Clapper`, "Polygon2D", "Items/Decoration", {
      z_index: "5",
      position: vector(x, y + radius * 0.8),
      polygon: packed([[-7, -6], [7, -6], [10, 6], [-10, 6]]),
      color: "Color(0.28, 0.12, 0.06, 1)",
      visible,
      "metadata/_llr_bell_order": String(order)
    });
    addPlainNode(`${name}Number`, "Label", "Items/Decoration", {
      z_index: "6",
      position: vector(x - 10, y - 21),
      text: JSON.stringify(String(order)),
      "theme_override_colors/font_color": "Color(0.12, 0.07, 0.03, 1)",
      "theme_override_colors/font_outline_color": "Color(1, 0.94, 0.7, 1)",
      "theme_override_constants/outline_size": "3",
      "theme_override_font_sizes/font_size": options.fontSize ? String(options.fontSize) : "17",
      visible,
      "metadata/_llr_bell_order": String(order)
    });
    return [
      `../Items/Decoration/${name}Bell`,
      `../Items/Decoration/${name}Clapper`,
      `../Items/Decoration/${name}Number`
    ];
  }

  function addAudienceRow(prefix, startX, y, count, spacing, color) {
    for (let index = 0; index < count; index += 1) {
      const x = startX + index * spacing;
      addPlainNode(`${prefix}Student${index + 1}`, "Polygon2D", "Items/Decoration", {
        z_index: "-1",
        position: vector(x, y + (index % 2) * 5),
        polygon: packed([[-10, -25], [10, -25], [15, 2], [10, 32], [-10, 32], [-15, 2]]),
        color,
        "metadata/_llr_waiting_student": "true"
      });
      addPlainNode(`${prefix}StudentHead${index + 1}`, "Polygon2D", "Items/Decoration", {
        z_index: "0",
        position: vector(x, y - 35 + (index % 2) * 5),
        polygon: packed([[-9, -8], [0, -12], [9, -8], [12, 0], [8, 9], [0, 12], [-8, 9], [-12, 0]]),
        color: "Color(0.91, 0.68, 0.5, 1)",
        "metadata/_llr_waiting_student": "true"
      });
    }
  }

  function addGlowLine(name, points, visible = true) {
    addPlainNode(name, "Line2D", "Items/Decoration", {
      z_index: "3",
      points: packed(points),
      width: "10",
      default_color: "Color(1, 0.82, 0.22, 0.92)",
      antialiased: "true",
      visible: visible ? "true" : "false",
      "metadata/_llr_bell_signal": "true"
    });
    return `../Items/Decoration/${name}`;
  }

  const expectedSeconds = stage.beats.reduce((sum, item) => sum + item.seconds, 0);
  const beatWidths = stage.beats.map((item) => item.endX - item.startX);
  if (stage.beats.length !== 8 || expectedSeconds < 220 || expectedSeconds > 250 || new Set(beatWidths).size < 7) {
    throw new Error("Stage 10 V4 blueprint must contain eight unequal beats totaling 220–250 seconds");
  }

  addContract("V4StageTenStructureContract", {
    target_seconds: expectedSeconds,
    beat_count: 8,
    unequal_beat_widths: true,
    wide_ground_pound_objectives: 7,
    opening_echo_bells: 9,
    distant_gate_count: 1,
    generated_stair_sets: 2,
    independent_side_wings: 2,
    conductor_gate_count: 3,
    lowering_floor_panel_count: 4,
    finale_movement_count: 4,
    final_victory_platform_count: 9,
    continuous_physical_recovery: true,
    void_required: false
  });

  // A continuous solid orchestra pit catches every fall from the first generated staircase onward.
  addGroundChain("OrchestraPitFloor", 5000, 33200, RECOVERY_Y, [0, 7, -5, 0]);
  addContract("WholeHallRecoveryContract", {
    physical_orchestra_pit: true,
    recovery_y: RECOVERY_Y,
    maximum_return_seconds: 15,
    moving_recovery_width: 240,
    void_required: false
  });

  // Beat 1: nine visible echo bells and seated silhouettes establish the missing tenth sound.
  const b1start = addTerrain("B1OvertureStart", -40, 260, 850, [0, -7, 6, 0]);
  const b1audience = addTerrain("B1AudienceFloor", 790, 260, 850, [0, 5, -5, 0]);
  const b1bellFloor = addTerrain("B1EchoBellFloor", 1620, 260, 820, [0, -4, 4, 0]);
  for (let index = 0; index < 9; index += 1) {
    addBellFacade(`B1Echo${index + 1}`, 250 + index * 190, 92 + (index % 2) * 20, index + 1, {
      radius: 24,
      color: index % 2 ? "Color(0.95, 0.58, 0.15, 1)" : "Color(1, 0.75, 0.2, 1)"
    });
  }
  addBellFacade("B1SilentGreatBell", 2110, 30, 10, {
    radius: 64,
    fontSize: 24,
    color: "Color(0.35, 0.39, 0.48, 1)"
  });
  addAudienceRow("B1FrontRow", 370, 202, 9, 145, "Color(0.18, 0.32, 0.52, 1)");
  addAudienceRow("B1BackRow", 470, 145, 8, 155, "Color(0.42, 0.2, 0.48, 1)");
  grounded("B1OvertureSign", "Items/Decoration", "sign", b1audience, 0.58, -3, {
    lines: `Array[String](["九声已经回响。中央巨钟在等你用砸地敲出第十响。"] )`
  });
  addContract("B1OvertureContract", {
    echo_order_count: 9,
    central_bell_silent: true,
    waiting_student_rows: 2,
    static_safe_floor: true,
    enemy_count: 0,
    void_required: false
  });
  recordRoute(stage.beats[0], "main", [
    { x: 100, y: 258 }, { x: 520, y: 255 }, { x: 980, y: 258 },
    { x: 1440, y: 258 }, { x: 1900, y: 258 }, { x: 2380, y: 258 }
  ]);

  // Beat 2: one genuinely wide objective raises a remote solid gate and reveals its signal line.
  const b2floors = addGroundChain("B2CentralAisle", 2400, 5200, 260, [0, 4, -4, 0]);
  const b2target = addObjective("B2CentralWideBellPad", 3260, 260, "open-distant-gate", 384);
  const b2gate = addSolidRect("B2DistantBellGate", "Terrain", 5000, 20, 120, 240,
    "Color(0.25, 0.16, 0.38, 1)", {
      "metadata/_llr_distant_gate": "true",
      "metadata/_llr_initially_closed": "true"
    });
  physicalChanges.push("B2DistantBellGate");
  const b2signal = addGlowLine("B2DistantGateSignal", [[3260, 208], [3740, 90], [4320, 90], [5000, 150]], false);
  addDirector("B2DistantGateDirector", 0, 0, {
    objectives: [b2target],
    waitForObjectives: true,
    move: [b2gate],
    moveOffset: { x: 0, y: -360 },
    moveSeconds: 0.9,
    reveal: [b2signal],
    announcement: "第一响：远门已经升起",
    checkpoint: true,
    width: 16,
    height: 16
  });
  addContract("B2DistantGateContract", {
    target_width: 384,
    accepted_hit_mask: 1,
    real_collision_gate: true,
    real_gate_move_y: -360,
    signal_line_revealed: true,
    retry_on_same_floor: true,
    void_required: false
  });
  recordRoute(stage.beats[1], "main", [
    { x: 2400, y: 258 }, { x: 2860, y: 258 }, { x: 3260, y: 245 },
    { x: 3720, y: 258 }, { x: 4240, y: 258 }, { x: 4760, y: 258 },
    { x: 5180, y: 258 }
  ]);

  // Beat 3A: the ordinary bell lifts a conservative four-step physical staircase.
  const b3ordinaryFloor = addGroundChain("B3OrdinaryBellFloor", 5200, 6400, 260, [0, 4, -4, 0]);
  const b3ordinaryTarget = addObjective("B3OrdinaryRouteBellPad", 5840, 260, "generate-ordinary-stairs", 336);
  const ordinaryStairs = [
    ["B3OrdinaryStep1", 6460, 240],
    ["B3OrdinaryStep2", 6770, 175],
    ["B3OrdinaryStep3", 7080, 110],
    ["B3OrdinaryStep4", 7390, 45]
  ].map(([name, x, y]) => addDormantWood(name, x, y, 9));
  assertConservativePlatformChain("Stage10OrdinaryGeneratedStairs", ordinaryStairs, {
    maxGap: 64,
    maxRise: 70,
    minLandingWidth: 288
  });
  addDirector("B3OrdinaryStairDirector", 0, 0, {
    objectives: [b3ordinaryTarget],
    waitForObjectives: true,
    move: ordinaryStairs.map((platform) => platform.path),
    moveOffset: { x: 0, y: -DORMANT_OFFSET },
    moveSeconds: 1.0,
    announcement: "第二响：普通路线台阶已经升起",
    checkpoint: true,
    width: 16,
    height: 16
  });
  const b3springDeck = addTerrain("B3SpringLaunchDeck", 7460, 45, 800, [0, 4, -4, 0]);
  grounded("B3RouteSpring", "Items/Mechanisms", "spring", b3springDeck, 0.56, -8, {
    launch_speed: "10.5",
    horizontal_boost: "2.0"
  });

  // Beat 3B: a forgiving spring reaches the second pad, which raises the descent into backstage.
  const b3springLanding = addWood("B3SpringBellLanding", 8500, -250, 12);
  const b3springTarget = addObjective("B3SpringRouteBellPad", 8500, -250, "generate-spring-stairs", 336);
  const springStairs = [
    ["B3SpringStep1", 8750, -210],
    ["B3SpringStep2", 9060, -130],
    ["B3SpringStep3", 9370, -50],
    ["B3SpringStep4", 9680, 40],
    ["B3SpringStep5", 9990, 140]
  ].map(([name, x, y]) => addDormantWood(name, x, y, 9));
  assertConservativePlatformChain("Stage10SpringGeneratedStairs", springStairs, {
    maxGap: 64,
    maxRise: 92,
    minLandingWidth: 288
  });
  addDirector("B3SpringStairDirector", 0, 0, {
    objectives: [b3springTarget],
    waitForObjectives: true,
    move: springStairs.map((platform) => platform.path),
    moveOffset: { x: 0, y: -DORMANT_OFFSET },
    moveSeconds: 1.0,
    announcement: "第三响：后台台阶已经升起",
    checkpoint: true,
    width: 16,
    height: 16
  });
  grounded("B3PitRetrySpring", "Items/Mechanisms", "spring", "OrchestraPitFloor4", 0.55, -8, {
    launch_speed: "10.6",
    horizontal_boost: "0.8"
  });
  addRecoveryLift("B3SpringDeckRecoveryLift", 8120, 45, { phase: 0.4 });
  addContract("B3GeneratedStairContract", {
    objective_count: 2,
    ordinary_stair_count: ordinaryStairs.length,
    spring_stair_count: springStairs.length,
    minimum_step_width: 288,
    maximum_open_gap: 22,
    actual_node_move_y: -DORMANT_OFFSET,
    one_shot_permanent: true,
    retry_spring_count: 2,
    physical_pit_below: true,
    void_required: false
  });
  recordRoute(stage.beats[2], "main", [
    { x: 5200, y: 258 }, { x: 5840, y: 245 }, { x: 6300, y: 258 },
    { x: 6460, y: 240 }, { x: 6770, y: 175 }, { x: 7080, y: 110 },
    { x: 7390, y: 45 }, { x: 7900, y: 43 }, { x: 8500, y: -250 },
    { x: 8750, y: -210 }, { x: 9060, y: -130 }, { x: 9370, y: -50 },
    { x: 9680, y: 40 }, { x: 9990, y: 140 }, { x: 10100, y: 218 }
  ]);
  recordRoute(stage.beats[2], "recovery", [
    { x: 5200, y: 620 }, { x: 6500, y: 620 }, { x: 7600, y: 620 },
    { x: 8120, y: 620 }, { x: 8120, y: 45 }, { x: 8500, y: -245 }
  ], { recoverySeconds: 13, coinLimit: 4 });

  // Beat 4: a fully static backstage room resets the pace and previews both wings.
  const b4floors = addGroundChain("B4BackstageFloor", 9950, 11650, 220, [0, 3, -3, 0]);
  airborne("B4BackstageBottleA", "Items/Pickups", "bottle", 10420, 168);
  airborne("B4BackstageBottleB", "Items/Pickups", "bottle", 10920, 168);
  addAudienceRow("B4WaitingCast", 10200, 165, 8, 155, "Color(0.22, 0.46, 0.38, 1)");
  addPlainNode("B4HallRouteMap", "Line2D", "Items/Decoration", {
    z_index: "4",
    points: packed([[10600, 80], [10900, 10], [11200, 80], [11500, 10], [11800, 80]]),
    width: "8",
    default_color: "Color(0.2, 0.78, 1, 0.9)",
    antialiased: "true",
    "metadata/_llr_route_map": "true"
  });
  addDirector("B4BackstageCheckpoint", 10800, 145, {
    announcement: "后台休息：左右侧席可任选顺序，完成后回中央",
    checkpoint: true,
    width: 360,
    height: 220
  });
  addContract("B4BackstageContract", {
    static_checkpoint: true,
    enemy_count: 0,
    moving_platform_count: 0,
    bottle_count: 2,
    both_wings_previewed: true,
    forced_wait_seconds: 0,
    void_required: false
  });
  recordRoute(stage.beats[3], "main", [
    { x: 9800, y: 140 }, { x: 10100, y: 218 }, { x: 10500, y: 218 },
    { x: 10900, y: 218 }, { x: 11300, y: 218 }, { x: 11580, y: 218 }
  ]);

  // Beat 5 hub and left wing: broad moving platforms lead backward above the backstage floor.
  const b5hubFloors = addGroundChain("B5CentralHub", 11600, 13000, 220, [0, 4, -4, 0]);
  addRecoveryLift("B5LeftWingLift", 11850, -50, { phase: 0.15 });
  addShuttle("B5LeftShuttleA", 11550, -50, { x: -520, y: 0 }, {
    travelSeconds: 3.0, pauseSeconds: 0.65, phase: 0.1, scaleX: 3.0, walkableWidth: 288
  });
  addWood("B5LeftTransferIsland", 10850, -80, 10);
  addShuttle("B5LeftShuttleB", 10600, -80, { x: -480, y: -20 }, {
    travelSeconds: 2.8, pauseSeconds: 0.65, phase: 0.55, scaleX: 3.0, walkableWidth: 288
  });
  addWood("B5LeftBellLanding", 9950, -100, 12);
  const b5leftTarget = addObjective("B5LeftSideBellPad", 9950, -100, "left-wing-complete", 352);
  const leftReturn = [
    ["B5LeftReturn1", 10150, -85], ["B5LeftReturn2", 10460, -45],
    ["B5LeftReturn3", 10770, -5], ["B5LeftReturn4", 11080, 35],
    ["B5LeftReturn5", 11390, 75], ["B5LeftReturn6", 11700, 115]
  ].map(([name, x, y]) => addDormantWood(name, x, y, 9));
  assertConservativePlatformChain("Stage10LeftReturnBridge", leftReturn, {
    maxGap: 32,
    maxRise: 45,
    minLandingWidth: 288
  });
  addDirector("B5LeftWingDirector", 0, 0, {
    objectives: [b5leftTarget],
    waitForObjectives: true,
    move: leftReturn.map((platform) => platform.path),
    moveOffset: { x: 0, y: -DORMANT_OFFSET },
    moveSeconds: 0.9,
    announcement: "第四响：左侧席已完成，静态返场桥升起",
    checkpoint: true,
    width: 16,
    height: 16
  });

  // Beat 5 right wing: a visible land line and a forgiving water line share one physical basin.
  addWater("B5RightWingWater", 13000, 380, 3500, 270, {
    "metadata/_llr_solid_orchestra_bed": "true",
    "metadata/_llr_swim_or_land_choice": "true"
  });
  const rightLand = [];
  for (let index = 0; index < 9; index += 1) {
    rightLand.push(addCloud(`B5RightLandCloud${index + 1}`, 13250 + index * 400,
      120 + (index % 3 === 1 ? -45 : index % 3 === 2 ? -15 : 0), 20));
  }
  assertConservativePlatformChain("Stage10RightLandRoute", rightLand, {
    maxGap: 80,
    maxRise: 55,
    minLandingWidth: 320
  });
  addWood("B5WaterEntryStep", 13050, 330, 10);
  addWood("B5WaterExitStep", 16450, 330, 10);
  const b5rightFloor = addGroundChain("B5RightBellFloor", 16400, 18000, 220, [0, 4, -4, 0]);
  const b5rightTarget = addObjective("B5RightSideBellPad", 16820, 220, "right-wing-complete", 352);
  const rightReturn = [];
  for (let index = 0; index < 12; index += 1) {
    rightReturn.push(addDormantWood(`B5RightReturn${index + 1}`, 13200 + index * 290, 300, 9));
  }
  assertConservativePlatformChain("Stage10RightReturnBridge", rightReturn, {
    maxGap: 8,
    maxRise: 8,
    minLandingWidth: 288
  });
  addDirector("B5RightWingDirector", 0, 0, {
    objectives: [b5rightTarget],
    waitForObjectives: true,
    move: rightReturn.map((platform) => platform.path),
    moveOffset: { x: 0, y: -DORMANT_OFFSET },
    moveSeconds: 0.9,
    announcement: "第五响：右侧席已完成，水面返场桥升起",
    checkpoint: true,
    width: 16,
    height: 16
  });
  const b5exitGate = addSolidRect("B5BothWingsExitGate", "Terrain", 17720, -20, 120, 240,
    "Color(0.3, 0.16, 0.42, 1)", {
      "metadata/_llr_requires_both_wings": "true"
    });
  physicalChanges.push("B5BothWingsExitGate");
  addDirector("B5BothWingsUnlockDirector", 0, 0, {
    objectives: [b5leftTarget, b5rightTarget],
    waitForObjectives: true,
    move: [b5exitGate],
    moveOffset: { x: 0, y: -360 },
    moveSeconds: 0.8,
    announcement: "左右侧席完成：中央指挥台开放",
    checkpoint: true,
    width: 16,
    height: 16
  });
  addContract("B5IndependentWingsContract", {
    independent_objectives: 2,
    completion_order_free: true,
    moving_platform_wing: true,
    water_land_choice_wing: true,
    per_wing_checkpoint: true,
    per_wing_return_bridge: true,
    combined_exit_requires_both: true,
    physical_pit_below: true,
    void_required: false
  });
  recordRoute(stage.beats[4], "main", [
    { x: 11600, y: 218 }, { x: 12000, y: 218 }, { x: 11850, y: -50 },
    { x: 11550, y: -50 }, { x: 11030, y: -50 }, { x: 10850, y: -80 },
    { x: 10600, y: -80 }, { x: 10120, y: -100 }, { x: 9950, y: -115 },
    { x: 10460, y: -45 }, { x: 11080, y: 35 }, { x: 11700, y: 115 },
    { x: 12300, y: 218 }, { x: 13250, y: 120 }, { x: 14050, y: 75 },
    { x: 14850, y: 105 }, { x: 15650, y: 75 }, { x: 16450, y: 218 },
    { x: 16820, y: 205 }, { x: 16400, y: 300 }, { x: 15360, y: 300 },
    { x: 14200, y: 300 }, { x: 13040, y: 300 }, { x: 12300, y: 218 },
    { x: 17100, y: 218 }, { x: 17950, y: 218 }
  ], { coinLimit: 8 });
  recordRoute(stage.beats[4], "water", [
    { x: 12900, y: 218 }, { x: 13050, y: 330 }, { x: 13400, y: 420 },
    { x: 14200, y: 420 }, { x: 15000, y: 420 }, { x: 15800, y: 420 },
    { x: 16450, y: 330 }, { x: 16820, y: 218 }
  ], { coinLimit: 5 });
  recordRoute(stage.beats[4], "recovery", [
    { x: 10000, y: 620 }, { x: 11850, y: 620 }, { x: 11850, y: -50 },
    { x: 12600, y: 218 }, { x: 14000, y: 620 }, { x: 15400, y: 620 },
    { x: 16800, y: 218 }
  ], { recoverySeconds: 14, coinLimit: 4 });

  // Beat 6: one conductor pad drives two real transforms: gates up, floor panels down.
  const b6commandFloor = addGroundChain("B6ConductorFloor", 18000, 18820, 220, [0, 3, -3, 0]);
  const b6commandTarget = addObjective("B6ConductorBellPad", 18420, 220, "lower-stage-and-open-three-gates", 384);
  const loweringPanels = [
    ["B6LoweringFloor1", 18800], ["B6LoweringFloor2", 19580],
    ["B6LoweringFloor3", 20360], ["B6LoweringFloor4", 21140]
  ].map(([name, x]) => {
    const path = addSolidRect(name, "Terrain", x, 220, 800, 180, "Color(0.42, 0.18, 0.48, 1)", {
      "metadata/_llr_safe_lowering_floor": "true",
      "metadata/_llr_final_top_y": "480"
    });
    physicalChanges.push(name);
    return path;
  });
  const conductorGates = [19540, 20320, 21100].map((x, index) => {
    const name = `B6ConductorGate${index + 1}`;
    const path = addSolidRect(name, "Terrain", x, 0, 120, 220, "Color(0.18, 0.12, 0.3, 1)", {
      "metadata/_llr_conductor_gate": "true",
      "metadata/_llr_gate_order": String(index + 1)
    });
    physicalChanges.push(name);
    return path;
  });
  addDirector("B6LowerStageDirector", 0, 0, {
    objectives: [b6commandTarget],
    waitForObjectives: true,
    move: loweringPanels,
    moveOffset: { x: 0, y: 260 },
    moveSeconds: 1.6,
    announcement: "第六响：舞台安全下沉，环形下层路形成",
    checkpoint: true,
    width: 16,
    height: 16
  });
  addDirector("B6OpenThreeGatesDirector", 0, 0, {
    objectives: [b6commandTarget],
    waitForObjectives: true,
    move: conductorGates,
    moveOffset: { x: 0, y: -360 },
    moveSeconds: 1.0,
    announcement: "三扇远门同时开启",
    checkpoint: false,
    width: 16,
    height: 16
  });
  addWood("B6RingEntryStep", 18880, 350, 10);
  addWood("B6RingExitStepA", 21900, 390, 10);
  addWood("B6RingExitStepB", 22200, 300, 10);
  addRecoveryLift("B6RingRecoveryLift", 22020, 300, { phase: 0.5 });
  addContract("B6ConductorTransformContract", {
    target_width: 384,
    physical_gate_count: conductorGates.length,
    physical_lowering_panel_count: loweringPanels.length,
    panel_move_y: 260,
    gate_move_y: -360,
    safe_preview_before_control: true,
    permanent_entry_stair: true,
    permanent_exit_stair: true,
    lower_ring_connected_to_pit: true,
    void_required: false
  });
  recordRoute(stage.beats[5], "main", [
    { x: 18000, y: 218 }, { x: 18420, y: 205 }, { x: 18880, y: 350 },
    { x: 19200, y: 480 }, { x: 19800, y: 480 }, { x: 20400, y: 480 },
    { x: 21000, y: 480 }, { x: 21600, y: 480 }, { x: 21900, y: 390 },
    { x: 22200, y: 300 }, { x: 22380, y: 240 }
  ]);
  recordRoute(stage.beats[5], "recovery", [
    { x: 18100, y: 620 }, { x: 19200, y: 620 }, { x: 20400, y: 620 },
    { x: 21600, y: 620 }, { x: 22020, y: 620 }, { x: 22020, y: 300 },
    { x: 22380, y: 240 }
  ], { recoverySeconds: 12, coinLimit: 4 });

  // Beat 7.1: one wide Shuttle is isolated between broad static departure and arrival floors.
  const b7shuttleEntry = addTerrain("B7ShuttleDeparture", 22400, 240, 700, [0, 3, -3, 0]);
  addShuttle("B7FinaleWideShuttle", 23000, 240, { x: 760, y: 0 }, {
    travelSeconds: 3.2, pauseSeconds: 0.7, phase: 0.08, scaleX: 3.0, walkableWidth: 288
  });
  const b7shuttleLanding = addTerrain("B7ShuttleArrival", 23850, 240, 650, [0, -3, 3, 0]);
  addRecoveryLift("B7ShuttleRecoveryLift", 23900, 240, { phase: 0.4 });
  addDirector("B7ShuttleLandingNotice", 24100, 165, {
    announcement: "Shuttle 段落稳：下一段只使用弹簧",
    checkpoint: false,
    width: 300,
    height: 220
  });

  // Beat 7.2: one forgiving spring arc lands on a 384px static platform before anything else changes.
  grounded("B7FinaleSpring", "Items/Mechanisms", "spring", b7shuttleLanding, 0.8, -8, {
    launch_speed: "10.4",
    horizontal_boost: "2.0"
  });
  const b7springLanding = addWood("B7SpringStableLanding", 24850, -80, 12);
  addWood("B7SpringDescentLanding", 25200, 20, 10);
  const b7hoverStart = addTerrain("B7HoverStableStart", 25500, 160, 500, [0, -3, 3, 0]);
  addRecoveryLift("B7SpringRecoveryLift", 25580, 160, { phase: 0.2 });
  addDirector("B7TwoMovementCheckpoint", 25720, 90, {
    announcement: "两段合奏完成：落稳后取得短 Hover",
    checkpoint: true,
    width: 340,
    height: 240
  });

  // Beat 7.3: a real Hover pickup and one-shot nozzle select precede three broad, closely spaced clouds.
  airborne("B7FinaleHoverPickup", "Items/Pickups", "fluddHover", 25740, 108);
  addInstance("B7HoverSelectDirector", ".", "director", {
    position: vector(25800, 90),
    trigger_size: vector(280, 220),
    announcement: JSON.stringify("短 Hover：越过三块宽云后先落稳"),
    checkpoint: "false",
    one_shot: "true",
    forced_nozzle: "1",
    lock_nozzle: "false"
  });
  const hoverClouds = [
    addCloud("B7HoverCloud1", 26150, 100, 20),
    addCloud("B7HoverCloud2", 26600, 80, 20),
    addCloud("B7HoverCloud3", 27050, 110, 20)
  ];
  assertConservativePlatformChain("Stage10ShortHoverClouds", hoverClouds, {
    maxGap: 120,
    maxRise: 35,
    minLandingWidth: 320
  });
  const b7thwompStart = addTerrain("B7HoverStableArrival", 27250, 160, 500, [0, 3, -3, 0]);
  addRecoveryLift("B7HoverRecoveryLift", 27320, 160, { phase: 0.6 });
  addDirector("B7ThwompPreviewCheckpoint", 27420, 90, {
    announcement: "Hover 已落稳：最后是三次短冲压，阴影两侧都能等待",
    checkpoint: true,
    width: 340,
    height: 240
  });

  // Beat 7.4: the short Thwomp corridor has continuous ground and broad side waiting bays.
  const b7thwompFloor = addGroundChain("B7ShortThwompCorridor", 27600, 29600, 240, [0, 3, -3, 0]);
  [28000, 28600, 29200].forEach((x, index) => {
    airborne(`B7FinaleThwomp${index + 1}`, "Items/Enemies", "thwomp", x, -120, {
      attack_mode: "0",
      attack_delay: "0.8",
      ground_wait: "0.9",
      detection_range: vector(170, 330),
      scale: vector(1.45, 1.45),
      "metadata/_llr_short_corridor_order": String(index + 1)
    });
    addCloud(`B7ThwompSafeBay${index + 1}A`, x - 190, 115, 12);
    addCloud(`B7ThwompSafeBay${index + 1}B`, x + 190, 115, 12);
  });
  addRecoveryLift("B7FinaleRecoveryLift", 29420, 240, { phase: 0.35 });
  addContract("B7FourMovementContract", {
    ordered_movement_count: 4,
    movement_order: "wide-shuttle,spring,short-hover,short-thwomp",
    shuttle_width: 288,
    spring_landing_width: b7springLanding.walkableWidth,
    hover_cloud_width: hoverClouds[0].walkableWidth,
    thwomp_count: 3,
    static_landing_between_movements: true,
    checkpoint_after_two_movements: true,
    physical_recovery_lift_count: 4,
    maximum_recovery_seconds: 15,
    continuous_thwomp_floor: true,
    void_required: false
  });
  recordRoute(stage.beats[6], "main", [
    { x: 22400, y: 238 }, { x: 23000, y: 238 }, { x: 23760, y: 238 },
    { x: 24100, y: 238 }, { x: 24400, y: 238 }, { x: 24850, y: -80 },
    { x: 25200, y: 20 }, { x: 25700, y: 158 }, { x: 26150, y: 100 },
    { x: 26600, y: 80 }, { x: 27050, y: 110 }, { x: 27450, y: 158 },
    { x: 27800, y: 238 }, { x: 28200, y: 238 }, { x: 28600, y: 238 },
    { x: 29000, y: 238 }, { x: 29400, y: 238 }, { x: 29580, y: 238 }
  ]);
  recordRoute(stage.beats[6], "recovery", [
    { x: 22400, y: 620 }, { x: 23900, y: 620 }, { x: 23900, y: 240 },
    { x: 24800, y: 620 }, { x: 25580, y: 620 }, { x: 25580, y: 160 },
    { x: 26500, y: 620 }, { x: 27320, y: 620 }, { x: 27320, y: 160 },
    { x: 28400, y: 620 }, { x: 29420, y: 620 }, { x: 29420, y: 240 }
  ], { recoverySeconds: 15, coinLimit: 6 });

  // Beat 8: the tenth objective lifts nine physical bridge pieces; together they represent all ten bells.
  const b8finalPadFloor = addTerrain("B8FinalBellFloor", 29600, 240, 700, [0, -4, 4, 0]);
  const b8finalTarget = addObjective("B8TenthBellPad", 29950, 240, "build-victory-road", 384);
  const finalBridge = [];
  const finalBellVisuals = [];
  for (let index = 0; index < 9; index += 1) {
    const x = 30350 + index * 300;
    finalBridge.push(addDormantWood(`B8VictoryRoad${index + 1}`, x, 240, 10));
    finalBellVisuals.push(...addBellFacade(`B8VictoryBell${index + 1}`, x, 125, index + 1, {
      radius: 22,
      visible: false
    }));
  }
  assertConservativePlatformChain("Stage10FinalVictoryRoad", finalBridge, {
    maxGap: 0,
    maxRise: 0,
    minLandingWidth: 320
  });
  const b8finishFloor = addTerrain("B8VictoryFinishFloor", 32850, 240, 500, [0, -3, 3, 0]);
  const tenthBellVisuals = addBellFacade("B8VictoryBell10", 29950, 105, 10, {
    radius: 38,
    fontSize: 22,
    visible: false,
    color: "Color(1, 0.82, 0.22, 1)"
  });
  addDirector("B8BuildVictoryRoadDirector", 0, 0, {
    objectives: [b8finalTarget],
    waitForObjectives: true,
    move: finalBridge.map((platform) => platform.path),
    moveOffset: { x: 0, y: -DORMANT_OFFSET },
    moveSeconds: 1.2,
    reveal: [...finalBellVisuals, ...tenthBellVisuals],
    announcement: "第十响：万响礼堂胜利直路已经组成",
    checkpoint: true,
    width: 16,
    height: 16
  });
  addRecoveryLift("B8ReturnToFinalBellLift", 30120, 240, { phase: 0.5 });
  grounded("B8VictoryFlowers", "Items/Decoration", "flowers", b8finishFloor, 0.62, -10);
  addContract("B8VictoryRoadContract", {
    final_target_width: 384,
    physical_platform_count: finalBridge.length,
    platform_width: 320,
    open_gap_after_raise: 0,
    visible_bell_count_after_hit: 10,
    no_damage_after_final_hit: true,
    new_input_after_final_hit: false,
    recovery_returns_to_final_pad: true,
    static_finish_floor: true,
    void_required: false
  });
  recordRoute(stage.beats[7], "main", [
    { x: 29600, y: 238 }, { x: 29950, y: 225 }, { x: 30350, y: 238 },
    { x: 30650, y: 238 }, { x: 30950, y: 238 }, { x: 31250, y: 238 },
    { x: 31550, y: 238 }, { x: 31850, y: 238 }, { x: 32150, y: 238 },
    { x: 32450, y: 238 }, { x: 32750, y: 238 }, { x: 33050, y: 238 },
    { x: 33180, y: 238 }
  ]);
  recordRoute(stage.beats[7], "recovery", [
    { x: 29600, y: 620 }, { x: 30120, y: 620 }, { x: 30120, y: 240 },
    { x: 29950, y: 225 }
  ], { recoverySeconds: 10, coinLimit: 3 });

  if (objectives.length !== 7 || objectives.some((objective) => objective.width < WIDE_PAD || objective.acceptedHits !== 1)) {
    throw new Error("Stage 10 requires exactly seven wide objectives with reliable ground-pound input");
  }
  if (ordinaryStairs.length !== 4 || springStairs.length !== 5 || conductorGates.length !== 3 ||
      loweringPanels.length !== 4 || finalBridge.length !== 9 || physicalChanges.length < 34) {
    throw new Error("Stage 10 physical stage-change inventory is incomplete");
  }

  const scene = finalize({
    startSurface: b1start,
    introLines: [
      "[@n,老师快跑]10 老师城·万响礼堂 · V4",
      "所有铃垫都很宽，只认可靠砸地。每次敲响都会真实改变实体舞台；掉落由环形乐池送回。"
    ],
    finishPosition: { x: 33245, y: 240 },
    finishSize: { x: 92, y: 380 },
    finishBlueCoin: { x: 33080, y: 175 },
    extraFlowMetadata: {
      reliable_ground_pound_objectives: objectives.length,
      physical_stage_changes: physicalChanges.length,
      independent_side_wing_state: true,
      conductor_three_gate_open: true,
      conductor_safe_floor_lowering: true,
      ordered_finale_movements: 4,
      physical_orchestra_pit: true,
      final_no_damage_road: true,
      void_required: false
    }
  });

  for (const requiredNode of [
    "B2CentralWideBellPad", "B3OrdinaryRouteBellPad", "B3SpringRouteBellPad",
    "B5LeftSideBellPad", "B5RightSideBellPad", "B6ConductorBellPad", "B8TenthBellPad",
    "B2DistantBellGate", "B5BothWingsExitGate", "B6ConductorGate3", "B8VictoryRoad9"
  ]) {
    if (!scene.includes(`[node name="${requiredNode}"`)) {
      throw new Error(`Stage 10 generated scene is missing ${requiredNode}`);
    }
  }
  return scene;
}
